import { centerOfPalm, distance, type Landmark } from "./GestureClassifier";

type Palm = NonNullable<ReturnType<typeof measurePalm>>;
type Pair = readonly [Palm, Palm];

function measurePalm(hand: readonly Landmark[]) {
  const center = centerOfPalm(hand)!;
  const length = distance(hand[0], hand[9]);
  const width = distance(hand[5], hand[17]);
  if (length < 0.016 || width < 0.016) return null;
  return {
    ...center,
    scale: Math.log(Math.sqrt(length * width)),
    shape: Math.log(width / length),
  };
}

/** Relative apparent size from a front camera. Each fist must move coherently. */
export class DualFistPull {
  private pair: Pair | null = null;
  private reference: Pair | null = null;
  private since = 0;
  private lastSeen = -Infinity;
  private remainder = 0;
  private previousScale: readonly [number, number] | null = null;
  get engaged() {
    return this.pair !== null;
  }

  reset() {
    this.pair = this.reference = null;
    this.previousScale = null;
    this.lastSeen = -Infinity;
    this.remainder = 0;
  }

  process(
    hands: readonly (readonly Landmark[])[],
    now: number,
    fpsScale: number,
    direction: 1 | -1
  ) {
    const a = hands[0] && measurePalm(hands[0]);
    const b = hands[1] && measurePalm(hands[1]);
    if (!a || !b) {
      // Pause immediately. Brief occlusion preserves mode priority but clears the movement reference.
      this.reference = null;
      this.previousScale = null;
      this.remainder = 0;
      if (this.pair && now - this.lastSeen < 175)
        return { mode: "dual-fist-candidate" as const, delta: 0 };
      this.reset();
      return null;
    }
    const prior = this.pair;
    const swap = prior
      ? distance(prior[0], b) + distance(prior[1], a) <
        distance(prior[0], a) + distance(prior[1], b)
      : a.x > b.x;
    const pair: Pair = swap ? [b, a] : [a, b];
    if (
      !prior ||
      now - this.lastSeen >= 175 ||
      distance(prior[0], pair[0]) > 0.22 ||
      distance(prior[1], pair[1]) > 0.22
    ) {
      this.reference = null;
      this.previousScale = null;
      this.since = now;
      this.remainder = 0;
    }
    this.lastSeen = now;
    this.pair = pair;
    if (now - this.since < 135)
      return { mode: "dual-fist-candidate" as const, delta: 0 };

    const previous = this.previousScale ?? [pair[0].scale, pair[1].scale];
    this.previousScale = [pair[0].scale, pair[1].scale];
    const reference = this.reference ?? pair;
    this.reference = reference;
    const rawLeft = reference[0].scale - pair[0].scale;
    const rawRight = reference[1].scale - pair[1].scale;
    // Blend the current and previous measurements only for movement gating.
    // Commit the raw position to avoid a filtered tail continuing after a stop.
    const left = rawLeft * 0.7 + (reference[0].scale - previous[0]) * 0.3;
    const right = rawRight * 0.7 + (reference[1].scale - previous[1]) * 0.3;
    const changedShape = pair.some(
      (hand, index) => Math.abs(hand.shape - reference[index].shape) > 0.22
    );
    let delta = 0;
    if (changedShape) {
      this.reference = pair;
      this.remainder = 0;
    } else if (
      Math.sign(rawLeft) === Math.sign(rawRight) &&
      Math.sign(left) === Math.sign(rawLeft) &&
      Math.sign(right) === Math.sign(rawRight) &&
      Math.min(
        Math.abs(rawLeft),
        Math.abs(rawRight),
        Math.abs(left),
        Math.abs(right)
      ) >= 0.022
    ) {
      // Average coherent changes, with the faster fist's contribution bounded by the slower one.
      const common = Math.min(Math.abs(rawLeft), Math.abs(rawRight));
      const movement = Math.min(
        (Math.abs(rawLeft) + Math.abs(rawRight)) / 2,
        common * 1.35,
        0.11
      );
      const exact =
        Math.sign(left) * movement * 360 * fpsScale * direction +
        this.remainder;
      delta = Math.trunc(exact);
      this.remainder = exact - delta;
      this.reference = pair;
    }
    return { mode: "dual-fist-pull" as const, delta };
  }
}
