import { describe, expect, it } from "vitest";
import { resolveBookEngine } from "../client/src/components/book/frames/engineConfig";

describe("Book renderer rollout safety", () => {
  it.each([undefined, "", "legacy", "unknown", "FRAMES"])(
    "retains legacy for configuration %s even if a future player is ready",
    requested => {
      expect(
        resolveBookEngine(requested, { playerReady: true, assetsReady: true })
      ).toBe("legacy");
    }
  );
  it("retains legacy when frames are requested before implementation", () => {
    expect(resolveBookEngine("frames")).toBe("legacy");
  });
  it.each([
    { playerReady: false, assetsReady: false },
    { playerReady: true, assetsReady: false },
    { playerReady: false, assetsReady: true },
  ])("retains legacy for unavailable player/assets: %j", availability => {
    expect(resolveBookEngine("frames", availability)).toBe("legacy");
  });
  it("requires explicit configuration, a ready player and validated assets", () => {
    expect(
      resolveBookEngine("frames", { playerReady: true, assetsReady: true })
    ).toBe("frames");
  });
});
