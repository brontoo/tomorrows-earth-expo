export type BookEngine = "legacy" | "frames";

export interface FrameEngineAvailability {
  readonly playerReady: boolean;
  /** True only after the manifest and required initial Full HD assets have validated. */
  readonly assetsReady: boolean;
}

/** Unknown/unset configuration and unavailable frame engines always retain the legacy book. */
export function resolveBookEngine(
  requested: string | undefined,
  availability: FrameEngineAvailability = {
    playerReady: false,
    assetsReady: false,
  }
): BookEngine {
  return requested === "frames" &&
    availability.playerReady &&
    availability.assetsReady
    ? "frames"
    : "legacy";
}
