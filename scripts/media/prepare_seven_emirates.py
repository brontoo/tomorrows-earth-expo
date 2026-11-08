#!/usr/bin/env python3
"""Validate an existing Full HD frame export; never claim it is a lossless video extraction.

Requires Pillow. The output must be outside the application checkout.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageChops, ImageDraw, ImageStat

CHAPTERS = [
    ("01-AD", "abu-dhabi", "Abu Dhabi"),
    ("02-DXB", "dubai", "Dubai"),
    ("03-SHJ", "sharjah", "Sharjah"),
    ("04-AJ", "ajman", "Ajman"),
    ("05-UMQ", "umm-al-quwain", "Umm Al Quwain"),
    ("06-RAK", "ras-al-khaimah", "Ras Al Khaimah"),
    ("07-FUJ", "fujairah", "Fujairah"),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def sheet(rows, path):
    """Downscaled QA previews only; delivered frame files are copied byte-for-byte."""
    width, height, caption = 480, 270, 28
    result = Image.new("RGB", (len(rows[0]) * width, len(rows) * (height + caption)), "#eeeeee")
    draw = ImageDraw.Draw(result)
    for y, row in enumerate(rows):
        for x, (source, label) in enumerate(row):
            with Image.open(source) as image:
                preview = image.convert("RGB")
                preview.thumbnail((width, height))
                result.paste(preview, (x * width, y * (height + caption)))
            draw.text((x * width + 8, y * (height + caption) + height + 6), label, fill="black")
    result.save(path, quality=88)


def prepare(source, output):
    source, output = source.resolve(), output.resolve()
    repo = Path(__file__).resolve().parents[2]
    if output.is_relative_to(repo) or output.is_relative_to(source):
        raise ValueError("Keep generated frame media outside both source checkouts")
    revision = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    if subprocess.check_output(["git", "-C", str(source), "status", "--porcelain"], text=True).strip():
        raise ValueError("Source checkout must be clean for reproducible provenance")
    upstream = json.loads((source / "QA_REPORT.json").read_text())
    fps = upstream["fps"]
    if not isinstance(fps, (int, float)) or fps <= 0:
        raise ValueError("Missing positive upstream-reported frame rate")
    marker = output / ".seven-emirates-export"
    if output.exists() and any(output.iterdir()) and not marker.exists():
        raise ValueError("Refusing to overwrite an unrelated output directory")
    output.mkdir(parents=True, exist_ok=True)
    marker.touch()
    records, ranges, sources, file_groups, pixel_groups = [], [], [], {}, {}
    chapter_rows, edge_rows, boundary_results = [], [], []
    previous_last = None
    for folder, chapter_id, name in CHAPTERS:
        directory = source / "frames" / folder
        files = sorted(directory.glob("f_*.webp"))
        if not files or [p.name for p in files] != [f"f_{i:04d}.webp" for i in range(len(files))]:
            raise ValueError(f"Missing or unexpected frame filenames in {folder}")
        start = len(records)
        encodings = set()
        for local, path in enumerate(files):
            raw = path.read_bytes()
            encodings.add(raw[12:16].decode("ascii"))
            digest = sha(raw)
            with Image.open(path) as image:
                if image.format != "WEBP" or image.size != (1920, 1080) or getattr(image, "n_frames", 1) != 1:
                    raise ValueError(f"Invalid Full HD still: {path}")
                image.load()  # Full decode, not just a header check.
                pixel_digest = sha(image.convert("RGB").tobytes())
            index = len(records)
            file_groups.setdefault(digest, []).append(index)
            pixel_groups.setdefault(pixel_digest, []).append(index)
            key = f"frames/{folder}/{path.name}"
            destination = output / key
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                if sha(destination.read_bytes()) != digest:
                    raise ValueError(f"Existing output differs: {destination}")
            else:
                shutil.copyfile(path, destination)
            if sha(destination.read_bytes()) != digest:
                raise ValueError(f"Copy verification failed: {destination}")
            records.append({
                "index": index, "url": key, "width": 1920, "height": 1080,
                "byteLength": len(raw), "sha256": digest,
                "source": {"videoId": folder + ".mp4", "frameIndex": local,
                           "timestampSeconds": local / fps},
            })
        end = len(records)
        ranges.append({
            "chapterId": chapter_id, "name": name,
            "startInclusive": start, "endExclusive": end,
            "firstFrame": start, "lastFrame": end - 1,
            "restingFrame": end - 1, "keyframes": [start, end - 1],
            "fallbackUrl": records[-1]["url"],
        })
        sources.append({
            "videoId": folder + ".mp4", "originalVideoAvailable": False,
            "observedFrameCount": len(files), "width": 1920, "height": 1080,
            "frameRate": {"numerator": fps, "denominator": 1, "basis": "upstream-report-not-video-probed"},
            "derivedDurationSeconds": len(files) / fps,
            "originalEncoding": None, "originalDurationSeconds": None,
            "originalFrameTimestampsAvailable": False,
            "observedWebPChunks": sorted(encodings),
        })
        chapter_rows.append([(files[0], f"{name}: first / {start}"),
                             (files[len(files)//2], f"{name}: middle / {start + len(files)//2}"),
                             (files[-1], f"{name}: rest / {end - 1}")])
        if previous_last:
            prior_file, prior_name, prior_index = previous_last
            with Image.open(prior_file) as a, Image.open(files[0]) as b:
                difference = ImageChops.difference(a.convert("RGB"), b.convert("RGB"))
                mae = sum(ImageStat.Stat(difference).mean) / 3
            boundary_results.append({"from": prior_name, "to": name,
                                     "lastFrame": prior_index, "firstFrame": start,
                                     "meanAbsoluteRgbDifference": mae,
                                     "normalizedDifference": mae / 255,
                                     "pixelIdentical": mae == 0})
            edge_rows.append([(prior_file, f"{prior_name}: last / {prior_index}"),
                              (files[0], f"{name}: first / {start}")])
        previous_last = (files[-1], name, end - 1)
        print(f"Validated {name}: {len(files)} frames, [{start}, {end})", flush=True)
    if len(records) != 1673:
        raise ValueError(f"Observed {len(records)} frames; reconcile with the Phase 1 contract before use")
    provenance = {
        "repository": "https://github.com/brontoo/7E-Book", "commit": revision,
        "kind": "supplied-lossy-webp-export", "originalVideosAvailable": False,
        "losslessReferenceAvailable": False,
        "timingBasis": "Upstream reports 24 fps; original video PTS/durations/codecs cannot be verified",
        "restingFrameBasis": "Last supplied frame of each clip, matching standalone chapter stops",
        "sources": sources,
    }
    manifest = {"schemaVersion": 1, "mediaVersion": "7e-" + revision[:12],
                "width": 1920, "height": 1080, "frameCount": len(records),
                "provenance": provenance, "frames": records, "chapters": ranges}
    qa = {"frameCount": len(records), "totalBytes": sum(r["byteLength"] for r in records),
          "allFramesDecodedAtFullHD": True, "allCopiesHashVerified": True,
          "missingFrameReferences": [], "insertedOrRemovedByPreparation": 0,
          "originalVideoExtractionIntegrity": "unverifiable-without-original-videos",
          "duplicateFileGroups": [v for v in file_groups.values() if len(v) > 1],
          "duplicateDecodedPixelGroups": [v for v in pixel_groups.values() if len(v) > 1],
          "boundaries": boundary_results, "provenance": provenance}
    write_json(output / "manifest.json", manifest)
    write_json(output / "qa.json", qa)
    sheet(chapter_rows, output / "chapters-contact.jpg")
    sheet(edge_rows, output / "boundaries-contact.jpg")
    print(f"Prepared {len(records)} frames; manifest, QA and contact sheets: {output}", flush=True)
    return manifest, qa


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-project", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.source_project, args.output)
