> Historical Phase 5A audit. Superseded by Task 10: Model B is owner-approved (Chrome 21/21), all Emirates are freely accessible, and no further A/B testing is required. Use `seven-emirates-staging.md` for the current release candidate.

# Phase 5A — controlled model compatibility review

The game, gesture classifier/controller, thresholds, frame scheduler, input
mapping, mission bindings/locks, routes, rewards and all Full HD media are
unchanged. Legacy remains the production engine default. The current version-1
model remains the camera runtime default; this phase does not select a new
production model, deploy, or merge into main.

## Confirmed evidence versus remaining unknowns

The owner supplied these confirmed results from
[run 42595276281](https://github.com/brontoo/7E-Book/actions/runs/42595276281):
all 1,673 Full HD records, 14 edge samples, both directions of all six transitions,
real Supabase delivery, two actual recognizer initializations/closes, and actual
SDK/WASM verification passed. The sole recorded failure was differing model
bytes. REST logs are inaccessible from this cloud, so this is explicitly
**owner-confirmed CI evidence**, not a new independent reproduction here.

| Variant | Exact SHA-256 from that run |
| --- | --- |
| A: original prototype | `a966b1d4e774e0423c19c8aa71f070e5a72fe7a03c2663dd2f3cb0b0095ee3e1` |
| B: current version 1 | `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482` |

The source URLs are recorded in `GestureModels.ts` and the inspection tool. The
current model initialized via the earlier URL-based factory in that CI run. Both
A and B still require new actual initialization through this phase's verified-byte
buffer factory; the older CI pass does not prove the new buffer path. No physical-camera comparison,
confidence/accuracy statistics or gesture latency measurements were performed
here. No behavioral superiority is inferred from SHA differences or SDK version.

This cloud still returns CONNECT 403 for both model URLs, so downloaded-byte
metadata/category/component inspection cannot be independently completed here.
The failed local inspection is retained in
`docs/qa/seven-emirates-model-compatibility.json`, separately from the CI evidence.
No size, quantization, category inventory or changed-weight claim is fabricated.

## Runtime and production safety

`GestureModels.ts` declares only the two fixed URLs and independent hashes.
On explicit camera/model enable, the runtime downloads the selected model with
credentials omitted, verifies SHA-256, and passes verified `modelAssetBuffer`
bytes to MediaPipe. The identical bytes are copied for GPU/CPU attempts; CPU
fallback never changes models. Wrong hashes, missing resources or disallowed
selection fail before recognizer creation/camera access. No selection/render
starts loading. SDK stays exactly **1.2.2**, matching WASM and existing options:
VIDEO, one hand, detection/presence/tracking confidence 0.55. Original fist,
pointing, pinch, smoothing, hysteresis and frame restriction logic is untouched.

A/B selection requires **all** of:

- A real Vite development/HMR module (`import.meta.hot` present).
- `import.meta.env.DEV === true`.
- `VITE_BOOK_MODEL_AB=true`, `VITE_BOOK_ENGINE=frames`, `VITE_BOOK_GESTURES=true`.

Why the extra dev-server requirement: the existing local `.env` sets
`NODE_ENV=development`, which caused Vite's DEV flag to stay true in a production
build during the safety test. DEV alone was insufficient. The final guard also
requires the dev-server-only HMR context, which is removed from built output.
A browser test explicitly builds with all preview flags set and verifies the
built app still has no A/B selector and remains on B. No `.env` was edited.

The selector is disabled while camera initialization or tracking is active.
Disable Camera, change A/B, then explicitly enable again. Switching clears old
controller state and disposes the previous runtime; it does not start another
camera. No query-string URL, arbitrary model URL or persisted model preference
can silently override production. `createBookRecognizer('prototype')` also rejects
outside the gated development preview, independently of the UI.

## Inspect exact artifacts before physical comparison

The standard-library tool hashes both downloads against the recorded SHA before
examining any metadata. It does not extract model binaries into Git:

```sh
python scripts/inspect-gesture-models.py --report /tmp/book-model-components.json
```

Windows: use a report path under `$env:TEMP` instead of `/tmp`. If the exact files
were already downloaded outside the repository, pass `--prototype <file.task>`
and `--current <file.task>`; the same hash checks remain mandatory.

The report includes ZIP component names, sizes, SHA-256, nested task/TFLite
payloads, TFLite file identifiers and associated label text when present. It
compares actual component payloads separately from outer archive hashes. Category
labels are reported per source component so handedness labels cannot be confused
with gesture classes. Absence of readable labels remains unknown, not an inferred
category list. The controller specifically requires `Closed_Fist` and
`Pointing_Up`; actual bundled categories must be checked in the report and SDK.

Interpretation must remain conditional until actual component reports exist:

| Potential changed component | What to evaluate physically |
| --- | --- |
| Canned/custom classifier or gesture embedder | Fist/point class accuracy, confidence margins around 0.58/0.51, false detections |
| Hand detector/landmarker | Jitter, tracking loss/reacquisition, stability of wrist/knuckle normalization |
| Landmark output differences | Pinch close/release accuracy despite unchanged 0.43/0.64 ratios, pointer smoothing |
| Compute/quantization differences | Initialization and inference responsiveness on the same device |
| Outer packaging/metadata only | Different hashes may contain identical TFLite payloads; do not assume different behavior |

ZIP inspection alone cannot establish SDK compatibility or functional accuracy.
The owner launcher requires actual browser creation/close of **both** variants
with SDK 1.2.2, then requires human gesture comparison. No thresholds are adjusted
just to make one model appear better.

## Windows owner-ready A/B preview

Use Git, Node 22/Corepack, Python 3.12+ and installed Chrome/Edge. Use a fresh Expo
checkout; never reset an existing working tree. Check out the exact Phase 5A
integration commit supplied in the final task response:

```powershell
git clone --filter=blob:none --no-checkout https://github.com/brontoo/tomorrows-earth-expo.git tomorrows-earth-expo-model-ab
git -C tomorrows-earth-expo-model-ab sparse-checkout set --cone api client docs drizzle media patches scripts server shared
git -C tomorrows-earth-expo-model-ab fetch --no-recurse-submodules origin integration/seven-emirates-frame-engine
# Replace REVIEWED_PHASE_5A_SHA with the final response's exact commit.
git -C tomorrows-earth-expo-model-ab checkout --no-recurse-submodules --detach REVIEWED_PHASE_5A_SHA
cd tomorrows-earth-expo-model-ab
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\start-book-model-ab.ps1 -ExpectedCommit REVIEWED_PHASE_5A_SHA -Browser chrome
```

Repeat the final command with `-Browser msedge`. RemoteSigned is process-only;
follow your organization's script policy, never disable HTTPS certificate checks.
The launcher refuses an unexpected HEAD, tracked modifications or occupied port
4174. It installs the frozen pnpm dependencies and external Python test environment,
sets preview flags only for its process, and starts localhost Vite.

The launcher automatically:

1. Downloads/verifies/inspects both exact models; saves `model-components.json`.
2. Runs `qa-real-book.py --model-variant current` and `--model-variant prototype`
   against real Supabase images and actual SDK/WASM/model responses. Both must
   initialize and close twice and pass real media before the owner session opens.
   The separate known mismatch/manual gates intentionally keep release status red;
   a technical pass is not misrepresented as production approval.
3. Opens the genuine Chrome/Edge camera A/B session with an owner checklist panel.
   Authentication/progress are clearly labelled read-only fixtures; **media,
   models, SDK, WASM and camera are real**. All non-read requests are blocked.
4. Saves model-specific owner answers, camera lifecycle, frame timings and limited
   JS heap observations automatically. No camera video/images/landmarks/device
   IDs are recorded or uploaded. Stops the preview and restores flags on exit.

Reports are under:
`C:\Users\YOUR-NAME\Seven-Emirates-Model-AB-Reports\<timestamp>-<browser>`.
Physical answers are self-reported and remain subject to review; the tool does
not automatically mark physical compatibility verified. These fixture sessions
cannot approve real educational writes. A separate genuine nonproduction
student/teacher acceptance is still required.

Manual developer preview alternative (same public media settings as before):

```sh
VITE_BOOK_ENGINE=frames VITE_BOOK_GESTURES=true VITE_BOOK_MODEL_AB=true \
VITE_BOOK_ASSET_BASE_URL=https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/ \
VITE_BOOK_MEDIA_VERSION=7e-1bc718ef5e77 pnpm dev:frontend -- --port 4174
```

Without the owner harness, use the normal nonproduction API/backend. Never change
production flags. Use the **development server**, not `vite preview` built output.
The pre-existing 7E-Book Actions workflow remains pinned to 07f4e1f and has not been
changed; it does not yet exercise this new A/B commit. A future workflow pin update
requires separate review after this integration commit is reviewed.

## Identical-condition Chrome/Edge physical comparison

Use the same physical webcam, lighting, position, viewport, chapter, initial frame
and student unlock state. Test A→B, then reverse B→A to reduce warm-up/order bias.
Only one camera/model may be active. Disable Camera before every model change.
Collapse the owner panel while gesturing and use the physical mouse on the panel.

For **each** variant and browser:

1. Start at the same frame/chapter. Enable; allow the camera explicitly. Record
   download/hash/SDK-to-permission timing separately from time spent answering the
   browser permission prompt. Report cold and warm attempts separately.
2. Perform at least 10 fist acquisitions: count missed/false detections and any
   initial jump. Move left/right the same distance at slow/normal speeds. Check
   proportional response, jitter, immediate release stop and no inertia.
3. Point at the same five game targets: compare mirroring, smoothing, targeting
   error and loss-of-hand recovery. Do not claim camera-motion latency from DOM
   timestamps alone.
4. Perform at least 10 pinch/release cycles and one 3-second hold. Count missed
   selections, extra clicks and cooldown behavior. Disabled/locked/unrelated
   controls must never activate.
5. Exercise 238/239, 477/478, 716/717, 955/956, 1194/1195 and 1433/1434 forward/back
   with allowed progress, then try locked mode. Labels must match frames and
   no gesture may award rewards. Verify mouse/touch/keyboard/slider takeover.
6. Lose/reacquire tracking, deny/retry permission, disable/enable repeatedly,
   hide the tab and leave/return to the game. Confirm one stream and complete
   shutdown, no automatic restart or retained cursor.
7. Fill the per-model owner panel answers and keep a separate count worksheet for
   detections/misses/duplicates, loading times and subjective responsiveness. Save
   only non-sensitive numeric observations, never webcam recordings.

The report's `loadingToPermissionStatusMs` measures observed UI status intervals
including download/hash/SDK work. Missing/batched permission states yield no
isolated number. Frame request/display timings exclude camera capture and
inference delay; JS heap excludes native/GPU/WASM total. Do not use them as a
physical hand-to-screen benchmark. Physical performance remains **unmeasured**
in this cloud task.

## Acceptance stages and model recommendation

`qa-real-book.py` now reports these independently:

1. Live media/educational chapter presentation verification.
2. Selected model initialization/cleanup.
3. Original/current byte comparison, actual per-model SHA and selected variant.
4. Functional gesture compatibility — manual, not inferred from initialization.
5. Physical-camera acceptance — manual, not synthetic video.
6. Genuine nonproduction educational workflow acceptance — not fixture progress.

Successful technical stages remain visible even when the mismatch gate is red.
The unequal artifacts and manual gates are never suppressed to obtain green CI.
CLI release acceptance remains nonzero while those gates remain.

**Provisional recommendation:** prefer the exact original A artifact if both
variants initialize and physical comparison proves A viable with at least the
prototype's intended behavior. There is currently insufficient physical evidence
to select a final model. Keep B as the unchanged runtime default and production
legacy/off until sign-off. If B is ultimately chosen, explicitly record observed
behavioral differences and manual approval; do not infer compatibility from SDK
1.2.2 alone.

If A is approved, do not rely permanently on its mutable unversioned URL. The SHA
pin currently guarantees identity by refusing changed bytes, but not availability.
Stage the **same verified a966… artifact** under an immutable content-addressed
object key or same-origin release asset, retain its hash and size, verify original
model-card/license/NOTICE requirements independently of the SDK's Apache-2.0
license, and repeat both browser initialization and camera tests. No hosting,
Supabase bucket, credentials or licensing claims are changed by this task.

## Files and validation

Modified: `GestureControls.tsx`, `HandTrackingRuntime.ts`, `gestures.css`,
`server/bookGestureResources.test.ts`, `scripts/qa-real-book.py`.
Created: `GestureModels.ts`, `server/bookGestureModels.test.ts`,
`scripts/inspect-gesture-models.py`, `scripts/qa_model_reporting.py`,
`scripts/qa_ab_common.py`, `scripts/qa-book-model-ab.py`,
`scripts/start-book-model-ab.ps1`, `scripts/test-model-tools.py`, this guide and
`docs/qa/seven-emirates-model-compatibility.json`.

Build, full regression, type-check, targeted model tests, inspection/reporting
unit tests, browser dev/build gating and real-resource attempts are recorded in
the final task response. Windows launcher syntax is checked with PowerShell on
Linux; actual Windows/camera execution is not claimed. Existing baseline errors
are not silently corrected or reported as passes. No controller, scheduler,
educational/backend, package versions, production flags or media files changed.

Final local validation: default build and explicit built-preview safety build
passed; the full application suite has 147 passes and the same three baseline
failures (150 total). All 29 targeted gesture/model tests and three Python
inspection/reporting tests passed. Type checking retains the same five baseline
diagnostics. Chromium UI-only checks used explicitly local media fixtures and
no fake model bytes: dev A/B visibility, selection laziness, no camera on blocked
model, and built-output exclusion passed. These are not actual SDK/camera
compatibility results. Both real-resource browser variants and the binary
inspector were attempted and remained blocked by the cloud proxy. No physical
accuracy or response-time numbers are claimed.
