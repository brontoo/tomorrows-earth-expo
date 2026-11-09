# Seven Emirates frame-engine contract — Phase 1

This document records the historical Phase 1 baseline. See
[the supplied-source integration report](seven-emirates-source-integration.md)
for the later, separately approved inactive player integration.

The legacy Three.js/GSAP book remains the only installed renderer. No media,
camera runtime, mission procedure, reward rule, route, or database schema changes
are part of this phase.

## Configuration

`VITE_BOOK_ENGINE=legacy|frames` is a public, build-time Vite setting. Unset,
unknown, or unavailable engines resolve to `legacy`. In Phase 1, requesting
`frames` also resolves to `legacy`: no frame player or validated frame assets
exist yet. `data-book-engine` on the book root exposes the effective selection.

The resolver supports a future availability check requiring both `playerReady`
and `assetsReady`. Do not set either from the environment alone. A later phase
must connect actual module readiness and manifest/initial-image validation to
renderer selection, and retain a legacy fallback on initialization failure.
Changing a Vite flag requires restarting development or rebuilding/redeploying;
it is not a live production switch. No deployment is performed in this phase.

## Responsibility boundary

`useBookProgress` retains the previous authentication, mission catalogue and
passport query options and refresh behavior. `TravelBook` retains chapter
access, mission links, server-derived stamps and presentation persistence.
`chapters.ts` remains the authority for the seven existing mission bindings.

`frames/contracts.ts` defines FrameManifest, FrameRecord, ChapterFrameRange,
FramePlayerState, FramePlayerControls, FramePlayerEvents and FrameAssetStatus.
The engine accepts permitted ranges from the educational layer and can request
navigation by chapter ID. It has no mission status setters, verification calls,
points, badge or stamp-award callbacks. Opening or scrubbing imagery cannot
change educational completion.

## Media and input conventions

- All indices are zero-based safe integers. Ranges use `[startInclusive,
  endExclusive)`. Frame 1672 is the last index in a 1,673-frame sequence.
- The manifest requires native 1920×1080 records and seven ordered chapters.
  No real manifest or chapter boundaries are fabricated in Phase 1.
- Runtime validation in the media-processing/player phase must enforce unique,
  ordered frame indices, positive byte sizes, valid checksums/URLs, contiguous
  chapter coverage, and resting/keyframe membership in each chapter range.
- Signed integer deltas support forward/reverse scrubbing. All input sources,
  including future gestures, must obey the same permitted ranges. Scrubbing
  must stop at locked gaps; explicit chapter navigation can revisit an earned
  chapter beyond a gap after the educational layer approves it.
- Requested and displayed frame indices are distinct. Async decoding must not
  allow stale responses to overwrite newer intent. The engine must reconcile
  both positions and cancel obsolete work when permitted ranges change.
- Asset state represents loading, retryable errors and a Full HD fallback.
  Cache budgets bound encoded/decoded bytes, concurrency and prefetch windows.
  Eviction/disposal must release decoded resources and detach input handlers.
- The contract has no autoplay/playback clock. Reduced motion retains explicit
  navigation without automatic transitions. Controls remain accessible without
  a camera; no camera activation is introduced by this phase.

TypeScript describes the contract; it does not validate untrusted manifests or
implement loading, frame clamping, cache enforcement or fallback rendering.
Those implementations and their tests belong to subsequent approved phases.

## Validation

Executed using the repository's pinned pnpm 10.4.1 and the onboarding local
PostgreSQL database:

| Command | Result |
| --- | --- |
| `pnpm build` | Passed; existing large-chunk warnings remain |
| `VITE_BOOK_ENGINE=frames pnpm build --outDir /tmp/tee-phase1-frames-dist` | Passed; separate local build for fallback verification |
| `pnpm check` | Six pre-existing TypeScript diagnostics; no new diagnostics |
| `pnpm test --maxWorkers=2 --minWorkers=1` | 81 passed, 3 baseline failures; all 26 added tests passed |
| Focused book/flag tests | 35 passed, including the original 9 book tests |
| Default development browser QA | 13 checks passed, zero page errors |
| Latest browser QA against the `frames` production build | 14 checks passed, zero page errors; legacy fallback confirmed |

The production-build QA includes the added unavailable catalogue/passport
scenario as well as all original browser checks, existing routes, chapter/stamp
deep links, keyboard navigation, reduced motion, media failure recovery and
all seven verified chapter transitions. The temporary preview was local only.

The unchanged TypeScript diagnostics are the missing MediaPipe dependency,
AdminDashboard votes/voteCount mismatch, missing EcoGuide router and untyped
callback, nullable SDK string argument, and seed script transaction type.
The three unchanged test failures are two submission tests assuming an open
May 2026 deadline and one test lacking an approved teacher database fixture.

The browser harness uses explicit authentication/catalogue/teacher-approval
fixtures. It validates rendering and UI behavior, not production authentication
or database award transactions. Existing tests remain intact; added coverage
protects bindings, status rules, sequential access/revisits, persistence,
renderer fallback and educational routes.

## Next media task

Recover the standalone source/frame export or the seven original Full HD
videos. Probe native dimensions, frame counts, frame rates and timestamps;
verify sequence order and seams; extract without resizing; generate checksums
and measured chapter/resting-frame ranges. Reconcile any mismatch with the
expected 1,673 frames before publishing a manifest. Existing bundled 720p clips
are not suitable Full HD recovery sources. Keep frame media outside the app
bundle and do not upload it during Phase 1.
