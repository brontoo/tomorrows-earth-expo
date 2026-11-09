/** Presentation-only contract. No mission/reward mutations belong in this API. */
export type EmirateChapterId =
  | "abu-dhabi"
  | "dubai"
  | "sharjah"
  | "ajman"
  | "umm-al-quwain"
  | "ras-al-khaimah"
  | "fujairah";

/** Zero-based safe integer; validate imported media and input at runtime. */
export type FrameIndex = number;

/** Every range is [startInclusive, endExclusive); it must be nonempty. */
export interface FrameRange {
  readonly startInclusive: FrameIndex;
  readonly endExclusive: FrameIndex;
}

export interface FrameRecord {
  readonly index: FrameIndex;
  readonly url: string;
  readonly width: 1920;
  readonly height: 1080;
  readonly byteLength: number;
  readonly sha256: string;
  readonly source: {
    readonly videoId: string;
    readonly frameIndex: FrameIndex;
    readonly timestampSeconds: number;
  };
}

export interface ChapterFrameRange<
  Id extends EmirateChapterId = EmirateChapterId,
> extends FrameRange {
  readonly chapterId: Id;
  /** Exact resting image within this chapter's range, established from source media. */
  readonly restingFrame: FrameIndex;
  readonly keyframes: readonly FrameIndex[];
  /** Full HD static fallback, never a lower-resolution substitute. */
  readonly fallbackUrl: string;
}

export type OrderedChapterFrameRanges = readonly [
  ChapterFrameRange<"abu-dhabi">,
  ChapterFrameRange<"dubai">,
  ChapterFrameRange<"sharjah">,
  ChapterFrameRange<"ajman">,
  ChapterFrameRange<"umm-al-quwain">,
  ChapterFrameRange<"ras-al-khaimah">,
  ChapterFrameRange<"fujairah">,
];

export interface FrameManifest {
  readonly schemaVersion: 1;
  readonly mediaVersion: string;
  readonly width: 1920;
  readonly height: 1080;
  readonly frameCount: 1673;
  /** Runtime validation must require indices 0..1672 exactly once, in order. */
  readonly frames: readonly FrameRecord[];
  /** Contiguous ranges must cover [0, frameCount), in this exact chapter order. */
  readonly chapters: OrderedChapterFrameRanges;
}

export interface FrameAssetStatus {
  readonly phase: "idle" | "loading" | "ready" | "error" | "fallback";
  readonly attempt: number;
  readonly retryable: boolean;
  readonly error: {
    readonly code:
      | "network"
      | "decode"
      | "integrity"
      | "manifest"
      | "unsupported";
    readonly message: string;
  } | null;
}

export interface FrameCacheBudget {
  /** Decoded bytes include retained bitmaps; release resources on eviction. */
  readonly maxDecodedBytes: number;
  readonly maxEncodedBytes: number;
  readonly maxConcurrentRequests: number;
  readonly prefetchAhead: number;
  readonly prefetchBehind: number;
}

export type FrameInputSource =
  | "keyboard"
  | "mouse"
  | "touch"
  | "gesture"
  | "navigation";

export interface FramePlayerState {
  readonly mediaVersion: string;
  readonly requestedFrame: FrameIndex;
  /** Null until an actual image has been drawn; stale loads cannot overwrite newer intent. */
  readonly displayedFrame: FrameIndex | null;
  readonly chapterId: EmirateChapterId | null;
  readonly asset: FrameAssetStatus;
  /** Structural media bounds. The book always supplies [0, frameCount), independent of education. */
  readonly allowedRanges: readonly FrameRange[];
  readonly cacheBudget: FrameCacheBudget;
  readonly activeInput: FrameInputSource | null;
  readonly reducedMotion: boolean;
}

export interface FramePlayerControls {
  /** Reject nonintegers/nonfinite input; clamp to the current permitted range. */
  seekTo(frame: FrameIndex, source: FrameInputSource): void;
  /** Signed integer delta: positive advances, negative reverses; never crosses locked gaps. */
  scrubBy(deltaFrames: number, source: FrameInputSource): void;
  beginScrub(source: FrameInputSource): void;
  endScrub(): void;
  /** On access changes, cancel obsolete loads and reconcile requested/displayed positions. */
  setAllowedRanges(ranges: readonly FrameRange[]): void;
  setReducedMotion(reduced: boolean): void;
  setCacheBudget(budget: FrameCacheBudget): void;
  retry(): void;
  showFallback(): void;
  /** Abort loads, release decoded images, and detach input listeners. */
  dispose(): void;
}

export interface FramePlayerEvents {
  onStateChange(state: FramePlayerState): void;
  onFrameDisplayed(frame: FrameIndex, chapterId: EmirateChapterId): void;
  onAssetStatusChange(status: FrameAssetStatus): void;
  /** Requests presentation navigation only. All book chapters are open; optional missions retain their own authority. */
  onChapterRequested(chapterId: EmirateChapterId): void;
  onChallengeRequested(chapterId: EmirateChapterId): void;
}
