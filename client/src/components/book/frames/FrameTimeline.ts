import { FrameScheduler } from "./FrameScheduler";
import { bookDiagnostics } from "./FrameDiagnostics";
export interface TimelineState {
  requested: number;
  displayed: number | null;
  error: string | null;
}
/** One continuous, imperative timeline. Input is coalesced; paint never erases the last valid image. */
export class FrameTimeline {
  readonly state: TimelineState;
  private raf: number | null = null;
  private dirty = true;
  private revision = 0;
  private previousRequest: number;
  private requestedAt = performance.now();
  private disposed = false;
  private unsubscribe: () => void;
  constructor(
    readonly scheduler: FrameScheduler,
    private draw: (image: ImageBitmap, frame: number) => void,
    private update: (state: TimelineState) => void,
    initial = 0,
    private refresh: (callback: FrameRequestCallback) => number = callback =>
      requestAnimationFrame(callback),
    private cancel: (id: number) => void = id => cancelAnimationFrame(id)
  ) {
    this.state = { requested: initial, displayed: null, error: null };
    this.previousRequest = initial;
    this.unsubscribe = scheduler.subscribe(() => this.schedule());
    this.schedule();
  }
  seek(frame: number) {
    if (this.disposed || !Number.isSafeInteger(frame)) return;
    const next = Math.max(
      0,
      Math.min(this.scheduler.manifest.frameCount - 1, frame)
    );
    if (next === this.state.requested) return;
    this.previousRequest = this.state.requested;
    this.state.requested = next;
    this.requestedAt = performance.now();
    this.revision++;
    this.dirty = true;
    this.state.error = null;
    bookDiagnostics()?.record("input", { frame: next });
    this.schedule();
  }
  retry() {
    this.dirty = true;
    this.state.error = null;
    this.revision++;
    this.schedule();
  }
  private schedule() {
    if (!this.disposed && this.raf === null)
      this.raf = this.refresh(() => {
        this.raf = null;
        this.tick();
      });
  }
  private tick() {
    if (this.disposed) return;
    if (this.dirty) {
      this.dirty = false;
      const requested = this.state.requested,
        revision = this.revision;
      void this.scheduler
        .request(
          requested,
          [
            {
              startInclusive: 0,
              endExclusive: this.scheduler.manifest.frameCount,
            },
          ],
          requested >= this.previousRequest ? 1 : -1
        )
        .catch(error => {
          if (!this.disposed && revision === this.revision) {
            this.state.error =
              error instanceof Error ? error.message : "Frame unavailable";
            this.update({ ...this.state });
          }
        });
    }
    const candidate = this.scheduler.closestReady(
      this.state.displayed,
      this.state.requested
    );
    if (candidate !== undefined && candidate !== this.state.displayed) {
      const lease = this.scheduler.acquireCached(candidate);
      if (lease) {
        try {
          const start = performance.now();
          this.draw(lease.image, candidate);
          this.state.displayed = candidate;
          this.scheduler.presented(candidate);
          if (candidate === this.state.requested) this.state.error = null;
          bookDiagnostics()?.record("draw", {
            frame: candidate,
            duration: performance.now() - start,
          });
          bookDiagnostics()?.record("requestToDisplay", {
            frame: candidate,
            requested: this.state.requested,
            duration: performance.now() - this.requestedAt,
            exact: candidate === this.state.requested,
          });
        } catch (error) {
          this.state.error =
            error instanceof Error ? error.message : "Could not draw frame";
        } finally {
          lease.release();
        }
      }
    }
    this.update({ ...this.state });
  }
  dispose() {
    this.disposed = true;
    if (this.raf !== null) this.cancel(this.raf);
    this.unsubscribe();
    this.scheduler.dispose();
  }
}
