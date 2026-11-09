import type { FrameManifest, FrameRange } from "./contracts";
/** Presentation access is universal. No authentication/mission data enters this API. */
export function explorationRanges(
  manifest: Pick<FrameManifest, "frameCount">
): readonly FrameRange[] {
  return [{ startInclusive: 0, endExclusive: manifest.frameCount }];
}
