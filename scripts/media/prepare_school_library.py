#!/usr/bin/env python3
"""Inspect and package the approved school library source. Requires FFmpeg, Pillow and NumPy."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import statistics
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageChops, ImageStat

from prepare_seven_emirates import sheet

SOURCE_SHA = "14aaa5de2d4f018793f847722e7f19d2fa80ffc2348a042e0ba552cae42e17f5"
COVER_SHA = "7ecd4d5184e62142c5a8d0f6600258514332d45144d30b2c6f947c0f4401fda5"
WIDTH, HEIGHT, COUNT = 1920, 1080, 1376
SCENES = ("entrance", "panorama", "discovery")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def json_bytes(value):
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()


def ffmpeg(*args, capture=False):
    return subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostdin", "-filter_threads", "1", *map(str, args)],
        check=True, capture_output=capture, text=capture,
    )


def probe(source, expected_sha):
    actual_sha = sha(source)
    if actual_sha != expected_sha:
        raise ValueError(f"Source SHA-256 is {actual_sha}. Expected {expected_sha}.")
    def read(*args):
        return json.loads(subprocess.check_output(
            ["ffprobe", "-v", "error", *args, "-of", "json", str(source)]
        ))
    metadata = read("-show_streams", "-show_format")
    video = next(s for s in metadata["streams"] if s["codec_type"] == "video")
    if (
        (video["width"], video["height"], video["codec_name"],
         video["avg_frame_rate"], int(video["nb_frames"])) !=
        (WIDTH, HEIGHT, "h264", "30/1", COUNT)
        or metadata["format"]["duration"] != "45.888000"
        or not any(s["codec_name"] == "aac" for s in metadata["streams"])
        or video.get("sample_aspect_ratio", "1:1") != "1:1"
    ):
        raise ValueError("Unexpected source format, geometry, duration or codec")
    frames = read("-select_streams", "v:0", "-show_frames", "-show_entries",
                  "frame=best_effort_timestamp_time")["frames"]
    pts = [float(frame["best_effort_timestamp_time"]) for frame in frames]
    if len(pts) != COUNT or any(abs(t - i / 30) > 0.000002 for i, t in enumerate(pts)):
        raise ValueError("Source frame timestamps differ from the verified 30 FPS timeline")
    return {
        "sha256": actual_sha, "fileName": source.name, "byteLength": source.stat().st_size,
        "frameCount": COUNT, "frameRate": 30, "durationSeconds": 45.888,
        "videoDurationSeconds": float(video["duration"]), "videoCodec": "h264", "audioCodec": "aac",
    }, pts


def select_filter(indices):
    return "select=" + "+".join(f"eq(n\\,{index})" for index in indices)


def decode_previews(source, indices, folder):
    ffmpeg("-loglevel", "error", "-i", source, "-map", "0:v:0", "-vf",
           select_filter(indices), "-fps_mode", "vfr", "-start_number", "0",
           "-threads", "1", folder / "%04d.png")
    return {index: folder / f"{sequence:04d}.png" for sequence, index in enumerate(indices)}


def comparison(first, second):
    a, b = np.asarray(first.convert("L"), dtype=np.float64), np.asarray(second.convert("L"), dtype=np.float64)
    # Equal-weight, nonoverlapping 8×8 luminance windows over the complete Full HD image.
    a, b = (x.reshape(HEIGHT // 8, 8, WIDTH // 8, 8) for x in (a, b))
    axes = (1, 3)
    mu_a, mu_b = a.mean(axis=axes, keepdims=True), b.mean(axis=axes, keepdims=True)
    da, db = a - mu_a, b - mu_b
    va, vb, cov = ((x * y).mean(axis=axes, keepdims=True) for x, y in ((da, da), (db, db), (da, db)))
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    ssim = (((2 * mu_a * mu_b + c1) * (2 * cov + c2)) /
            ((mu_a ** 2 + mu_b ** 2 + c1) * (va + vb + c2))).mean()
    diff = ImageChops.difference(first.convert("RGB"), second.convert("RGB"))
    mae = statistics.mean(ImageStat.Stat(diff).mean)
    return {"luminanceBlockSsim": float(ssim), "rgbMeanAbsoluteError": mae,
            "normalizedRgbMeanAbsoluteError": mae / 255}


def inspect(source, cover, output, pts, provenance, extra):
    with tempfile.TemporaryDirectory(dir=output) as scratch:
        root = Path(scratch)
        contact = sorted(set(range(0, COUNT, 30)) | {COUNT - 1} | set(extra))
        seam = list(range(COUNT - 32, COUNT))
        previews = decode_previews(source, sorted(set(contact + seam)), root)
        samples = [(previews[i], f"{i}   {pts[i]:.3f}s") for i in contact]
        columns = 5
        while len(samples) % columns:
            samples.append((previews[COUNT - 1], ""))
        sheet([samples[i:i + columns] for i in range(0, len(samples), columns)],
              output / "library-contact.jpg")
        with Image.open(cover) as book:
            result = []
            for index in seam:
                with Image.open(previews[index]) as image:
                    result.append({"sourceFrame": index, "timestampSeconds": pts[index],
                                   **comparison(image, book)})
            candidates = sorted(result, key=lambda row: (-row["luminanceBlockSsim"], row["rgbMeanAbsoluteError"]))
            best = candidates[0]["sourceFrame"]
            sheet([[(previews[best], f"Best by SSIM: {best}"), (previews[COUNT - 1], "Source final frame"),
                    (cover, "Original book frame 0")]], output / "library-seam.jpg")
    (output / "source-inspection.json").write_bytes(json_bytes({
        "source": provenance, "sourceFrameTimestampsSeconds": pts,
        "coverSha256": COVER_SHA, "bestSeamCandidate": candidates[0], "tailMeasurements": result,
    }))


def encode(source, output, provenance, pts, cover, fps, boundaries, seam_end, quality, duplicate_phase, blend_start):
    # A stable 24/30 cadence using real source frames, with exact source provenance.
    allowed = set(range(seam_end + 1)) if fps == 30 else {
        i for i in range(seam_end + 1) if i % 5 != duplicate_phase
    }
    allowed.update([0, *boundaries, seam_end])
    indices = sorted(allowed)
    if len(boundaries) != 2 or not 0 < boundaries[0] < boundaries[1] < seam_end < COUNT:
        raise ValueError("Supply two reviewed boundaries and a verified seam frame in increasing order")
    frames_dir = output / "frames"
    frames_dir.mkdir(exist_ok=False)
    selection = f"lte(n\\,{seam_end})"
    if fps == 24:
        selection += "*" + f"(not(eq(mod(n\\,5)\\,{duplicate_phase}))+eq(n\\,{seam_end})+eq(n\\,{boundaries[0]})+eq(n\\,{boundaries[1]}))"
        # Skip the visually measured repeat phase of the 30 FPS source.
    result = ffmpeg("-loglevel", "info", "-i", source, "-map", "0:v:0", "-vf",
                    f"select={selection},blackframe=amount=98:threshold=16",
                    "-fps_mode", "vfr", "-an", "-c:v", "libwebp", "-quality", quality,
                    "-compression_level", "4", "-threads", "1", "-start_number", "0",
                    frames_dir / "f_%04d.webp", capture=True)
    black_frames = [line for line in result.stderr.splitlines() if "pblack:" in line]
    if black_frames:
        raise ValueError("Potential black frames in output: " + "\n".join(black_frames[:10]))
    paths = sorted(frames_dir.glob("*.webp"))
    if len(paths) != len(indices):
        raise ValueError(f"Expected {len(indices)} frames, encoded {len(paths)}")
    transition = []
    with Image.open(cover) as book:
        book = book.convert("RGB")
        if blend_start is not None:
            first = indices.index(blend_start) if blend_start in indices else next(
                i for i, index in enumerate(indices) if index > blend_start)
            tail = indices[first:]
            with tempfile.TemporaryDirectory(dir=output) as scratch:
                previews = decode_previews(source, tail, Path(scratch))
                for offset, source_index in enumerate(tail):
                    progress = (source_index - blend_start) / (seam_end - blend_start)
                    weight = 0.88 * progress * progress * (3 - 2 * progress)
                    if not weight:
                        continue
                    with Image.open(previews[source_index]) as raw_image:
                        corrected = Image.blend(raw_image.convert("RGB"), book, weight)
                        corrected.save(paths[first + offset], format="WEBP", quality=quality, method=4)
                    transition.append({"sourceFrame": source_index, "coverResidualWeight": weight})
    records = []
    with Image.open(cover) as book:
        for i, (path, src_index) in enumerate(zip(paths, indices)):
            with Image.open(path) as image:
                if image.size != (WIDTH, HEIGHT) or image.format != "WEBP":
                    raise ValueError(f"Invalid Full HD WebP: {path}")
                image.load()
                if src_index == seam_end:
                    seam_metrics = comparison(image, book)
            records.append({"index": i, "url": f"frames/{path.name}", "width": WIDTH,
                            "height": HEIGHT, "sha256": sha(path), "byteLength": path.stat().st_size,
                            "source": {"videoId": "school-library", "frameIndex": src_index,
                                       "timestampSeconds": pts[src_index]}})
    starts = [0, *(indices.index(index) for index in boundaries), len(records)]
    manifest = {
        "schemaVersion": 1, "kind": "school-library-introduction",
        "width": WIDTH, "height": HEIGHT, "frameCount": len(records), "fps": fps,
        "source": provenance,
        "zones": [{"scene": scene, "startInclusive": starts[i], "endExclusive": starts[i + 1]}
                  for i, scene in enumerate(SCENES)],
        "frames": records,
    }
    version = "library-" + hashlib.sha256(json_bytes(manifest)).hexdigest()[:16]
    manifest["mediaVersion"] = version
    raw = json_bytes(manifest)
    (output / "manifest.json").write_bytes(raw)
    sizes = [record["byteLength"] for record in records]
    deltas = [(b - a) / 30 for a, b in zip(indices, indices[1:])]
    (output / "library-media-qa.json").write_bytes(json_bytes({
        "mediaVersion": version, "manifestSha256": hashlib.sha256(raw).hexdigest(),
        "frameCount": len(records), "fps": fps, "frameByteSizes": {
            "total": sum(sizes), "minimum": min(sizes), "median": statistics.median(sizes), "maximum": max(sizes),
        },
        "largestSourceSampleGapSeconds": max(deltas), "nonNominalSourceGaps": sum(
            abs(delta - 1 / fps) > 0.000001 for delta in deltas),
        "exactDuplicateFileCount": len(records) - len({r["sha256"] for r in records}),
        "blackFrameCount": 0, "sourceBoundaryFrames": boundaries,
        "coverSha256": COVER_SHA, "seamSourceFrame": seam_end, "encodedSeam": seam_metrics,
        "source30To24DroppedPhase": duplicate_phase if fps == 24 else None,
        "terminalResidualCorrection": transition,
        "ffmpegVersion": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
    }))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["inspect", "encode"])
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--cover", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--expected-source-sha", default=SOURCE_SHA)
    parser.add_argument("--extra", type=int, nargs="*", default=[])
    parser.add_argument("--fps", type=int, choices=[24, 30], default=30)
    parser.add_argument("--boundaries", type=int, nargs=2)
    parser.add_argument("--seam-end", type=int)
    parser.add_argument("--duplicate-phase", type=int, choices=range(5), default=1)
    parser.add_argument("--seam-blend-start", type=int)
    parser.add_argument("--quality", type=int, choices=range(80, 101), default=90)
    args = parser.parse_args()
    source, cover, output = (p.resolve() for p in (args.source, args.cover, args.output))
    if output.is_relative_to(Path(__file__).resolve().parents[2]):
        parser.error("Use an output directory outside the Git checkout")
    if not re.fullmatch("[0-9a-f]{64}", args.expected_source_sha) or sha(cover) != COVER_SHA:
        parser.error("Expected a valid source checksum and the original book cover")
    provenance, pts = probe(source, args.expected_source_sha)
    if not all(0 <= index < COUNT for index in args.extra):
        parser.error("Extra indices must be valid source frame numbers")
    if args.mode == "encode" and (args.boundaries is None or args.seam_end is None):
        parser.error("Encoding requires inspected --boundaries and --seam-end")
    if args.seam_blend_start is not None and not (args.boundaries and args.boundaries[1] < args.seam_blend_start < args.seam_end):
        parser.error("Seam blend must be inside the reviewed discovery tail")
    output.mkdir(parents=True, exist_ok=True)
    if args.mode == "inspect":
        inspect(source, cover, output, pts, provenance, args.extra)
    else:
        encode(source, output, provenance, pts, cover, args.fps,
               args.boundaries, args.seam_end, args.quality, args.duplicate_phase, args.seam_blend_start)


if __name__ == "__main__":
    main()
