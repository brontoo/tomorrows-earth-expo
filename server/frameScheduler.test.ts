import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { FrameManifest } from "../client/src/components/book/frames/contracts";
import {
  FrameScheduler,
  desktopPolicy,
  mobilePolicy,
} from "../client/src/components/book/frames/FrameScheduler";
import { resolveAssetLocation } from "../client/src/components/book/frames/assetLocation";

const manifest = JSON.parse(
  readFileSync(
    new URL("../media/seven-emirates/manifest.json", import.meta.url),
    "utf8"
  )
) as FrameManifest;
const ranges = manifest.chapters;
const image = () =>
  ({ width: 1920, height: 1080, close: vi.fn() }) as unknown as ImageBitmap;
const idle = (scheduler: FrameScheduler) =>
  vi.waitFor(() => expect(scheduler.stats.activeRequests).toBe(0));

describe("Network frame scheduling", () => {
  it("times out a stalled foreground request without leaving a live job", async () => {
    vi.useFakeTimers();
    const scheduler = new FrameScheduler(
      manifest,
      "https://example.test/",
      { ...mobilePolicy, prefetchAhead: 0, prefetchBehind: 0 },
      (_frame, signal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            { once: true }
          )
        ),
      async () => image()
    );
    try {
      const result = expect(scheduler.request(0, ranges, 1)).rejects.toThrow(
        "timed out"
      );
      await vi.advanceTimersByTimeAsync(15000);
      await result;
      expect(scheduler.stats.activeRequests).toBe(0);
    } finally {
      scheduler.dispose();
      vi.useRealTimers();
    }
  });
  it.each([1, -1] as const)(
    "prioritizes the current frame and follows direction %s",
    async direction => {
      const starts: Array<[number, boolean]> = [];
      const scheduler = new FrameScheduler(
        manifest,
        "https://example.test/",
        desktopPolicy,
        async (frame, _signal, foreground) => {
          starts.push([frame, foreground]);
          return new ArrayBuffer(8);
        },
        async () => image()
      );
      await scheduler.request(100, ranges, direction);
      await idle(scheduler);
      expect(starts.slice(0, 3)).toEqual([
        [100, true],
        [100 + direction, false],
        [100 + 2 * direction, false],
      ]);
      expect(starts.length).toBe(
        1 + desktopPolicy.prefetchAhead + desktopPolicy.prefetchBehind
      );
      scheduler.dispose();
    }
  );
  it("reuses cached forward/backward images without requesting their bytes again", async () => {
    const transport = vi.fn(async (_frame: number) => new ArrayBuffer(8));
    const scheduler = new FrameScheduler(
      manifest,
      "https://example.test/",
      desktopPolicy,
      transport,
      async () => image()
    );
    const first = await scheduler.request(100, ranges, 1);
    await idle(scheduler);
    await scheduler.request(101, ranges, 1);
    await idle(scheduler);
    expect(await scheduler.request(100, ranges, -1)).toBe(first);
    await idle(scheduler);
    expect(
      transport.mock.calls.filter(([frame]) => frame === 100)
    ).toHaveLength(1);
    expect(scheduler.stats.cacheHits).toBe(2);
    scheduler.dispose();
  });
  it("enforces mobile decoded/encoded budgets and releases evicted images", async () => {
    const decoded: ImageBitmap[] = [];
    const scheduler = new FrameScheduler(
      manifest,
      "https://example.test/",
      { ...mobilePolicy, maxEncodedBytes: 16 },
      async () => new ArrayBuffer(8),
      async () => {
        const value = image();
        decoded.push(value);
        return value;
      }
    );
    for (let n = 0; n < 8; n++) {
      await scheduler.request(n * 20, ranges, 1);
      await idle(scheduler);
      expect(scheduler.stats.decodedCount).toBeLessThanOrEqual(4);
      expect(scheduler.stats.encodedBytes).toBeLessThanOrEqual(16);
    }
    expect(
      decoded.filter(value => vi.mocked(value.close).mock.calls.length > 0)
        .length
    ).toBeGreaterThan(0);
    scheduler.dispose();
    expect(
      decoded.every(value => vi.mocked(value.close).mock.calls.length === 1)
    ).toBe(true);
    expect(scheduler.stats.decodedBytes).toBe(0);
  });
  it("never prefetches a locked chapter or accepts an inaccessible current frame", async () => {
    const starts: number[] = [];
    const scheduler = new FrameScheduler(
      manifest,
      "https://example.test/",
      desktopPolicy,
      async frame => {
        starts.push(frame);
        return new ArrayBuffer(8);
      },
      async () => image()
    );
    await scheduler.request(238, [ranges[0]], 1);
    await idle(scheduler);
    expect(starts.every(frame => frame < 239)).toBe(true);
    await expect(scheduler.request(239, [ranges[0]], 1)).rejects.toThrow(
      "permitted"
    );
    scheduler.dispose();
  });
  it("bounds concurrency and prioritizes the latest frame without aborting in-flight work", async () => {
    const releases = new Map<number, (bytes: ArrayBuffer) => void>();
    let active = 0,
      maximum = 0;
    const scheduler = new FrameScheduler(
      manifest,
      "https://example.test/",
      {
        ...desktopPolicy,
        maxConcurrentRequests: 1,
        prefetchAhead: 0,
        prefetchBehind: 0,
      },
      frame => {
        active++;
        maximum = Math.max(maximum, active);
        return new Promise(resolve =>
          releases.set(frame, bytes => {
            active--;
            resolve(bytes);
          })
        );
      },
      async () => image()
    );
    const old = scheduler.request(0, ranges, 1);
    const latest = scheduler.request(100, ranges, 1);
    releases.get(0)!(new ArrayBuffer(8));
    await expect(old).resolves.toMatchObject({ width: 1920 });
    await vi.waitFor(() => expect(releases.has(100)).toBe(true));
    releases.get(100)!(new ArrayBuffer(8));
    await latest;
    await idle(scheduler);
    expect(maximum).toBe(1);
    scheduler.dispose();
  });
  it("closes a late decoded image after unmount instead of retaining it", async () => {
    let release!: (bitmap: ImageBitmap) => void;
    const scheduler = new FrameScheduler(
      manifest,
      "https://example.test/",
      { ...mobilePolicy, prefetchAhead: 0, prefetchBehind: 0 },
      async () => new ArrayBuffer(8),
      () =>
        new Promise(resolve => {
          release = resolve;
        })
    );
    const pending = scheduler.request(0, ranges, 1);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    scheduler.dispose();
    await expect(pending).rejects.toThrow("disposed");
    const bitmap = image();
    release(bitmap);
    await idle(scheduler);
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(scheduler.stats.decodedCount).toBe(0);
  });
  it("allows retry after a failed foreground request", async () => {
    let fail = true;
    const scheduler = new FrameScheduler(
      manifest,
      "https://example.test/",
      { ...mobilePolicy, prefetchAhead: 0, prefetchBehind: 0 },
      async () => {
        if (fail) throw new Error("offline");
        return new ArrayBuffer(8);
      },
      async () => image()
    );
    await expect(scheduler.request(0, ranges, 1)).rejects.toThrow("offline");
    await idle(scheduler);
    fail = false;
    await expect(scheduler.request(0, ranges, 1)).resolves.toMatchObject({
      width: 1920,
      height: 1080,
    });
    scheduler.dispose();
  });
});

describe("Versioned public asset resolution", () => {
  it("supports explicit media versions and already-versioned legacy configuration", () => {
    const location = resolveAssetLocation(
      "https://example.test/public/seven-emirates-game",
      "https://app.test",
      "7e-123"
    );
    expect(location.manifestUrl).toBe(
      "https://example.test/public/seven-emirates-game/7e-123/manifest.json"
    );
    expect(resolveAssetLocation(location.baseUrl, "https://app.test")).toEqual(
      location
    );
  });
  it.each(["../outside", "..", "/root", "version?token=private"])(
    "rejects unsafe version %s",
    version => {
      expect(() =>
        resolveAssetLocation(
          "https://example.test/",
          "https://app.test",
          version
        )
      ).toThrow();
    }
  );
  it.each([
    "https://user:password@example.test/",
    "https://example.test/?key=private",
    "file:///tmp/",
  ])("rejects nonpublic base %s", base => {
    expect(() => resolveAssetLocation(base, "https://app.test")).toThrow();
  });
});
