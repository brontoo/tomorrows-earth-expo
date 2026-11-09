# Task 14: direct original-book entry

## Final route

`/eco-journey` now imports `FrameTravelBook` directly. It no longer renders
`TravelBook`, checks the rollout engine flag or falls back through the legacy
intro. The redundant delegation branch was removed from `TravelBook`; the
homepage and `/my-journey` retain their existing behavior.

A missing or legacy `VITE_BOOK_ENGINE` was a confirmed reachable path to the
synthetic cover on the previous main source. The live production bundle/settings
could not be inspected, so a stale deployment, wrong build configuration or other
live cause has not been established. This change removes that flag-dependent path
from the route entirely.

The original sequence is the only game presentation. Default entry is frame 0,
`frames/01-AD/f_0000.webp`, at native 1920×1080. Its byte size is 353010 and its
SHA-256 is `7ecd4d5184e62142c5a8d0f6600258514332d45144d30b2c6f947c0f4401fda5`.
The existing immutable media base and version provide defaults when build settings
are absent. Explicit media configuration is retained, including earlier versioned
bases without duplicating the version in the URL.

The existing hand-controls button is available directly on this route, independently
of obsolete preview flags. The camera still starts only from the user's button
click. Model B, checksum verification, permission handling and shutdown are unchanged.
No model or camera is initialized merely by showing the button.

There is no separate cover, Preview chapters action, Contents/index screen or Open
the Book CTA on this route. The closed-book marketing/mission card is removed from
the initial view. The same optional mission panel appears after the user starts
interacting with the real sequence. Compact chapter buttons perform direct jumps
inside the existing player; they are optional navigation, not a preview or gate.
All seven Emirates and all 1,673 integer frame positions remain unrestricted.

## Performance and platform preservation

`FrameBookPlayer`, `FrameScheduler`, `FrameTimeline`, the manifest, source images,
cache/decode policy and gesture runtime were not modified. The last-valid-image
behavior, single canvas/scheduler ownership, RAF input handling, adaptive caches,
strict checksums, Full HD decoding and camera lifecycle remain the Task 12 repair.
Projects, auth, dashboards, mission bindings, rewards, APIs and schema are unchanged.

The decisive regression build explicitly sets `VITE_BOOK_ENGINE=legacy` and
`VITE_BOOK_GESTURES=false`, removes both media settings and uses an empty env directory.
Despite that obsolete configuration it starts at the real frame 0 with the hand
button present, no intro/preview/open CTA and no cover-only marketing panel.
This prevents dependence on Vercel using a particular build command or engine flag.

## Verification

- Production build passes; existing chunk-size notices remain.
- Five media configuration tests pass, including missing settings and versioned bases.
- Full suite: 169 pass, three pre-existing Projects deadline/reviewer failures.
- Type checking: the same five baseline errors; no new diagnostics.
- Chrome browser checks on the obsolete-flags build pass all six boundaries both
  directions, keyboard, mouse, touch, optional Fujairah-first jumps and continuous
  scrubbing, with zero canvas clears/blank samples and stable canvas/scheduler IDs.
- Normal production-build exploration rerun: **24 checks passed**, covering guests, zero-progress students,
  unavailable mission APIs, responsive mobile dimensions and Projects/dashboard UI.
- Browser media/API fixtures are explicit. Bodies are unchanged Full HD reference
  files and use the actual SHA/decode/render pipeline. These checks are not live
  backend or production-media acceptance. No camera was enabled or fabricated.

One initial Chrome student session timed out waiting for its first bitmap decode.
An isolated student retest and the full rerun passed. The cause is not established;
the first result is retained, and the player core was not changed to mask it.

The machine-readable report is `docs/qa/seven-emirates-direct-entry.json`.

## Production release and verification

Task 14 authorizes the main update and existing production release. Use a normal
fast-forward push to main after preserving the pre-change Git reference. This
uses the existing Git-connected deployment configuration; do not create another
Vercel project or perform a duplicate CLI deployment.

The environment has no Vercel credential or local project link. Production-domain
requests are rejected by the cloud proxy with CONNECT HTTP 403, and GitHub status
API reads return Forbidden. A successful Git push cannot establish a successful
Vercel deployment. Project ID, deployment status, runtime logs and live UI remain
unverified until authorized access is available.

After the existing Vercel production build completes, inspect
`https://tomorrows-earth-expo.vercel.app/seven-emirates-release.json` and confirm its
commit equals the released main SHA. Open `/eco-journey` in a fresh browser session:
frame 0 and the hand button should appear without an intro CTA. If that marker or
bundle is older, inspect the existing project's connected repository, production
branch, root directory, build settings and deployment alias. Do not invent a new
cover or another route as a workaround.

The Git tag `rollback/main-before-direct-frame-entry-20261109` preserves the previous
main source. It is not a verified Vercel deployment ID. For an emergency deployment
regression, use the existing project's supported rollback to the verified previous
deployment, then provide a forward fix. Do not force-push, reset records, change
storage policies or restore chapter locks as a permanent solution.

## Files

- `client/src/pages/EcoJourneyPage.tsx`: mount the real continuous presentation directly.
- `client/src/components/book/TravelBook.tsx`: remove redundant gated delegation.
- `client/src/components/book/FrameTravelBook.tsx`: media defaults, manual controls,
  and no marketing/mission card on the closed-book screen.
- `client/src/components/book/frames/frameBookMediaConfig.ts`: existing media defaults
  and compatibility with versioned configuration.
- `server/frameBookMediaConfig.test.ts`: five configuration regressions.
- `scripts/qa-continuous-book.py`: assert no cover card, Preview or Open intro CTA.
- This guide and `docs/qa/seven-emirates-direct-entry.json`: release evidence and limits.
