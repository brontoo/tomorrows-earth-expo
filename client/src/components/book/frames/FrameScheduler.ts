import type { FrameCacheBudget, FrameManifest, FrameRange } from "./contracts";
import { decodeFrameBytes, loadFrameBytes } from "./manifest";
import { bookDiagnostics } from "./FrameDiagnostics";

export const FRAME_BYTES = 1920 * 1080 * 4;
const budget = (
  frames: number,
  concurrent: number,
  ahead: number,
  behind: number
): FrameCacheBudget => ({
  maxDecodedBytes: FRAME_BYTES * frames,
  maxEncodedBytes: frames * 256 * 1024,
  maxConcurrentRequests: concurrent,
  prefetchAhead: ahead,
  prefetchBehind: behind,
});
export const desktopPolicy = budget(16, 5, 9, 5);
export const mobilePolicy = budget(4, 2, 2, 1);
export function adaptivePolicy({
  mobile,
  deviceMemory,
  saveData,
}: {
  mobile: boolean;
  deviceMemory?: number;
  saveData?: boolean;
}): FrameCacheBudget {
  if (saveData || (deviceMemory !== undefined && deviceMemory <= 2))
    return mobilePolicy;
  if (mobile) return budget(8, 3, 4, 2);
  if (deviceMemory !== undefined && deviceMemory >= 8)
    return budget(30, 7, 11, 7);
  if (deviceMemory !== undefined && deviceMemory <= 4)
    return budget(10, 4, 5, 3);
  return desktopPolicy;
}
type Job = {
  frame: number;
  priority: number;
  queuedAt: number;
  abort: AbortController;
  promise: Promise<ImageBitmap>;
  resolve: (image: ImageBitmap) => void;
  reject: (error: unknown) => void;
};
type Transport = (
  frame: number,
  signal: AbortSignal,
  foreground: boolean
) => Promise<ArrayBuffer>;
type Decoder = (
  bytes: ArrayBuffer,
  signal: AbortSignal
) => Promise<ImageBitmap>;
export interface FrameLease {
  image: ImageBitmap;
  release(): void;
}

