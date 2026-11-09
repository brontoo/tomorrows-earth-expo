import type { FrameCacheBudget, FrameManifest, FrameRange } from "./contracts";
import { decodeFrameBytes, loadFrameBytes } from "./manifest";

const FRAME_BYTES = 1920 * 1080 * 4;
export const desktopPolicy: FrameCacheBudget = {
  maxDecodedBytes: FRAME_BYTES * 8,
  maxEncodedBytes: 8 * 1024 * 1024,
  maxConcurrentRequests: 3,
  prefetchAhead: 4,
  prefetchBehind: 2,
};
export const mobilePolicy: FrameCacheBudget = {
  maxDecodedBytes: FRAME_BYTES * 4,
  maxEncodedBytes: 2 * 1024 * 1024,
  maxConcurrentRequests: 2,
  prefetchAhead: 2,
  prefetchBehind: 1,
};

type Job = {
  frame: number;
  priority: number;
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

/** One mounted player owns one scheduler. Never draws, navigates or mutates educational state. */
export class FrameScheduler {
  private decoded = new Map<number, ImageBitmap>();
  private encoded = new Map<number, ArrayBuffer>();
  private jobs = new Map<number, Job>();
  private active = new Set<Job>();
  private desired = new Set<number>();
  private focus = -1;
  private disposed = false;
  private encodedBytes = 0;
  private cacheHits = 0;
  private requests = 0;
  private transport: Transport;
  constructor(
    readonly manifest: FrameManifest,
    readonly baseUrl: string,
    readonly policy: FrameCacheBudget,
    transport?: Transport,
    private decode: Decoder = decodeFrameBytes
  ) {
    if (
      policy.maxDecodedBytes < FRAME_BYTES ||
      policy.maxEncodedBytes < 0 ||
      policy.maxConcurrentRequests < 1
    )
      throw new Error("Invalid frame cache policy");
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
  get stats() {
    return {
      decodedCount: this.decoded.size,
      decodedBytes: this.decoded.size * FRAME_BYTES,
      encodedBytes: this.encodedBytes,
      activeRequests: this.active.size,
      queuedRequests: Math.max(0, this.jobs.size - this.active.size),
      cacheHits: this.cacheHits,
      networkRequests: this.requests,
      disposed: this.disposed,
    };
  }
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
    this.desired = new Set(window);
    for (const [index, job] of Array.from(this.jobs)) {
      if (!this.desired.has(index)) {
        job.abort.abort();
        job.reject(new Error("Frame superseded"));
        this.jobs.delete(index);
      }
    }
    // A newly requested foreground frame takes precedence over speculative in-flight work.
    if (
      !this.decoded.has(frame) &&
      !this.jobs.has(frame) &&
      this.active.size >= this.policy.maxConcurrentRequests
    ) {
      for (const job of Array.from(this.active))
        if (job.frame !== frame) {
          job.abort.abort();
          job.reject(new Error("Prefetch preempted"));
          this.jobs.delete(job.frame);
        }
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
      // Speculative jobs have no UI waiter; foreground callers still receive the original rejection.
      void promise.catch(() => undefined);
      this.jobs.set(index, {
        frame: index,
        priority: rank,
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
    }
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
    for (const [frame, image] of Array.from(this.decoded)) {
      if (this.decoded.size * FRAME_BYTES <= this.policy.maxDecodedBytes) break;
      if (frame !== this.focus) {
        image.close();
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
      .filter(j => !this.active.has(j) && !j.abort.signal.aborted)
      .sort((a, b) => a.priority - b.priority);
    while (
      this.active.size < this.policy.maxConcurrentRequests &&
      queued.length
    ) {
      const job = queued.shift()!;
      this.active.add(job);
      void this.run(job);
    }
  }
  private async run(job: Job) {
    const signal = job.abort.signal;
    const timeout = setTimeout(() => {
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
      const image = await this.decode(bytes, signal);
      if (signal.aborted || this.disposed || !this.desired.has(job.frame)) {
        image.close();
        throw new Error("Frame decode superseded");
      }
      this.decoded.get(job.frame)?.close();
      this.touch(this.decoded, job.frame, image);
      this.trim();
      job.resolve(image);
    } catch (error) {
      job.reject(error);
    } finally {
      clearTimeout(timeout);
      if (this.jobs.get(job.frame) === job) this.jobs.delete(job.frame);
      this.active.delete(job);
      this.trim();
      this.pump();
    }
  }
  dispose() {
    this.disposed = true;
    for (const job of Array.from(this.jobs.values())) {
      job.abort.abort();
      job.reject(new Error("Frame scheduler disposed"));
    }
    this.jobs.clear();
    this.decoded.forEach(image => image.close());
    this.decoded.clear();
    this.encoded.clear();
    this.encodedBytes = 0;
  }
}
