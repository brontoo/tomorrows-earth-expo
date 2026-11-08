import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadFrameImage,
  restrictFrame,
  validateFrameManifest,
} from "../client/src/components/book/frames/manifest";

const exported = JSON.parse(
  readFileSync(
    new URL("../media/seven-emirates/manifest.json", import.meta.url),
    "utf8"
  )
);
const fresh = () => structuredClone(exported);
afterEach(() => vi.unstubAllGlobals());

describe("Recovered Full HD sequence", () => {
  it("covers all 1,673 supplied frames with seven contiguous measured ranges", () => {
    const manifest = validateFrameManifest(fresh());
    expect(
      manifest.chapters.map(c => [c.startInclusive, c.endExclusive])
    ).toEqual([
      [0, 239],
      [239, 478],
      [478, 717],
      [717, 956],
      [956, 1195],
      [1195, 1434],
      [1434, 1673],
    ]);
    expect(new Set(manifest.frames.map(f => f.url)).size).toBe(1673);
    expect(exported.provenance.losslessReferenceAvailable).toBe(false);
    expect(exported.provenance.originalVideosAvailable).toBe(false);
  });
  it.each([
    "dimensions",
    "missing",
    "duplicate",
    "order",
    "gap",
    "rest",
    "keyframe",
    "path",
    "hash",
    "size",
    "timing",
    "duplicate-key",
    "missing-fallback",
  ])("rejects corrupt %s before selecting the new engine", problem => {
    const m = fresh();
    if (problem === "dimensions") m.frames[0].width = 1280;
    if (problem === "missing") m.frames.pop();
    if (problem === "duplicate") m.frames[1].index = 0;
    if (problem === "order") m.chapters.reverse();
    if (problem === "gap") m.chapters[1].startInclusive++;
    if (problem === "rest") m.chapters[0].restingFrame = 239;
    if (problem === "keyframe") m.chapters[0].keyframes = [-1];
    if (problem === "path") m.frames[0].url = "../outside.webp";
    if (problem === "hash") m.frames[0].sha256 = "invalid";
    if (problem === "size") m.frames[0].byteLength = 0;
    if (problem === "timing") m.frames[0].source.timestampSeconds = NaN;
    if (problem === "duplicate-key") m.frames[1].url = m.frames[0].url;
    if (problem === "missing-fallback")
      m.chapters[0].fallbackUrl = "frames/missing.webp";
    expect(() => validateFrameManifest(m)).toThrow();
  });
});

describe("Access-aware forward and reverse scrubbing", () => {
  const first = exported.chapters[0];
  const second = exported.chapters[1];
  const last = exported.chapters[6];
  it("crosses adjacent unlocked chapters in either direction", () => {
    expect(restrictFrame(239, 238, [first, second])).toBe(239);
    expect(restrictFrame(238, 239, [first, second])).toBe(238);
  });
  it("stops at locked gaps even if a later chapter is already earned", () => {
    expect(restrictFrame(1500, 238, [first, last])).toBe(238);
    expect(restrictFrame(0, 1500, [first, last])).toBe(1434);
  });
  it("rejects noninteger input and never opens unavailable ranges", () => {
    for (const value of [NaN, Infinity, 1.5, -1])
      expect(restrictFrame(value, 100, [first])).toBe(100);
    expect(restrictFrame(200, 100, [])).toBe(100);
    expect(restrictFrame(239, 0, [first])).toBe(238);
  });
});

describe("Frame integrity and cancellation", () => {
  const bytes = new TextEncoder().encode("encoded test image");
  function setup() {
    const raw = fresh();
    raw.frames[0] = {
      ...raw.frames[0],
      byteLength: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const manifest = validateFrameManifest(raw);
    const close = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(bytes))
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1920, height: 1080, close }))
    );
    return { manifest, close };
  }
  it("verifies content before decoding and displaying the native Full HD image", async () => {
    const { manifest } = setup();
    await expect(
      loadFrameImage(
        manifest,
        0,
        "http://localhost/media/",
        new AbortController().signal
      )
    ).resolves.toMatchObject({ width: 1920, height: 1080 });
    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost/media/" + manifest.frames[0].url),
      expect.objectContaining({ credentials: "omit" })
    );
  });
  it("rejects corrupted bytes before image decoding", async () => {
    const { manifest } = setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array(bytes.length)))
    );
    await expect(
      loadFrameImage(
        manifest,
        0,
        "http://localhost/",
        new AbortController().signal
      )
    ).rejects.toThrow("checksum");
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it("releases non-Full-HD and cancelled decoded images", async () => {
    const { manifest, close } = setup();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1280, height: 720, close }))
    );
    await expect(
      loadFrameImage(
        manifest,
        0,
        "http://localhost/",
        new AbortController().signal
      )
    ).rejects.toThrow("Full HD");
    expect(close).toHaveBeenCalledOnce();
    const abort = new AbortController();
    abort.abort();
    await expect(
      loadFrameImage(manifest, 0, "http://localhost/", abort.signal)
    ).rejects.toThrow("cancelled");
    expect(close).toHaveBeenCalledTimes(2);
  });
});
