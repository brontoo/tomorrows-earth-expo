/** Hash provenance: owner-provided real acceptance run 42595276281.
 * Unequal artifacts are NOT evidence of functional compatibility/incompatibility.
 */
export const GESTURE_MODELS = Object.freeze({
  prototype: Object.freeze({
    id: "prototype",
    label: "A — Original prototype",
    url: "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
    sha256: "a966b1d4e774e0423c19c8aa71f070e5a72fe7a03c2663dd2f3cb0b0095ee3e1",
  }),
  current: Object.freeze({
    id: "current",
    label: "B — Current version 1",
    url: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
    sha256: "97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482",
  }),
});
export type GestureModelId = keyof typeof GESTURE_MODELS;
/** Owner Task 10: B is final. Historical A metadata above is audit-only. */
export function selectGestureModel(id: string, _obsoleteABFlag?: boolean) {
  if (id === "current") return GESTURE_MODELS.current;
  throw new Error(
    "Owner-approved Model B is required. No alternative model was loaded."
  );
}
export async function verifyModelBytes(
  bytes: ArrayBuffer,
  expectedSha256: string
) {
  const actual = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    b => b.toString(16).padStart(2, "0")
  ).join("");
  if (actual !== expectedSha256)
    throw new Error(
      "Gesture model SHA-256 mismatch. Initialization stopped; no fallback model or camera was started."
    );
  return new Uint8Array(bytes);
}
/** Lazy: called only by explicit camera/model opt-in, never by selection or render. */
export async function loadGestureModel(model: { url: string; sha256: string }) {
  const response = await fetch(model.url, { credentials: "omit" });
  if (!response.ok)
    throw new Error(`Gesture model request failed (${response.status})`);
  return verifyModelBytes(await response.arrayBuffer(), model.sha256);
}
