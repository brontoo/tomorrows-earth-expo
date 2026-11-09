import {
  centerOfPalm,
  fistToFrame,
  looksLikePointing,
  mirrorX,
  OPTIONS,
  pinchRatio,
  screenPoint,
  smooth,
  type HandSample,
} from "./GestureClassifier";

/** Presentation port only. Player's seekTo enforces full-sequence media bounds on EVERY call; never mission progress. */
export interface BookFrameInput {
  readonly frameCount: number;
  getFrame(): number;
  isAvailable(): boolean;
  seekTo(frame: number): void;
}
export interface GestureView {
  mode: "idle" | "candidate" | "fist" | "pointer" | "pinch";
  pointer: { x: number; y: number } | null;
  selected: boolean;
}
export interface GestureScope {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Stateful adaptation of the original processResult; no camera, DOM or educational mutations. */
export class BookGestureController {
  private fistSince: number | null = null;
  private fistX: number | null = null;
  private anchor: { x: number; frame: number } | null = null;
  private pointer: { x: number; y: number } | null = null;
  private lastPoint = -Infinity;
  private pinchSince: number | null = null;
  private pinchDown = false;
  private lastClick = -Infinity;
  reset() {
    this.fistSince = null;
    this.fistX = null;
    this.anchor = null;
    this.pointer = null;
    this.lastPoint = -Infinity;
    this.pinchSince = null;
    this.pinchDown = false;
  }
  process(
    result: HandSample,
    now: number,
    input: BookFrameInput | null,
    scope: GestureScope,
    blocked: boolean,
    activate: (x: number, y: number) => boolean
  ): GestureView {
    const idle: GestureView = { mode: "idle", pointer: null, selected: false };
    const hand = result.landmarks?.[0];
    if (
      blocked ||
      !hand ||
      hand.length < 21 ||
      hand.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))
    ) {
      this.reset();
      return idle;
    }
    const category = result.gestures?.[0]?.[0];
    const pointing =
      (category?.categoryName === "Pointing_Up" && category.score >= 0.51) ||
      looksLikePointing(hand);
    const ratio = pinchRatio(hand);
    const pinch =
      ratio <
      (this.pinchDown ? OPTIONS.pinchReleaseRatio : OPTIONS.pinchCloseRatio);
    const fromPointer =
      pinch &&
      this.pointer !== null &&
      (this.pinchDown || now - this.lastPoint < OPTIONS.pointerGraceMs);
    const fist =
      category?.categoryName === "Closed_Fist" &&
      category.score >= 0.58 &&
      !fromPointer;
    if (fist) {
      this.pinchSince = null;
      this.pinchDown = false;
      if (!input?.isAvailable()) {
        this.reset();
        return idle;
      }
      this.fistX = smooth(
        this.fistX,
        mirrorX(centerOfPalm(hand)!.x),
        OPTIONS.fistSmoothing
      );
      this.fistSince ??= now;
      if (now - this.fistSince < OPTIONS.fistStabilityMs)
        return { ...idle, mode: "candidate" };
      this.anchor ??= { x: this.fistX, frame: input.getFrame() };
      this.pointer = null;
      input.seekTo(
        fistToFrame(
          this.anchor.frame,
          this.anchor.x,
          this.fistX,
          input.frameCount,
          OPTIONS.framesPerCameraWidth,
          OPTIONS.fistDeadZone
        )
      );
      return { ...idle, mode: "fist" };
    }
    this.fistSince = null;
    this.fistX = null;
    this.anchor = null;
    if (pointing) this.lastPoint = now;
    if (pointing || fromPointer) {
      const mapped = screenPoint(hand, scope.width, scope.height, 0.1);
      this.pointer = {
        x: Math.max(
          scope.left,
          Math.min(
            scope.left + scope.width,
            smooth(
              this.pointer?.x ?? null,
              scope.left + mapped.x,
              OPTIONS.pointerSmoothing
            )
          )
        ),
        y: Math.max(
          scope.top,
          Math.min(
            scope.top + scope.height,
            smooth(
              this.pointer?.y ?? null,
              scope.top + mapped.y,
              OPTIONS.pointerSmoothing
            )
          )
        ),
      };
      let selected = false;
      if (pinch) {
        this.pinchSince ??= now; // Do not restart the dwell timer on every sample.
        if (!this.pinchDown && now - this.pinchSince >= OPTIONS.pinchStableMs) {
          this.pinchDown = true; // Latch even on a disabled target/cooldown; release required.
          if (now - this.lastClick >= OPTIONS.clickCooldownMs) {
            selected = activate(this.pointer.x, this.pointer.y);
            if (selected) this.lastClick = now;
          }
        }
      } else {
        this.pinchDown = false;
        this.pinchSince = null;
      }
      return {
        mode: this.pinchDown ? "pinch" : "pointer",
        pointer: this.pointer,
        selected,
      };
    }
    // No stale cursor or continued motion when pose/tracking is lost.
    if (ratio >= OPTIONS.pinchReleaseRatio) {
      this.pinchDown = false;
      this.pinchSince = null;
    }
    this.pointer = null;
    return idle;
  }
}

/** Explicit opt-in targets only; camera/audio/browser-permission controls are never opted in. */
export function scopedGestureTarget(
  root: HTMLElement,
  x: number,
  y: number
): HTMLElement | null {
  const hit = root.ownerDocument.elementFromPoint(x, y);
  const target = hit?.closest<HTMLElement>("[data-book-gesture]");
  if (
    !target ||
    !root.contains(target) ||
    target.closest('[inert], [hidden], [aria-hidden="true"]') ||
    target.matches(':disabled, [aria-disabled="true"], .is-disabled') ||
    !target.matches("button, a[href]") ||
    target.getClientRects().length === 0
  )
    return null;
  return target;
}
