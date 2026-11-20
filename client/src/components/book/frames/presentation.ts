import type { FrameManifest, FrameRange, FrameRecord } from "./contracts";
import { loadFrameBytes } from "./manifest";

export const LIBRARY_SOURCE_SHA =
  "14aaa5de2d4f018793f847722e7f19d2fa80ffc2348a042e0ba552cae42e17f5";
export const LIBRARY_ZONES = ["entrance", "panorama", "discovery"] as const;
export type PresentationScene = (typeof LIBRARY_ZONES)[number] | "book";

export interface LibraryManifest {
  readonly schemaVersion: 1;
  readonly kind: "school-library-introduction";
  readonly mediaVersion: string;
  readonly width: 1920;
  readonly height: 1080;
  readonly frameCount: number;
  readonly fps: 24 | 30;
  readonly source: { readonly sha256: string };
  readonly frames: readonly FrameRecord[];
  readonly zones: readonly (FrameRange & {
    readonly scene: PresentationScene;
  })[];
}

export function validateLibraryManifest(
  value: unknown,
  version: string
): LibraryManifest {
  const m = value as LibraryManifest | null;
  if (
    !m ||
    m.schemaVersion !== 1 ||
    m.kind !== "school-library-introduction" ||
    m.mediaVersion !== version ||
    !/^library-[a-f0-9]{16}$/.test(version) ||
    m.source?.sha256 !== LIBRARY_SOURCE_SHA ||
    m.width !== 1920 ||
    m.height !== 1080 ||
    (m.fps !== 24 && m.fps !== 30) ||
    !Array.isArray(m.frames) ||
    m.frameCount !== m.frames.length ||
    m.frameCount < 3 ||
    m.frameCount > 1376 ||
    !Array.isArray(m.zones) ||
    m.zones.length !== LIBRARY_ZONES.length
  )
    throw new Error("Invalid school library manifest");
  let timestamp = -1;
  let sourceFrame = -1;
  m.frames.forEach((f, index) => {
    if (
      !f ||
      f.index !== index ||
      f.width !== 1920 ||
      f.height !== 1080 ||
      f.url !== `frames/f_${String(index).padStart(4, "0")}.webp` ||
      !Number.isSafeInteger(f.byteLength) ||
      f.byteLength <= 0 ||
      !/^[a-f0-9]{64}$/.test(f.sha256) ||
      f.source?.videoId !== "school-library" ||
      !Number.isInteger(f.source.frameIndex) ||
      f.source.frameIndex <= sourceFrame ||
      f.source.frameIndex >= 1376 ||
      !Number.isFinite(f.source.timestampSeconds) ||
      f.source.timestampSeconds < 0 ||
      f.source.timestampSeconds <= timestamp ||
      f.source.timestampSeconds >= 45.888
    )
      throw new Error(`Invalid school library frame ${index}`);
    timestamp = f.source.timestampSeconds;
    sourceFrame = f.source.frameIndex;
  });
  let end = 0;
  m.zones.forEach((zone, index) => {
    if (
      zone?.scene !== LIBRARY_ZONES[index] ||
      zone.startInclusive !== end ||
      !Number.isInteger(zone.endExclusive) ||
      zone.endExclusive <= end ||
      zone.endExclusive > m.frameCount
    )
      throw new Error(`Invalid school library zone ${index}`);
    end = zone.endExclusive;
  });
  if (end !== m.frameCount)
    throw new Error("School library zones must cover every frame");
  return m;
}

export type LibraryMedia = { manifest: LibraryManifest; baseUrl: string };

export function framePresentation(
  book: FrameManifest,
  bookBaseUrl: string,
  intro?: LibraryMedia
) {
  const bookStart = intro?.manifest.frameCount ?? 0;
  const frameCount = bookStart + book.frameCount;
  const toGlobalBookFrame = (bookFrame: number) => bookStart + bookFrame;
  const sceneAt = (frame: number): PresentationScene =>
    intro?.manifest.zones.find(
      zone => frame >= zone.startInclusive && frame < zone.endExclusive
    )?.scene ?? "book";
  const dualRangeAt = (frame: number) =>
    intro?.manifest.zones.find(
      zone =>
        zone.scene !== "panorama" &&
        frame >= zone.startInclusive &&
        frame < zone.endExclusive
    );
  const load = (frame: number, signal: AbortSignal, foreground: boolean) => {
    const priority = foreground ? "high" : "low";
    return intro && frame < bookStart
      ? loadFrameBytes(intro.manifest, frame, intro.baseUrl, signal, priority)
      : loadFrameBytes(
          book,
          frame - bookStart,
          bookBaseUrl,
          signal,
          priority,
          frame
        );
  };
  return {
    bookStart,
    frameCount,
    toGlobalBookFrame,
    sceneAt,
    dualRangeAt,
    introFps: intro?.manifest.fps,
    load,
  };
}
