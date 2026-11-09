# Seven Emirates hand controls — Phase 4

Implementation stays on `integration/seven-emirates-frame-engine`. Production
continues to default to `legacy`; gestures default off. No media, Supabase
credentials/policies, mission procedures, Projects, dashboards or routes changed.
No deployment or production activation is part of this phase.

## Preview

Use an isolated preview with these environment settings (do not set production):

```sh
VITE_BOOK_ENGINE=frames \
VITE_BOOK_GESTURES=true \
VITE_BOOK_ASSET_BASE_URL=https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/ \
VITE_BOOK_MEDIA_VERSION=7e-1bc718ef5e77 \
pnpm dev:frontend -- --port 4174
```

Open `/eco-journey?chapter=abu-dhabi`. The standalone frontend requires its
existing development API proxy/backend for real authentication/progress. The
QA script below explicitly supplies API fixtures; it never updates live progress.
Build settings are captured by Vite at build time. To test a build independently,
use `pnpm exec vite build --outDir /tmp/seven-emirates-preview` with the same
variables, then `pnpm exec vite preview --outDir /tmp/seven-emirates-preview`.
Do not change any tracked `.env` or production configuration to enable this.

Only exact `VITE_BOOK_ENGINE=frames` plus `VITE_BOOK_GESTURES=true` enables the
hand-controls UI, and only after a valid manifest is available. Frame asset
failure retains legacy fallback. Disable the gesture flag or omit both flags to
roll back; no schema or media rollback is needed.

## Original behavior and boundaries

Reference: `brontoo/7E-Book` provenance commit
`1bc718ef5e770033a3f00f398223abce01052fb1`, including `gesture-controller.mjs`,
`gesture-logic.mjs`, CSS, HTML, player interaction and all original gesture tests.

- `GestureClassifier.ts` preserves original scale-independent landmark math.
- `BookGestureController.ts` ports the prototype's state machine: 135ms fist
  stability, confidence 0.58, 425 frames/camera width, 0.014 deadzone, 0.38 fist
  smoothing; pointing confidence 0.51 or original geometric fallback, mirrored
  inset 0.10 pointer mapping, smoothing 0.35; pinch close/release 0.43/0.64,
  stable dwell 90ms, cooldown 530ms, pointer transition grace 430ms.
- Fist anchoring occurs only after stability. Left advances/right reverses, with
  no inertia or autoplay. Release/loss/manual input immediately discards anchors.
- Two correctness fixes: the original pinch dwell timestamp was reset every
  sample, preventing stable selection; it now starts once per candidate. A held
  pinch keeps pointer priority after the transition grace expires, preventing
  its occasional `Closed_Fist` classification from scrubbing the book. One
  activation per full pinch/release cycle is enforced even on disabled targets
  or during cooldown. The pointer hides immediately on tracking loss.
- The frame player's `BookFrameInput` port reads fresh interactivity and drag
  guards; each seek uses the same `restrictFrame` function as ordinary input.
  It cannot cross a locked gap, skip a chapter, award stamps or write progress.
  `TravelBook` still supplies allowed ranges and rechecks chapter requests.
- Hit testing uses an explicit `data-book-gesture` allowlist inside the mounted
  book and visible viewport. Disabled, locked, hidden and unrelated controls are
  excluded. Pinch invokes only that opted-in button/link's existing React action;
  it does not dispatch global synthetic pointer events. Book navigation,
  available mission links and chapter controls are opted in. Account/dashboard,
  audio and camera/permission buttons are not. The slider stays a normal physical
  and keyboard input; gesture fist input uses the player API directly.
- Physical pointer, touch, wheel and keyboard input take precedence with a
  650ms handover window; physical dragging blocks hand seeks for its duration.
  All inputs retain current chapter restrictions. There is no camera requirement
  to play the game, and reduced motion remains entirely input driven.

## Camera ownership, resources and privacy

`HandTrackingRuntime.ts` owns exactly one active stream, recognizer and throttled
recognition loop per mounted book. `GestureControls.tsx` owns that runtime and its
listeners; it also exports `GesturePointer`. The old `GestureContext` and
`GestureModeToggle` are not mounted or subscribed by the book, so their older
handlers do not compete. No global gesture script/provider was added to App or
Projects. React effect initialization installs listeners only; camera/model work
begins only from the explicit **Enable Hand Controls** button.

Pinned resources:

- npm `@mediapipe/tasks-vision` **1.2.2**, exact version plus lockfile integrity;
  this matches the original prototype's SDK version. Lazy dynamic import.
