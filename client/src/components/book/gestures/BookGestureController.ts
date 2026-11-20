import type { FrameRange } from "../frames/contracts";
import { DualFistPull } from "./DualFistPull";
import {
  centerOfPalm,
  distance,
  fistToFrame,
  looksLikePointing,
  mirrorX,
  OPTIONS,
  pinchRatio,
  screenPoint,
  smooth,
  type HandSample,
  type Landmark,
} from "./GestureClassifier";

/** Presentation port only. Player's seekTo enforces full-sequence media bounds on EVERY call; never mission progress. */
export interface BookFrameInput {
  readonly frameCount: number;
  getFrame(): number;
  depthRange?(): FrameRange | undefined;
  frameRateScale?(): number;
  isAvailable(): boolean;
  seekTo(frame: number): void;
}
export interface GestureView {
  mode:
    | "idle"
    | "single-fist"
    | "dual-fist-candidate"
    | "dual-fist-pull"
    | "pointer"
    | "pinch";
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
  private dual = new DualFistPull();
  private primary: {
    center: Landmark;
    handedness?: string;
    multiple: boolean;
  } | null = null;
  constructor(private depthDirection: 1 | -1 = 1) {}
  setDepthDirection(direction: 1 | -1) {
    this.depthDirection = direction;
    this.reset();
  }
  private fistSince: number | null = null;
  private fistX: number | null = null;
  private anchor: { x: number; frame: number; scale: number } | null = null;
  private pointer: { x: number; y: number } | null = null;
  private lastPoint = -Infinity;
  private pinchSince: number | null = null;
  private pinchDown = false;
  private lastClick = -Infinity;
  private resetSingleFist() {
    this.fistSince = null;
    this.fistX = null;
    this.anchor = null;
  }
  reset() {
    this.resetSingleFist();
    this.dual.reset();
    this.primary = null;
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
    if (blocked) {
      this.reset();
      return idle;
    }
    const hands = (result.landmarks ?? []).flatMap((landmarks, index) => {
      if (
        landmarks.length < 21 ||
        landmarks.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))
      )
        return [];
      const category = result.gestures?.[index]?.[0];
      const center = centerOfPalm(landmarks)!;
      const isFist =
        category?.categoryName === "Closed_Fist" && category.score >= 0.58;
      const handedness = result.handedness?.[index]?.[0];
      return [
        {
          landmarks,
          category,
          center,
          isFist,
          handedness:
            handedness && handedness.score >= 0.85
              ? handedness.categoryName
              : undefined,
        },
      ];
    });
    const range = input?.isAvailable() && input.depthRange?.();
    if (range && input && this.pointer === null) {
      const fists = hands.filter(
        hand =>
          hand.isFist &&
          hand.category!.score >= (this.dual.engaged ? 0.58 : 0.66)
      );
      const result = this.dual.process(
        fists.map(hand => hand.landmarks),
        now,
        input.frameRateScale?.() ?? 1,
        this.depthDirection
      );
      if (result) {
        this.resetSingleFist();
        this.primary = null;
        this.pinchSince = null;
        this.pinchDown = false;
        if (result.delta) {
          const current = input.getFrame();
          const next = Math.max(
            range.startInclusive,
            Math.min(range.endExclusive, current + result.delta)
          );
          if (next !== current) input.seekTo(next);
        }
        return { ...idle, mode: result.mode };
      }
    } else {
      this.dual.reset();
      if (
        this.pointer === null &&
        hands.length === 2 &&
        hands.every(hand => hand.isFist)
      ) {
        this.resetSingleFist();
        this.primary = null;
        return idle;
      }
    }
    const previous = this.primary;
    const matchingHands = previous?.handedness
      ? hands.filter(hand => hand.handedness === previous.handedness)
      : [];
    const candidates = matchingHands.length ? matchingHands : hands;
    const selected = previous
      ? candidates.reduce<(typeof hands)[number] | undefined>(
          (closest, candidate) =>
            !closest ||
            distance(candidate.center, previous.center) <
              distance(closest.center, previous.center)
              ? candidate
              : closest,
          undefined
        )
      : (hands.find(hand => hand.isFist) ?? hands[0]);
    if (!selected) {
      this.reset();
      return idle;
    }
    const switchedHands =
      previous &&
      ((previous.handedness &&
        selected.handedness &&
        previous.handedness !== selected.handedness) ||
        ((previous.multiple || hands.length > 1) &&
          distance(selected.center, previous.center) > 0.22));
    if (switchedHands) this.reset();
    this.primary = {
      center: selected.center,
      handedness: selected.handedness,
      multiple: hands.length > 1,
    };
    const { landmarks: hand, category } = selected;
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
    const fist = selected.isFist && !fromPointer;
    if (fist) {
      this.pinchSince = null;
      this.pinchDown = false;
      if (!input?.isAvailable()) {
        this.reset();
        return idle;
      }
      this.fistX = smooth(
        this.fistX,
        mirrorX(selected.center.x),
        OPTIONS.fistSmoothing
      );
      this.fistSince ??= now;
      if (now - this.fistSince < OPTIONS.fistStabilityMs) return idle;
      const scale = input.frameRateScale?.() ?? 1;
      if (!this.anchor || this.anchor.scale !== scale)
        this.anchor = { x: this.fistX, frame: input.getFrame(), scale };

      this.pointer = null;
      input.seekTo(
        fistToFrame(
          this.anchor.frame,
          this.anchor.x,
          this.fistX,
          input.frameCount,
          OPTIONS.framesPerCameraWidth * this.anchor.scale,
          OPTIONS.fistDeadZone
        )
      );
      return { ...idle, mode: "single-fist" };
    }
    this.resetSingleFist();
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
