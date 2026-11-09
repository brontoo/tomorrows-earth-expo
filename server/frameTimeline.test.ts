import { BookGestureController } from "../client/src/components/book/gestures/BookGestureController";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { FrameManifest } from "../client/src/components/book/frames/contracts";
import {
  adaptivePolicy,
  FRAME_BYTES,
  FrameScheduler,
  mobilePolicy,
} from "../client/src/components/book/frames/FrameScheduler";
import { FrameTimeline } from "../client/src/components/book/frames/FrameTimeline";
const manifest = JSON.parse(
  readFileSync("media/seven-emirates/manifest.json", "utf8")
) as FrameManifest;
const image = () =>
  ({ width: 1920, height: 1080, close: vi.fn() }) as unknown as ImageBitmap;
const ranges = [{ startInclusive: 0, endExclusive: 1673 }];
function harness() {
  const pending = new Map<number, (b: ArrayBuffer) => void>(),
    frames: number[] = [];
  const rejects = new Map<number, (error: Error) => void>();
  const transport = vi.fn(
    (n: number) =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        pending.set(n, resolve);
        rejects.set(n, reject);
      })
  );
  const scheduler = new FrameScheduler(
    manifest,
    "https://example.test/",
    { ...mobilePolicy, prefetchAhead: 0, prefetchBehind: 0 },
    transport,
    async () => image()
  );
  let serial = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  const timeline = new FrameTimeline(
    scheduler,
    (_image, n) => frames.push(n),
    () => {},
    0,
    cb => {
      callbacks.set(++serial, cb);
      return serial;
    },
    id => {
      callbacks.delete(id);
    }
  );
  const flush = async () => {
    for (let i = 0; i < 8; i++) {
      const rows = Array.from(callbacks.values());
      callbacks.clear();
      rows.forEach(cb => cb(performance.now()));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  };
  const finish = async (n: number) => {
    expect(pending.has(n)).toBe(true);
    pending.get(n)!(new ArrayBuffer(4));
    await flush();
  };
  return {
    timeline,
    scheduler,
    transport,
    pending,
    rejects,
    frames,
    flush,
    finish,
  };
}
describe("Continuous last-valid-image presentation", () => {
  it("starts at original frame zero and keeps its successful image while a boundary stalls or fails", async () => {
    const h = harness();
    await h.flush();
    await h.finish(0);
    h.timeline.seek(238);
    await h.flush();
    await h.finish(238);
    h.timeline.seek(239);
    await h.flush();
    expect(h.timeline.state.displayed).toBe(238);
    expect(h.frames).toEqual([0, 238]);
    h.rejects.get(239)!(new Error("network unavailable"));
    await h.flush();
    expect(h.timeline.state.displayed).toBe(238);
    expect(h.timeline.state.error).toBe("network unavailable");
    h.timeline.retry();
    await h.flush();
    await h.finish(239);
    expect(h.timeline.state.displayed).toBe(239);
    h.timeline.dispose();
  });
  it("coalesces continuous input into the latest destination per refresh without autoplay", async () => {
    const h = harness();
    await h.flush();
    await h.finish(0);
    for (let i = 1; i <= 1672; i++) {
      h.timeline.seek(i);
      expect(h.timeline.state.requested).toBe(i);
    }
    expect(h.transport).toHaveBeenCalledTimes(1);
    await h.flush();
    expect(h.transport).toHaveBeenCalledTimes(2);
    expect(h.pending.has(1672)).toBe(true);
    await h.finish(1672);
    await h.flush();
    expect(h.frames).toEqual([0, 1672]);
    expect(h.timeline.state.requested).toBe(1672);
    h.timeline.dispose();
  });
  it("paints useful in-flight progress during continuous input while preserving the newest destination", async () => {
    const h = harness();
    await h.flush();
    await h.finish(0);
    h.timeline.seek(100);
    await h.flush();
    h.timeline.seek(200);
    await h.flush();
    await h.finish(100);
    expect(h.frames).toEqual([0, 100]);
    expect(h.timeline.state.requested).toBe(200);
    await h.finish(200);
    expect(h.frames).toEqual([0, 100, 200]);
    h.timeline.dispose();
  });
  it("never replaces the latest displayed intent with an obsolete asynchronous response", async () => {
    const h = harness();
    await h.flush();
    await h.finish(0);
    h.timeline.seek(300);
    await h.flush();
    h.timeline.seek(50);
    await h.flush();
    await h.finish(50);
    await h.finish(300);
    expect(h.frames).toEqual([0, 50]);
    expect(h.timeline.state.displayed).toBe(50);
    h.timeline.dispose();
  });
  it("keeps a single scheduler through every boundary both ways; reverse cached frames do not refetch", async () => {
    const h = harness();
    await h.flush();
    await h.finish(0);
    for (const c of manifest.chapters.slice(1)) {
      h.timeline.seek(c.startInclusive - 1);
      await h.flush();
      await h.finish(c.startInclusive - 1);
      h.timeline.seek(c.startInclusive);
      await h.flush();
      await h.finish(c.startInclusive);
      const count = h.transport.mock.calls.length;
      h.timeline.seek(c.startInclusive - 1);
      await h.flush();
      expect(h.timeline.state.displayed).toBe(c.startInclusive - 1);
      expect(h.transport).toHaveBeenCalledTimes(count);
      expect(h.timeline.scheduler).toBe(h.scheduler);
      expect(h.scheduler.stats.disposed).toBe(false);
    }
    h.timeline.dispose();
  });
  it("reuses an active transfer on reversal rather than aborting and fetching the same frame twice", async () => {
    const h = harness();
    await h.flush();
    await h.finish(0);
    h.timeline.seek(100);
    await h.flush();
    h.timeline.seek(200);
    await h.flush();
    h.timeline.seek(100);
    await h.flush();
    expect(h.transport.mock.calls.filter(([n]) => n === 100)).toHaveLength(1);
    expect(h.scheduler.stats.aborted).toBe(0);
    await h.finish(100);
    expect(h.timeline.state.displayed).toBe(100);
    h.timeline.dispose();
  });
  it("protects leased bitmaps across eviction/disposal and closes them exactly once after release", async () => {
    const images: ImageBitmap[] = [];
    const s = new FrameScheduler(
      manifest,
      "https://example.test/",
      {
        ...mobilePolicy,
        maxDecodedBytes: FRAME_BYTES,
        prefetchAhead: 0,
        prefetchBehind: 0,
      },
      async () => new ArrayBuffer(4),
      async () => {
        const img = image();
        images.push(img);
        return img;
      }
    );
    await s.request(0, ranges, 1);
    const lease = s.acquireCached(0)!;
    await s.request(100, ranges, 1);
    expect(lease.image.close).not.toHaveBeenCalled();
    s.dispose();
    expect(lease.image.close).not.toHaveBeenCalled();
    lease.release();
    lease.release();
    expect(lease.image.close).toHaveBeenCalledOnce();
    expect(images.every(v => vi.mocked(v.close).mock.calls.length === 1)).toBe(
      true
    );
  });
  it("backs off memory after an allocation failure without changing image dimensions or integrity transport", async () => {
    const s = new FrameScheduler(
      manifest,
      "https://example.test/",
      adaptivePolicy({ mobile: false, deviceMemory: 8 }),
      async () => new ArrayBuffer(4),
      async () => {
        throw new RangeError("allocation failure");
      }
    );
    await expect(s.request(0, ranges, 1)).rejects.toThrow("allocation");
    expect(s.policy.maxDecodedBytes).toBeLessThan(FRAME_BYTES * 30);
    s.dispose();
  });
  it("accepts unchanged fist-controller input from frame zero and across the first boundary without a busy phase", async () => {
    const h = harness();
    await h.flush();
    await h.finish(0);
    const c = new BookGestureController();
    const input = {
      frameCount: 1673,
      getFrame: () => h.timeline.state.requested,
      isAvailable: () => true,
      seekTo: (n: number) => h.timeline.seek(n),
    };
    const pose = (x: number) => ({
      landmarks: [Array.from({ length: 21 }, () => ({ x, y: 0.5 }))],
      gestures: [[{ categoryName: "Closed_Fist", score: 0.95 }]],
    });
    const scope = { left: 0, top: 0, width: 1000, height: 700 };
    for (let grab = 0; grab < 2; grab++) {
      c.reset();
      c.process(pose(0.5), 0, input, scope, false, () => false);
      c.process(pose(0.5), 140, input, scope, false, () => false);
      for (let t = 210; t < 900; t += 70)
        c.process(pose(1), t, input, scope, false, () => false);
    }
    expect(h.timeline.state.requested).toBeGreaterThan(239);
    expect(h.timeline.state.displayed).toBe(0);
    await h.flush();
    await h.finish(h.timeline.state.requested);
    expect(h.timeline.state.displayed).toBe(h.timeline.state.requested);
    h.timeline.dispose();
  });
  it("uses conservative mobile/Save-Data budgets and permits original desktop prefetch only on sufficient memory", () => {
    expect(adaptivePolicy({ mobile: true, deviceMemory: 2 })).toEqual(
      mobilePolicy
    );
    expect(
      adaptivePolicy({ mobile: true, deviceMemory: 8 }).maxDecodedBytes
    ).toBe(FRAME_BYTES * 8);
    expect(adaptivePolicy({ mobile: false, deviceMemory: 8 })).toMatchObject({
      maxDecodedBytes: FRAME_BYTES * 30,
      maxConcurrentRequests: 7,
      prefetchAhead: 11,
      prefetchBehind: 7,
    });
    expect(
      adaptivePolicy({ mobile: false, deviceMemory: 16, saveData: true })
    ).toEqual(mobilePolicy);
  });
});
