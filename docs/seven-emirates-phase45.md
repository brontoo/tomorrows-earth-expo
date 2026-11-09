# Phase 4.5 — preservation and real-browser acceptance

Phase 4 was reviewed, built, regression-tested, committed and pushed without
force to `integration/seven-emirates-frame-engine`:

[996a0a2c7bc7767b5101d077c6a2b963c2794a2b](https://github.com/brontoo/tomorrows-earth-expo/commit/996a0a2c7bc7767b5101d077c6a2b963c2794a2b).
Remote HEAD matched after the push. The exact twelve-file Phase 4 inventory and
behavior differences are in [the gesture guide](seven-emirates-gestures.md).
Review found no extra assets, missing imports, unexpected dependency upgrades,
Projects/auth/dashboard changes or educational/backend changes. MediaPipe is
exactly 1.2.2; its integrity is locked by pnpm. Legacy and gesture defaults remain
off/unchanged. There is no production deployment, merge, media write or policy change.

## Evidence and its limits

The user confirmed the earlier 1,674-object publication. This task does not claim
a new complete remote storage audit or physical-camera sign-off.

| Layer | Actual evidence from this cloud environment |
| --- | --- |
| Phase 4 preservation | Commit above pushed; remote HEAD matched |
| Existing application suite | Final Phase 4.5: 141 pass, same 3 baseline failures (144 total); build passes |
| Type checking | Same five baseline errors; no new diagnostics |
| Factory/resource unit tests | 23 gesture tests pass, including 3 new tests of lazy creation and identical GPU/CPU options; mocked SDK only in unit tests |
| Application browser fixtures | Explicit simulated SDK/camera/media; 11 checks passed with actual local Full HD source bytes; not hosted or physical-camera evidence |
| Public Supabase manifest | Attempted, cloud proxy CONNECT denied with HTTP 403 |
| Actual browser model initialization | Attempted with the production factory; CDN loader request failed `net::ERR_CERT_AUTHORITY_INVALID` against the cloud proxy; no recognizer initialized |
| Model host via trusted HTTP client | CONNECT denied with HTTP 403 for Google Storage |
| SDK/CDN resource integrity | SDK module and all four WASM JS/binary files match installed 1.2.2 package bytes |
| Physical camera / hand tracking | Not tested; no synthetic video presented as physical-camera evidence |
| Live initial loading / scrub latency / inference responsiveness | Not measured successfully; no fabricated values or fixture latency substituted |

The failed model attempt's elapsed time is a failed request duration, not a
successful initialization benchmark. The new independent test emits actual
manifest fetch/validation time, app navigation-to-first-frame time, 12 forward/
reverse boundary key-to-display measurements, median/max, and two model creation
times **only when those stages actually succeed**. Boundary measurements occur
after explicit edge-frame fetches and can be warm-cache; automation polling and
transport overhead are included. They are not physical hand-to-screen latency.

## The real acceptance runner

`scripts/qa-real-book.py` is independent of cloud credentials and its proxy. Run
it from a Windows/Linux machine that can access the public hosts. It cannot
substitute local media, SDK, WASM or models: there is no fixture-media option.
Only read-only authentication/progress API responses are controlled to exercise
all unlock states without touching real accounts or completing real missions.
Unexpected API mutations are blocked.

It checks:

1. Projects makes no book-media/model or camera requests.
2. The actual public manifest's exact SHA matches the reviewed local manifest,
   with all 1,673 records, seven ordered contiguous ranges and valid resting frames.
3. All fourteen first/last chapter frames pass browser CORS, MIME, byte size,
   SHA-256 and native 1920x1080 decoding. Bitmaps are closed; no image files are saved.
4. Initial locked chapter behavior and no autoplay. The actual app stays lazy
   about camera/model work before opt-in.
5. All seven deep links display their exact resting frames with matching
   educational headings, followed by all six transitions in both directions.
6. A separate localhost QA page imports `createBookRecognizer` from the actual
   application runtime. An explicit button click creates/closes the real pinned
   model twice, without requesting a camera. It verifies fetched WASM hashes
   against the installed package, records the actual model hash, and compares
   against the prototype's old unversioned model URL if available.

The only production refactor in Phase 4.5 is exporting that same recognizer
factory and referring to it from the existing runtime dependency object. No
recognition settings or interaction thresholds changed. The standalone QA page
exists only as a Playwright interception of a localhost test path, never as an
application/deployed route. Reports always say `physicalCameraVerified:false`.
A zero exit code establishes automated media/model checks, not manual hand QA
or production/staging CSP/camera permission compatibility.

### Windows Chrome and Edge: exact setup

Prerequisites: Git, Node 22 with Corepack, Python 3.12+, installed Chrome/Edge and
normal trusted HTTPS access to Supabase, jsDelivr and Google Storage. Never
turn off TLS verification to work around enterprise/proxy certificate failures.
Use two PowerShell terminals in the Expo checkout. Check out the integration
branch using a clean checkout and the final pushed commit supplied with this task.

Terminal 1 (process-local preview settings only):

```powershell
corepack pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Dependency install failed' }
$env:VITE_BOOK_ENGINE = 'frames'
$env:VITE_BOOK_GESTURES = 'true'
$env:VITE_BOOK_ASSET_BASE_URL = 'https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/'
$env:VITE_BOOK_MEDIA_VERSION = '7e-1bc718ef5e77'
corepack pnpm exec vite --host 127.0.0.1 --port 4174
```

Terminal 2 (external Python environment; no credentials required):

```powershell
$qaVenv = Join-Path $env:TEMP 'seven-emirates-browser-qa'
py -3 -m venv $qaVenv
$qaPython = Join-Path $qaVenv 'Scripts/python.exe'
& $qaPython -m pip install playwright==1.62.0
if ($LASTEXITCODE -ne 0) { throw 'Browser test dependency install failed' }
& $qaPython scripts/qa-real-book.py --channel chrome --report "$env:TEMP\seven-emirates-real-chrome.json"
if ($LASTEXITCODE -ne 0) { throw 'Chrome real acceptance incomplete; inspect its JSON report' }
& $qaPython scripts/qa-real-book.py --channel msedge --report "$env:TEMP\seven-emirates-real-edge.json"
if ($LASTEXITCODE -ne 0) { throw 'Edge real acceptance incomplete; inspect its JSON report' }
```

These commands use installed browsers, not fake cameras. Without `--channel`,
install Playwright Chromium with `python -m playwright install chromium`.
Terminate the preview and close its terminal to discard the preview variables;
do not copy them into production settings. Reports contain public URLs/hashes,
test fixtures and timings, not credentials or camera images. Review any failing
stage separately. A cloud-blocked run is not a passing outside-browser test.

## Expected chapter mapping (local manifest; live hash match still required)

| Emirate | Start inclusive | End exclusive | Resting frame |
| --- | ---: | ---: | ---: |
| Abu Dhabi | 0 | 239 | 238 |
| Dubai | 239 | 478 | 477 |
| Sharjah | 478 | 717 | 716 |
| Ajman | 717 | 956 | 955 |
| Umm Al Quwain | 956 | 1195 | 1194 |
| Ras Al Khaimah | 1195 | 1434 | 1433 |
| Fujairah | 1434 | 1673 | 1672 |

Boundary pairs: 238/239, 477/478, 716/717, 955/956, 1194/1195, 1433/1434.
The runner reads these from the fetched manifest rather than assuming clip length.

## Resources, original-model comparison and same-origin assessment

See [SDK resource checksums](qa/seven-emirates-sdk-resources.json) for the exact
installed/CDN-matching SHA-256 and byte lengths. The package declares Apache-2.0.
Its module, loaders, WASM files and headers have not been modified or vendored.
SDK bytes were checked with the environment's trusted HTTP client; this does not
prove Chromium trusts the cloud proxy or the model is reachable.

Phase 4 replaced the prototype's unversioned model URL
`https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task`
with the official pinned version-1 URL
`https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`.
The original and pinned model bytes could not be compared here. Do not assert
byte equivalence. The real runner records hashes for review and fails if a
successful comparison finds different bytes. Recognition quality still requires
physical-camera acceptance. The two intentional interaction differences from
the prototype remain the fixed pinch dwell timer and held-pinch priority; no
additional simplification or threshold change was introduced in Phase 4.5.

Cloud policy/certificate failures are not evidence that public model hosting is
unreliable for ordinary browsers. Same-origin hosting is a reasonable separate
staging option if real-browser reports show CDN/CORS/CSP/reliability problems:

1. Fetch the **same** version-1 model and package-matching WASM files through a
   trusted connection outside this restricted environment; record/lock their
   hashes and compare the original model. Do not invent a checksum or substitute
   a different model. Current model SHA remains explicitly unknown here.
2. Confirm/retain the model's upstream model-card/license terms separately from
   the npm package's Apache-2.0 declaration. Preserve required LICENSE/NOTICE and
   copyright material for every hosted component. Do not assume the npm license
   alone covers every bundled model asset.
3. Stage immutable same-origin keys such as `/hand-models/gesture-recognizer/v1/`
   and `/hand-runtime/tasks-vision/1.2.2/wasm/`, with recorded hashes, correct MIME
   types and immutable caching. Keep large assets out of source Git where practical.
4. Review a separate explicit URL-configuration change and repeat the actual
   browser tests. Keep current model behavior and lazy loading; fail clearly
   rather than silently selecting another model or weakening TLS/CSP.

No such assets, URL switch, deployment, credentials or model substitution were
introduced in this task.

## Physical-camera acceptance: Windows Chrome AND Edge

Use a genuine nonproduction app preview with its normal development backend and
test student/teacher accounts for these tests. The automated runner's read-only
fixtures exercise UI progression only and cannot sign off real authentication,
mission writes or teacher verification. Keep production settings untouched.

- Before enable: no camera prompt, model initialization, active stream or game
  media on Projects. On the game, confirm Supabase requests and a 1920x1080 canvas.
- Deny permission, retry with Allow, disable/re-enable repeatedly, hide the tab,
  navigate to a mission and Projects, and return. Confirm tracks/indicator stop,
  no automatic resume, no duplicate recognizers/loops, and no retained hover.
- Fist: wait 135ms without a jump, sweep left/right, and release. Confirm smooth
  proportional forward/reverse frames and immediate stop with no inertia.
- Point/pinch: mirror and smoothing feel correct; one action per pinch/release,
  including a long held pinch and rapid repeats. Locked/disabled controls and
  account/audio/camera/header controls must never activate. Check available
  mission links, chapters, Contents and stamps.
- Exercise every boundary pair above in both directions with appropriate verified
  progress, and attempt each while locked. The selected educational chapter and
  drawn frame must agree; no navigation creates points/stamps/completion.
- Test mouse, touch, keyboard and slider with camera off and during takeover from
  fist input; test reduced motion, returning completed chapters and missing
  mission data. Complete the experience without using a camera.
- Compare with the original prototype under the same camera, lighting and display.
  Record any sensitivity, jitter, cursor, pinch or boundary synchronization mismatch.

For real hand-tracking responsiveness, use Chrome/Edge Performance tools with
screenshots disabled (no camera image recording). Record only timing data while
performing a 30-second fist/pointer/pinch session. Report device/browser/camera,
initial frame time, frame-request-to-display timing, inference/main-thread long
tasks and pauses. Separate cold/warm cache measurements and physical observations
from the automated key-to-display numbers. No physical/inference performance
measurements have been made in this cloud task.

## Remaining gates

Run the independent real-media/model acceptance outside the restricted cloud,
review its hashes/timings and original-model comparison, then complete physical
Chrome/Edge acceptance with real nonproduction educational accounts. Resolve or
separately track the existing baseline type/test failures. Do not activate the
frame engine in production or merge into main based solely on fixture tests.

## Phase 4.5 file inventory

Modified only `client/src/components/book/gestures/HandTrackingRuntime.ts` to
export/reuse the existing factory. Created:

- `scripts/qa-real-book.py`
- `server/bookGestureResources.test.ts`
- `docs/qa/seven-emirates-sdk-resources.json`
- `docs/qa/seven-emirates-phase45-cloud-result.json` (blocked-run evidence)
- `docs/seven-emirates-phase45.md`

No changes to production settings, the media manifest, frames, workflows, old
renderers, auth, educational state/reward logic, Projects or database/storage policies.