/** One timeline owns one scheduler. Loading never clears or navigates a presentation. */
export class FrameScheduler {
  private decoded = new Map<number, ImageBitmap>();
  private encoded = new Map<number, ArrayBuffer>();
  private jobs = new Map<number, Job>();
  private active = new Set<Job>();
  private pins = new Map<number, number>();
  private listeners = new Set<() => void>();
  private focus = -1;
  private desired = new Set<number>();
  private presentedFrame: number | null = null;
  presented(frame: number) {
    this.presentedFrame = frame;
  }
  private usefulDecode(frame: number) {
    const shown = this.presentedFrame;
    return (
      this.desired.has(frame) ||
      (shown === null
        ? frame === 0
        : this.focus > shown
          ? frame > shown && frame < this.focus
          : frame < shown && frame > this.focus)
    );
  }
  private decoding = 0;
  private decodeQueue = new Map<
    Job,
    {
      bytes: ArrayBuffer;
      resolve: (image: ImageBitmap) => void;
      reject: (error: unknown) => void;
    }
  >();
  private disposed = false;
  private encodedBytes = 0;
  private cacheHits = 0;
  private requests = 0;
  private superseded = 0;
  private aborted = 0;
  private transport: Transport;
  private currentPolicy: FrameCacheBudget;
  constructor(
    readonly manifest: FrameManifest,
    readonly baseUrl: string,
    policy: FrameCacheBudget,
    transport?: Transport,
    private decode: Decoder = decodeFrameBytes
  ) {
    if (
      policy.maxDecodedBytes < FRAME_BYTES ||
      policy.maxEncodedBytes < 0 ||
      policy.maxConcurrentRequests < 1
    )
      throw new Error("Invalid frame cache policy");
    this.currentPolicy = policy;
    this.transport =
      transport ??
      ((frame, signal, foreground) =>
        loadFrameBytes(
          manifest,
          frame,
          baseUrl,
          signal,
          foreground ? "high" : "low"
        ));
  }
  get policy() {
    return this.currentPolicy;
  }
  get stats() {
    return {
      decodedCount: this.decoded.size,
      decodedBytes: this.decoded.size * FRAME_BYTES,
      encodedBytes: this.encodedBytes,
      activeRequests: this.active.size,
      queuedRequests: Math.max(0, this.jobs.size - this.active.size),
      activeDecodes: this.decoding,
      queuedDecodes: this.decodeQueue.size,
      cacheHits: this.cacheHits,
      networkRequests: this.requests,
      superseded: this.superseded,
      aborted: this.aborted,
      disposed: this.disposed,
      policy: this.policy,
    };
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  seedEncoded(frame: number, bytes: ArrayBuffer) {
    if (this.disposed || this.encoded.has(frame)) return;
    this.encoded.set(frame, bytes);
    this.encodedBytes += bytes.byteLength;
    this.trim();
  }
  /** Pin while a renderer owns a bitmap; eviction/disposal cannot close a leased image. */
  acquireCached(frame: number): FrameLease | null {
    const image = this.decoded.get(frame);
    if (!image || this.disposed) return null;
    this.pins.set(frame, (this.pins.get(frame) ?? 0) + 1);
    this.touch(this.decoded, frame, image);
    let released = false;
    return {
      image,
      release: () => {
        if (released) return;
        released = true;
        const count = (this.pins.get(frame) ?? 1) - 1;
        if (count) this.pins.set(frame, count);
        else this.pins.delete(frame);
        if (this.disposed && !count) {
          this.decoded.get(frame)?.close();
          this.decoded.delete(frame);
        }
        this.trim();
      },
    };
  }
  /** Selective skipping only toward current intent; never paint an obsolete response backwards. */
  closestReady(
    displayed: number | null,
    requested: number
  ): number | undefined {
    if (this.decoded.has(requested)) return requested;
    if (displayed === null) return this.decoded.has(0) ? 0 : undefined;
    return Array.from(this.decoded.keys())
      .filter(i =>
        requested > displayed
          ? i > displayed && i < requested
          : i < displayed && i > requested
      )
      .sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested))[0];
  }
  /** Completion is non-owning. Renderers must acquireCached() to pin a bitmap before use. */
  request(
    frame: number,
    ranges: readonly FrameRange[],
    direction: 1 | -1
  ): Promise<ImageBitmap> {
    if (this.disposed)
      return Promise.reject(new Error("Frame scheduler disposed"));
    const allowed = (i: number) =>
      Number.isSafeInteger(i) &&
      i >= 0 &&
      i < this.manifest.frameCount &&
      ranges.some(r => i >= r.startInclusive && i < r.endExclusive);
    if (!allowed(frame))
      return Promise.reject(new Error("Frame is outside permitted ranges"));
    this.focus = frame;
    const window = [frame];
    for (let n = 1; n <= this.policy.prefetchAhead; n++)
      if (allowed(frame + n * direction)) window.push(frame + n * direction);
    for (let n = 1; n <= this.policy.prefetchBehind; n++)
      if (allowed(frame - n * direction)) window.push(frame - n * direction);
    const desired = new Set(window);
    this.desired = desired;
    for (const [index, job] of Array.from(this.jobs)) {
      // Keep active network/decode work: reversal can reuse it. Only discard unstarted stale queue entries.
      if (!desired.has(index) && !this.active.has(job)) {
        job.reject(new Error("Frame superseded"));
        this.jobs.delete(index);
        this.superseded++;
        bookDiagnostics()?.record("supersededQueued", { frame: index });
      } else if (index !== frame) job.priority = 100 + Math.abs(index - frame);
    }
    for (const [rank, index] of Array.from(window.entries())) {
      if (this.decoded.has(index)) continue;
      const existing = this.jobs.get(index);
      if (existing) {
        existing.priority = rank;
        continue;
      }
      let resolve!: Job["resolve"], reject!: Job["reject"];
      const promise = new Promise<ImageBitmap>((yes, no) => {
        resolve = yes;
        reject = no;
      });
      void promise.catch(() => undefined);
      this.jobs.set(index, {
        frame: index,
        priority: rank,
        queuedAt: performance.now(),
        abort: new AbortController(),
        promise,
        resolve,
        reject,
      });
    }
    const cached = this.decoded.get(frame);
    if (cached) {
      this.cacheHits++;
      this.touch(this.decoded, frame, cached);
      bookDiagnostics()?.record("cacheHit", { frame });
    } else bookDiagnostics()?.record("cacheMiss", { frame });
    const result = cached
      ? Promise.resolve(cached)
      : this.jobs.get(frame)!.promise;
    this.trim();
    this.pump();
    return result;
  }
  private touch<T>(map: Map<number, T>, frame: number, value: T) {
    map.delete(frame);
    map.set(frame, value);
  }
  private trim() {
    // Retain nearby forward/reverse frames rather than letting distant prefetch evict the warm buffer.
    const candidates = Array.from(this.decoded.keys()).sort(
      (a, b) => Math.abs(b - this.focus) - Math.abs(a - this.focus)
    );
    for (const frame of candidates) {
      if (
        this.decoded.size * FRAME_BYTES <= this.policy.maxDecodedBytes &&
        !this.disposed
      )
        break;
      if (frame !== this.focus && !this.pins.has(frame)) {
        this.decoded.get(frame)!.close();
        this.decoded.delete(frame);
      }
    }
    for (const [frame, bytes] of Array.from(this.encoded)) {
      if (this.encodedBytes <= this.policy.maxEncodedBytes) break;
      this.encoded.delete(frame);
      this.encodedBytes -= bytes.byteLength;
    }
  }
  private pump() {
    if (this.disposed) return;
    const queued = Array.from(this.jobs.values())
      .filter(j => !this.active.has(j))
      .sort((a, b) => a.priority - b.priority);
    while (
      this.active.size < this.policy.maxConcurrentRequests &&
      queued.length
    ) {
      const job = queued[0];
      // Reserve capacity for the next foreground seek; foreground is always first in the queue.
      if (
        job.frame !== this.focus &&
        this.active.size >= Math.max(1, this.policy.maxConcurrentRequests - 1)
      )
        break;
      queued.shift();
      this.active.add(job);
      void this.run(job);
    }
  }
  private pumpDecode() {
    const maximum = this.policy.maxConcurrentRequests >= 5 ? 2 : 1;
    while (this.decoding < maximum && this.decodeQueue.size) {
      const job = Array.from(this.decodeQueue.keys()).sort((a, b) =>
        a.frame === this.focus
          ? -1
          : b.frame === this.focus
            ? 1
            : a.priority - b.priority
      )[0];
      const task = this.decodeQueue.get(job)!;
      this.decodeQueue.delete(job);
      if (
        this.disposed ||
        job.abort.signal.aborted ||
        !this.usefulDecode(job.frame)
      ) {
        task.reject(new Error("Frame decode superseded"));
        continue;
      }
      this.decoding++;
      void this.decode(task.bytes, job.abort.signal)
        .then(task.resolve, task.reject)
        .finally(() => {
          this.decoding--;
          this.pumpDecode();
        });
    }
  }
  private async run(job: Job) {
    const signal = job.abort.signal,
      started = performance.now();
    bookDiagnostics()?.record("queueWait", {
      frame: job.frame,
      duration: started - job.queuedAt,
      foreground: job.frame === this.focus,
    });
    const timeout = setTimeout(() => {
      this.aborted++;
      job.abort.abort();
      job.reject(
        new Error("Frame request timed out; retry or continue navigating")
      );
    }, 15000);
    try {
      let bytes = this.encoded.get(job.frame);
      if (!bytes) {
        this.requests++;
        bytes = await this.transport(
          job.frame,
          signal,
          job.frame === this.focus
        );
      }
      if (signal.aborted || this.disposed)
        throw new Error("Frame request cancelled");
      if (!this.encoded.has(job.frame)) this.encodedBytes += bytes.byteLength;
      this.touch(this.encoded, job.frame, bytes);
      this.trim();
      // Keep verified bytes for reversal, but do not spend decode CPU on a now-distant speculative frame.
      if (!this.usefulDecode(job.frame)) {
        bookDiagnostics()?.record("decodeAvoided", { frame: job.frame });
        throw new Error("Frame decode superseded");
      }
      const image = await new Promise<ImageBitmap>((resolve, reject) => {
        this.decodeQueue.set(job, { bytes: bytes!, resolve, reject });
        this.pumpDecode();
      });
      if (signal.aborted || this.disposed) {
        image.close();
        throw new Error("Frame decode cancelled");
      }
      this.touch(this.decoded, job.frame, image);
      this.trim();
      job.resolve(image);
      for (const listener of Array.from(this.listeners)) listener();
    } catch (error) {
      // A genuine allocation failure reduces future speculative memory. No imagery is downgraded.
      if (
        error instanceof RangeError ||
        (error instanceof Error &&
          /out of memory|allocation/i.test(error.message))
      ) {
        const frames = Math.max(
          4,
          Math.floor(this.policy.maxDecodedBytes / FRAME_BYTES / 2)
        );
        this.currentPolicy = budget(
          frames,
          Math.min(3, this.policy.maxConcurrentRequests),
          Math.min(3, frames - 2),
          1
        );
        bookDiagnostics()?.record("memoryBackoff", { frames });
        this.trim();
      }
      job.reject(error);
    } finally {
      clearTimeout(timeout);
      bookDiagnostics()?.record("request", {
        frame: job.frame,
        duration: performance.now() - started,
      });
      if (this.jobs.get(job.frame) === job) this.jobs.delete(job.frame);
      this.active.delete(job);
      this.trim();
      this.pump();
    }
  }
  dispose() {
    this.disposed = true;
    this.focus = -1;
    for (const job of Array.from(this.jobs.values())) {
      this.aborted++;
      job.abort.abort();
      job.reject(new Error("Frame scheduler disposed"));
    }
    this.jobs.clear();
    for (const task of Array.from(this.decodeQueue.values()))
      task.reject(new Error("Frame scheduler disposed"));
    this.decodeQueue.clear();
    this.listeners.clear();
    for (const [frame, image] of Array.from(this.decoded))
      if (!this.pins.has(frame)) {
        image.close();
        this.decoded.delete(frame);
      }
    this.encoded.clear();
    this.encodedBytes = 0;
  }
}
