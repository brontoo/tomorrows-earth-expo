import type { FrameManifest, FrameRange } from "./contracts";

const ids = [
  "abu-dhabi",
  "dubai",
  "sharjah",
  "ajman",
  "umm-al-quwain",
  "ras-al-khaimah",
  "fujairah",
];
const integer = (v: unknown): v is number =>
  Number.isSafeInteger(v) && Number(v) >= 0;
const key = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[\w./-]+$/.test(v) &&
  !v.startsWith("/") &&
  !v.split("/").includes("..");

/** Validate external JSON before treating it as the Phase 1 media contract. */
export function validateFrameManifest(value: unknown): FrameManifest {
  const m = value as FrameManifest | null;
  if (
    !m ||
    m.schemaVersion !== 1 ||
    typeof m.mediaVersion !== "string" ||
    !m.mediaVersion ||
    m.width !== 1920 ||
    m.height !== 1080 ||
    m.frameCount !== 1673 ||
    !Array.isArray(m.frames) ||
    m.frames.length !== m.frameCount ||
    !Array.isArray(m.chapters) ||
    m.chapters.length !== 7
  )
    throw new Error("Invalid Full HD frame manifest");
  m.frames.forEach((f, index) => {
    if (
      !f ||
      f.index !== index ||
      f.width !== 1920 ||
      f.height !== 1080 ||
      !key(f.url) ||
      !integer(f.byteLength) ||
      f.byteLength === 0 ||
      !/^[a-f0-9]{64}$/.test(f.sha256) ||
      !f.source ||
      typeof f.source.videoId !== "string" ||
      !integer(f.source.frameIndex) ||
      !Number.isFinite(f.source.timestampSeconds) ||
      f.source.timestampSeconds < 0
    )
      throw new Error(`Invalid frame record ${index}`);
  });
  if (new Set(m.frames.map(f => f.url)).size !== m.frameCount)
    throw new Error("Duplicate frame asset keys");
  let end = 0;
  m.chapters.forEach((c, index) => {
    if (
      !c ||
      c.chapterId !== ids[index] ||
      c.startInclusive !== end ||
      !integer(c.endExclusive) ||
      c.endExclusive <= end ||
      c.endExclusive > m.frameCount ||
      !integer(c.restingFrame) ||
      c.restingFrame < end ||
      c.restingFrame >= c.endExclusive ||
      !Array.isArray(c.keyframes) ||
      c.keyframes.some(f => !integer(f) || f < end || f >= c.endExclusive) ||
      !key(c.fallbackUrl) ||
      !m.frames
        .slice(c.startInclusive, c.endExclusive)
        .some(f => f.url === c.fallbackUrl)
    )
      throw new Error(`Invalid chapter range ${index}`);
    end = c.endExclusive;
  });
  if (end !== m.frameCount)
    throw new Error("Chapter ranges do not cover the sequence");
  return m;
}

/** Merge adjacent permitted ranges; scrubbing cannot leap across a locked gap. */
export function scrubRange(
  current: number,
  ranges: readonly FrameRange[]
): FrameRange | undefined {
  const merged: FrameRange[] = [];
  for (const range of [...ranges].sort(
    (a, b) => a.startInclusive - b.startInclusive
  )) {
    const previous = merged[merged.length - 1];
    if (previous && range.startInclusive <= previous.endExclusive)
      merged[merged.length - 1] = {
        startInclusive: previous.startInclusive,
        endExclusive: Math.max(previous.endExclusive, range.endExclusive),
      };
    else merged.push(range);
  }
  return merged.find(
    r => current >= r.startInclusive && current < r.endExclusive
  );
}

export function restrictFrame(
  requested: number,
  current: number,
  ranges: readonly FrameRange[]
): number {
  if (!integer(requested)) return current;
  const active = scrubRange(current, ranges);
  return active
    ? Math.max(
        active.startInclusive,
        Math.min(active.endExclusive - 1, requested)
      )
    : current;
}

export async function loadFrameImage(
  manifest: FrameManifest,
  frame: number,
  baseUrl: string,
  signal: AbortSignal
): Promise<ImageBitmap> {
  return decodeFrameBytes(
    await loadFrameBytes(manifest, frame, baseUrl, signal),
    signal
  );
}

export async function loadFrameBytes(
  manifest: FrameManifest,
  frame: number,
  baseUrl: string,
  signal: AbortSignal,
  priority: "high" | "low" = "high"
): Promise<ArrayBuffer> {
  const record = manifest.frames[frame];
  if (!record) throw new Error("Unknown frame index");
  const response = await fetch(new URL(record.url, baseUrl), {
    signal,
    credentials: "omit",
    priority,
  });
  if (!response.ok)
    throw new Error(`Frame request failed (${response.status})`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== record.byteLength)
    throw new Error("Frame byte size mismatch");
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    b => b.toString(16).padStart(2, "0")
  ).join("");
  if (digest !== record.sha256) throw new Error("Frame checksum mismatch");
  if (signal.aborted) throw new Error("Frame request cancelled");
  return bytes;
}

export async function decodeFrameBytes(
  bytes: ArrayBuffer,
  signal: AbortSignal
): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(new Blob([bytes]));
  if (bitmap.width !== 1920 || bitmap.height !== 1080 || signal.aborted) {
    bitmap.close();
    throw new Error(
      signal.aborted ? "Frame request cancelled" : "Frame is not Full HD"
    );
  }
  return bitmap;
}