- Matching WASM:
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm`
- Version 1 recognizer model:
  `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`
- Original one-hand/confidence 0.55 options; GPU with CPU fallback; 68ms minimum
  inference interval and new-video-frame checks. No independent worker/global
  loop competes with it. Real-device inference performance still needs QA.

The compact preview mirrors the camera and aligns optional skeleton landmarks.
Camera pixels are used locally by MediaPipe only: no image upload, capture,
recording or persistence code is added. Network requests download SDK/WASM/model
and book imagery; they do not transmit camera images. Disable, route change,
profile remount, tab hiding, page hide, camera disconnection and
recognition errors stop tracks and close the recognizer. No automatic resume.
Generation checks dispose late model/camera promises after cancellation. The
preview video and all global listeners are released on unmount. Escape disables
camera while focus is in the book.

## Validation and limits

- `pnpm build`: passes; existing large-bundle warnings remain. A separate frame
  preview build with the hosted asset configuration also passes.
- `pnpm check`: five baseline diagnostics remain (AdminDashboard votes property,
  EcoGuide API and implicit type, SDK nullable string, seed transaction type).
  The former missing MediaPipe dependency error is resolved. No new diagnostics.
- `pnpm test --maxWorkers=2 --minWorkers=1`: **138 pass, 3 baseline failures**
  out of 141; the existing expired-deadline failures (2) and unapproved teacher
  fixture (1) remain. All **20 new gesture tests pass**.
- New unit tests cover original math, stable anchoring, sensitivity, immediate
  release/loss, locked ranges/reopened chapters, single pinch cycles/cooldown/
  hysteresis, scoped targets, default flags, camera denial, repeated cycles,
  asynchronous unmount races, inference throttling and cleanup.
- Chromium fixture QA passes camera opt-in, fist locking, mouse handover,
  keyboard/slider, native touch, pointer loss, single scoped React pinch
  activation without stamps, denial recovery, route cleanup and no camera/UI on
  Projects. API, SDK and media delivery are explicitly simulated for these
  lifecycle/interaction checks; actual Full HD source bytes are read from the
  external prepared folder, not copied into Git.
- Live hosted-media browser QA was attempted with **no media substitution**.
  This cloud proxy returned HTTP 403 / CONNECT denied for the Supabase manifest
  and the Google model host. The application could not validate the live
  manifest here; **remoteVerified:false**. This does not contradict the user's
  confirmed previous 1,674-object publication, but provides no new remote
  delivery or actual MediaPipe/camera validation.

Run the repeatable Chromium checks against a configured preview:

```sh
python scripts/qa-book-gestures.py --base-url http://127.0.0.1:4174 \
  --report /tmp/gesture-live.json
# Explicit simulation only; NEVER counts as remote acceptance:
python scripts/qa-book-gestures.py --base-url http://127.0.0.1:4174 \
  --fixtures-root /absolute/external/prepared-media --report /tmp/gesture-fixtures.json
```

The fixture mode intercepts the SDK/camera and media responses explicitly; it is
QA code, never a production runtime option. Full physical-camera interaction and
real-device sensitivity/latency cannot be established by those fixtures.

## Chrome / Edge manual acceptance before production consideration

1. Use a nonproduction preview with the four settings above and real API access.
   Confirm real Supabase image requests, 1920x1080 decode and no camera prompt
   before **Enable Hand Controls**. Allow the CDN and model domains as needed.
2. Enable; verify one browser camera indicator, mirrored live preview, aligned
   skeleton and understandable permission status. Deny once, then allow/retry.
3. Hold a fist briefly: no initial jump. Move left/right: proportional forward/
   reverse frames; release: immediate stop. Try the same against chapter locks
   and after unlocking a chapter through the existing verified mission workflow.
4. Point and pinch available chapter and mission controls. Hold for several
   seconds: only one action; release/re-pinch for another. Locked chapters and
   header/account/audio/camera controls must not activate. Confirm zero rewards
   from navigation and no change to teacher verification rules.
5. Switch to mouse drag, touch, arrows, Home/End and slider while hands are visible.
   Confirm no competing seeks, cursor hides on tracking loss and completed
   chapters reopen correctly. Test bright/dim light and desktop/mobile sizes.
6. Disable/re-enable repeatedly; hide the tab, navigate to a mission and Projects,
   and unplug the camera. Confirm indicator/tracks stop and camera never restarts
   automatically. Test reduced-motion preference and complete the game without
   enabling a camera.

Remaining gates are live hosted-media/model access, physical-camera Chrome/Edge
QA, real-device latency and chapter-boundary synchronization checks, and the
existing baseline repository failures. No production activation is authorized by
this phase. Advancing the integration branch also intentionally invalidates the
old publishing workflow's exact Expo HEAD guard; a future republish would need a
separate reviewed pin update, not a bypass of that guard.

## Exact file inventory

Created:

- `client/src/components/book/gestures/GestureClassifier.ts`
- `client/src/components/book/gestures/BookGestureController.ts`
- `client/src/components/book/gestures/HandTrackingRuntime.ts`
- `client/src/components/book/gestures/GestureControls.tsx` (includes GesturePointer)
- `client/src/components/book/gestures/gestures.css`
- `server/bookGestures.test.ts`
- `scripts/qa-book-gestures.py`
- `docs/seven-emirates-gestures.md`

Modified:

- `client/src/components/book/TravelBook.tsx`
- `client/src/components/book/frames/FrameBookPlayer.tsx`
- `package.json`
- `pnpm-lock.yaml`

`App.tsx`, old gesture components/context, Projects/auth/dashboard code, mission
bindings/procedures, database files, image manifest and all media are unchanged.
