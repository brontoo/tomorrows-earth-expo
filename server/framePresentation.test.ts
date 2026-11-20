import { describe, expect, it } from "vitest";
import {
  framePresentation,
  LIBRARY_SOURCE_SHA,
  validateLibraryManifest,
} from "../client/src/components/book/frames/presentation";
import type { FrameManifest } from "../client/src/components/book/frames/contracts";

const version = "library-0000000000000000";
function fixture() {
  return {
    schemaVersion: 1,
    kind: "school-library-introduction",
    mediaVersion: version,
    width: 1920,
    height: 1080,
    frameCount: 6,
    fps: 30,
    source: { sha256: LIBRARY_SOURCE_SHA },
    frames: Array.from({ length: 6 }, (_, index) => ({
      index,
      url: `frames/f_${String(index).padStart(4, "0")}.webp`,
      width: 1920,
      height: 1080,
      sha256: "a".repeat(64),
      byteLength: 80,
      source: {
        videoId: "school-library",
        frameIndex: index,
        timestampSeconds: index / 30,
      },
    })),
    zones: ["entrance", "panorama", "discovery"].map((scene, i) => ({
      scene,
      startInclusive: i * 2,
      endExclusive: i * 2 + 2,
    })),
  };
}

describe("Library and original book presentation", () => {
  it("preserves original book indices and classifies both sides of the seam", () => {
    const book = { frameCount: 1673 } as FrameManifest;
    const library = {
      manifest: validateLibraryManifest(fixture(), version),
      baseUrl: "https://example.com/intro/",
    };
    const timeline = framePresentation(
      book,
      "https://example.com/book/",
      library
    );
    expect(timeline.frameCount).toBe(1679);
    expect(timeline.toGlobalBookFrame(0)).toBe(6);
    expect(timeline.toGlobalBookFrame(1672)).toBe(1678);
    expect(timeline.sceneAt(0)).toBe("entrance");
    expect(timeline.sceneAt(2)).toBe("panorama");
    expect(timeline.sceneAt(5)).toBe("discovery");
    expect(timeline.sceneAt(6)).toBe("book");
    expect(timeline.dualRangeAt(1)?.endExclusive).toBe(2);
    expect(timeline.dualRangeAt(2)).toBeUndefined();
    expect(timeline.dualRangeAt(5)?.endExclusive).toBe(6);
    expect(timeline.dualRangeAt(6)).toBeUndefined();
    expect(book.frameCount).toBe(1673);
  });

  it("rejects source mismatch, timestamp reorder and noncontiguous zones", () => {
    const source = fixture();
    source.source.sha256 = "b".repeat(64);
    expect(() => validateLibraryManifest(source, version)).toThrow(/manifest/);
    const reordered = fixture();
    reordered.frames[2].source.timestampSeconds =
      reordered.frames[1].source.timestampSeconds;
    expect(() => validateLibraryManifest(reordered, version)).toThrow(
      /frame 2/
    );
    const gap = fixture();
    gap.zones[1].startInclusive = 3;
    expect(() => validateLibraryManifest(gap, version)).toThrow(/zone 1/);
  });
});
