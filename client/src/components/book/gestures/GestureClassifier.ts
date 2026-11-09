// Adapted from 7E-Book 1bc718ef5e77: original scale-independent math.
/** Pure interaction math for The Seven Emirates hand-gesture interface.
 * Separate from MediaPipe to keep it testable and version independent.
 */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}
export const clamp = (v: number, low: number, high: number) =>
  Math.max(low, Math.min(high, v));
export const distance = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const mirrorX = (normalizedX: number) => 1 - normalizedX;
export const smooth = (
  current: number | null,
  target: number,
  alpha: number
) => (current == null ? target : current + alpha * (target - current));

// Scale-independent pinch detection: relative to wrist-to-middle-knuckle distance.
export function pinchRatio(landmarks: readonly Landmark[] | null) {
  if (!landmarks || landmarks.length < 21) return Infinity;
  return (
    distance(landmarks[4], landmarks[8]) /
    Math.max(distance(landmarks[0], landmarks[9]), 0.018)
  );
}

// Soft fallback for hands pointing laterally or when gesture-classifier is uncertain.
export function looksLikePointing(landmarks: readonly Landmark[] | null) {
  if (!landmarks || landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const extended = [8, 12, 16, 20].map((tip, i) => {
    const pip = [6, 10, 14, 18][i];
    const mcp = [5, 9, 13, 17][i];
    return (
      distance(landmarks[tip], wrist) >
        distance(landmarks[pip], wrist) * 1.12 &&
      distance(landmarks[tip], landmarks[mcp]) >
        distance(landmarks[pip], landmarks[mcp]) * 1.25
    );
  });
  return extended[0] && !extended[1] && !extended[2] && !extended[3];
}

// A mapping that takes up most of the webcam field of view, not just its edges.
export function screenPoint(
  landmarks: readonly Landmark[],
  viewportWidth: number,
  viewportHeight: number,
  inset = 0.11
) {
  const tip = landmarks[8];
  return {
    x: clamp((mirrorX(tip.x) - inset) / (1 - 2 * inset), 0, 1) * viewportWidth,
    y: clamp((tip.y - inset) / (1 - 2 * inset), 0, 1) * viewportHeight,
  };
}

export function fistToFrame(
  originFrame: number,
  originX: number,
  currentX: number,
  frameCount: number,
  sensitivity = 290,
  deadZone = 0.012
) {
  const delta = originX - currentX;
  const corrected =
    Math.abs(delta) <= deadZone ? 0 : delta - Math.sign(delta) * deadZone;
  return clamp(
    Math.round(originFrame + corrected * sensitivity),
    0,
    frameCount - 1
  );
}

export function centerOfPalm(landmarks: readonly Landmark[] | null) {
  if (!landmarks || landmarks.length < 21) return null;
  const ids = [0, 5, 9, 13, 17];
  return {
    x: ids.reduce((s, i) => s + landmarks[i].x, 0) / 5,
    y: ids.reduce((s, i) => s + landmarks[i].y, 0) / 5,
  };
}

export const OPTIONS = Object.freeze({
  inferenceIntervalMs: 68,
  fistStabilityMs: 135,
  fistDeadZone: 0.014,
  framesPerCameraWidth: 425,
  pointerSmoothing: 0.35,
  fistSmoothing: 0.38,
  pinchCloseRatio: 0.43,
  pinchReleaseRatio: 0.64,
  pinchStableMs: 90,
  clickCooldownMs: 530,
  pointerGraceMs: 430,
  lostHandMs: 480,
});
export interface HandSample {
  landmarks?: readonly Landmark[][];
  gestures?: readonly (readonly { categoryName: string; score: number }[])[];
}
export function gesturePreviewEnabled(
  engine: string | undefined,
  flag: string | undefined
) {
  return engine === "frames" && flag === "true";
}

/** Match the mirrored preview's object-fit:contain, including camera letterboxing. */
export function previewPoint(
  point: Landmark,
  width: number,
  height: number,
  videoWidth: number,
  videoHeight: number
) {
  const scale = Math.min(width / videoWidth, height / videoHeight);
  const w = videoWidth * scale,
    h = videoHeight * scale;
  return {
    x: (width - w) / 2 + (1 - point.x) * w,
    y: (height - h) / 2 + point.y * h,
  };
}
