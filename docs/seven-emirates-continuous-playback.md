# Task 12: original entry and continuous frame-player repair

## Release status

Repair branch: `fix/original-book-continuous-frames`, based on fetched main
`6300d6f22355596c21e962eae2e4b6d54a861915`. This contains the approved integration
and production build configuration. The worktree was clean before the repair.

**This is a tested repair candidate, not a production-verified deployment.** The
cloud proxy rejects the actual production domain and Supabase with CONNECT HTTP 403. No Vercel credential, project link, owner/team or previous deployment ID is
available. The real-media browser attempt also failed before loading the manifest.
No main push, deployment, promotion, new project or storage change was performed.
See the Task 11 production handoff for the missing access settings. Once available,
verify the existing project/domain and deployment reference, complete live-media
and physical-camera acceptance, then merge normally and monitor production.

## Confirmed defects and their repair

1. The legacy cover/Contents reducer controlled `/eco-journey` entry. It now routes
   explicitly configured frames mode to a continuous presentation adapter. Default
   entry is **frame 0**, `frames/01-AD/f_0000.webp`, 1920×1080, 353010 bytes, SHA-256
   `7ecd4d5184e62142c5a8d0f6600258514332d45144d30b2c6f947c0f4401fda5`.
   There is no BookScene, Open button, GSAP opening phase or full-screen Contents
   in this route. Seven compact jumps remain optional. Explicit chapter deep links
   still open the corresponding exact resting frame. The homepage and `/my-journey`
   keep their existing presentation/achievement flow.
2. FrameBookPlayer cleared the canvas and nulled its displayed frame before a new
   chapter's image arrived. It now paints replacements without clearing. A verified
   frame-0 Blob image supplies the original-image placeholder until initial canvas
   paint. The placeholder is removed afterwards. Initial loading/error text is
   nonblocking; ordinary loading never replaces the player with BookScene.
3. `onChapter -> select -> turning -> interactive=false` coupled visual boundary
   changes to educational presentation phases. The continuous adapter receives
   displayed chapter notifications directly, without that reducer or a busy phase.
   Explicit chapter jumps are separate commands; chapter-label updates cannot seek,
   recreate the scheduler or unmount the canvas. Labels describe displayed imagery,
   never an unfulfilled navigation request.
4. Every new requested frame invalidated the previous React loading effect. The
   scheduler aborted active work outside its tiny new window, sometimes preempting
   the entire active pool, and discarded already-decoded superseded images. Input
   arriving faster than a load could prevent presentation from advancing. The new
   imperative timeline coalesces input once per animation refresh, preserves the
   latest integer destination and paints useful ready frames toward that intent.
   Settled targets cannot be overwritten by late responses. Active transfers are
   reused, stale **unstarted** jobs are discarded, and verified bytes remain cached.
5. The manifest hook fetched/decoded frame 0, closed it, then the player loaded it
   again. Initialization now verifies its bytes once and seeds the player cache.
   The original-image placeholder uses those same verified bytes. Full SHA-256,
   byte-size and decoded 1920×1080 checks remain mandatory.
6. Painting depended on React state/effect commits for each seek. Canvas work now
   runs imperatively under requestAnimationFrame. Status updates are bounded to
   100 ms except exact-settled/error updates; chapter notifications fire only when
   the displayed chapter changes. Steady fist/idle UI state no longer causes an
   identical React view update at every inference. Pointer/pinch changes stay live.

The timeline does not autoplay. Progressive catch-up is allowed only toward the
last user-requested destination. All integer positions [0,1673) remain seekable,
with all six boundaries reversible. No mission data, login or reward can restrict
that range. Mission links retain the original slugs and ordering. Progress queries
and stamps remain server-derived; navigation saves profile-local book position
only. Points, teacher procedures, schema, APIs and Projects code are unchanged.

The owner's recording intervals (5.23 s, 3.70 s and 1.50 s) are supplied findings,
not measurements made from an attached video in this task. The attachment supplied
here was the task text. A local reproduction independently confirms the clearing
fault described below.

## Cache, queue and resource ownership

The standalone `7E-Book/app.js` reference uses 30 image entries, seven requests and
11/7 prefetch. Its local-file transport does not incur the same hosted-byte pipeline.
This repair preserves the gesture classifier, sensitivity, direction and thresholds.

| Device hint                  |      Decoded budget | Encoded budget | Requests max | Ahead / behind | Decodes max |
| ---------------------------- | ------------------: | -------------: | -----------: | -------------: | ----------: |
| Save-Data or ≤2 GiB hint     | 4 frames / 31.6 MiB |          1 MiB |            2 |          2 / 1 |           1 |
| Mobile/tablet otherwise      |        8 / 63.3 MiB |          2 MiB |            3 |          4 / 2 |           1 |
| Desktop ≤4 GiB hint          |       10 / 79.1 MiB |        2.5 MiB |            4 |          5 / 3 |           1 |
| Desktop unknown/intermediate |      16 / 126.6 MiB |          4 MiB |            5 |          9 / 5 |           2 |
| Desktop ≥8 GiB hint          |      30 / 237.3 MiB |        7.5 MiB |            7 |         11 / 7 |           2 |

Hints select an initial bounded policy; mobile identification includes wide tablets.
Decoded images cost 1920×1080×4 = 8,294,400 bytes each. Canvas memory, temporary
placeholder decoding, in-flight buffers/decodes, browser overhead and the optional
recognizer are additional; the table is not a whole-process memory guarantee.
A genuine allocation failure reduces future cache/prefetch/concurrency budgets
without reducing image resolution. Missing device-memory hints use conservative
fallbacks. JS heap reporting does not measure native bitmap or GPU allocations.

Foreground jobs lead both queues. Speculation leaves a request slot available for
new seeks; active work is bounded and retained rather than repeatedly aborted.
Separate decode concurrency prevents network parallelism from launching seven
simultaneous image decodes. Distant obsolete transfers can supply verified encoded
cache entries without consuming decode CPU. Frames that provide useful progress
between the displayed frame and latest intent remain eligible for decoding.
Nearest ready frames advance toward the target, including during continuous input.
All six chapter boundaries share the same window, so nearby crossing frames warm
normally. Reverse movement reuses decoded or verified encoded cache entries.

Leases protect a bitmap while the renderer owns it. Eviction/disposal waits for
lease release; stale asynchronous bitmaps are closed, and drawn canvas pixels do
not depend on retaining a bitmap indefinitely. Initial placeholder Blob URLs are
revoked on unmount. Camera opt-in and track cleanup remain the existing runtime's
responsibility. Diagnostics also stop when leaving the continuous book.

## Measurement methodology and results

`docs/qa/seven-emirates-continuous-playback.json` contains the exact inventory,
measurements, test scopes and retained performance outlier.

Tests use official SHA-verified Linux Google Chrome 157.0.8103.38 and Microsoft
Edge 157.0.4341.42 extracted into isolated `/tmp` directories. Mobile coverage is
390×844 Chrome emulation with native touch dispatch, not a physical handset.
The baseline application build has the same source tree as pre-repair main;
it is not a downloaded copy of the inaccessible live deployment.

API replies are explicitly read-only guest/student/role fixtures. Full HD bodies
come from the existing external reference files and pass the real integrity and
decode pipeline. In the delayed fixture test, frame 239's response is held until
the first boundary seek, then delayed 400 ms. A second test delays it 3500 ms.
No source frames were resized, generated, modified or published.

Pixel-continuity probes sample five canvas points and canvas identity while also
counting actual clear calls. The original Chrome build produced **13 clears**,
**27 blank samples**, and an observed **475.9 ms black interval** with the 400 ms
injected delay. The repaired Chrome, Edge and mobile runs have **zero clears and
zero blank samples**. The 3500 ms response-stall run also retained the valid image
throughout, then displayed the requested replacement.

Separate `--timings-only` runs disable synchronous getImageData probes, because
readback itself can stall GPU work. Paired Chrome timing runs reported:

| Observation                                                   |   Before |    After |
| ------------------------------------------------------------- | -------: | -------: |
| Warm decoded-cache seek p50 (12 samples, automation-observed) |  47.6 ms |  42.6 ms |
| Warm decoded-cache seek p95                                   |  60.5 ms |  57.8 ms |
| First delayed boundary settle (one sample)                    | 858.1 ms | 874.2 ms |
| Common initial scenario decode p95                            |  87.9 ms |  69.4 ms |
| Common initial scenario SHA-256 p95                           |   1.4 ms |   0.8 ms |

The single delayed-boundary observation includes deliberate network delay and
Playwright observation/polling overhead; it does **not** demonstrate faster cold
network delivery. Prefetch populations differ by design, so stage populations are
reported with their sample counts. CPU draw-call time measures submission, not GPU
completion. A fresh intercepted context has no HTTP cache; warm values here mean
**decoded-cache reuse**, not verified warm CDN or browser HTTP-cache behavior.

The timing-only after run painted 75 times during a 2384 ms scripted forward/reverse
burst and settled at frame 0. This is evidence of painting during input, not a claim
of 60 FPS. One pixel-instrumented Chrome run had long tasks up to 3039 ms and much
worse percentiles, despite no black frames. This result is retained; measurement
readbacks and host variability can affect it. The non-readback run's longest
observed long task was 62 ms. These limited runs cannot establish universal smooth
playback or attribute every long task. Real hardware/camera/CDN profiling remains a
release requirement; no performance outlier is hidden or treated as production proof.

Local SHA timings are small relative to decode/delivery stages; there is no evidence
that removing integrity checks would address the fault. Actual CDN/network/cache
latency and camera-on contention remain **unmeasured** due to access/hardware limits.
The confirmed causes are clearing, phase coupling, cancellation and per-input effect
invalidation. There is not enough live evidence to name the CDN as the primary bottleneck.

## Reproduction and diagnostics

Build using the existing production configuration:

```sh
node scripts/build-book-production.mjs
pnpm exec vite preview --host 127.0.0.1 --port 4182 --strictPort
```

Default QA requests actual immutable Supabase media; do not supply a local-media
argument when collecting real-media evidence:

```sh
python scripts/qa-continuous-book.py --base-url http://127.0.0.1:4182 --report /tmp/book-real.json
```

For explicitly fixture-only continuity and timing measurements:

```sh
python scripts/qa-continuous-book.py --local-media-root /path/to/prepared-media --report /tmp/book-continuity.json
python scripts/qa-continuous-book.py --timings-only --local-media-root /path/to/prepared-media --report /tmp/book-timings.json
python scripts/qa-continuous-book.py --boundary-only --delay-ms 3500 --local-media-root /path/to/prepared-media --report /tmp/book-stall.json
python scripts/qa-continuous-book.py --mobile --local-media-root /path/to/prepared-media --report /tmp/book-mobile.json
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for an installed Chrome/Edge executable. Supply
`--baseline --base-url <preserved-before-build>` for paired reproduction. Interception
disables HTTP caching; use genuine browser/CDN tools separately for HTTP-cache studies.
`qa-free-exploration.py` covers guest, zero-progress student, unavailable mission APIs,
mobile, deep links, exact mission links and platform UI smoke. Its former mandatory
cover/Contents expectations are intentionally superseded. The real-media script uses the continuous UI. Early Phase 2/3 locked-prototype and
Phase 4 simulated-SDK scripts remain historical, not current release gates.

Reload `/eco-journey?bookDiagnostics=1` for local opt-in profiling. In DevTools:

```js
window.__sevenEmiratesDiagnostics.snapshot();
```

The bounded collector records request/queue, byte transfer, safe HTTP/cache metadata,
SHA, decode, draw, requested-to-displayed latency, cache/job counts, long tasks, JS
heap hints, inference duration/interval, gesture processing and skeleton costs.
ResourceTiming wire sizes are null when TAO/browser support prevents measurement;
asset byte length is not claimed to be actual network wire transfer. Missing CDN
headers remain null. No environment, camera pixels, landmarks, secrets or telemetry
uploads are recorded. Default production operation does not enable the collector.

## Validation and release limits

- Production build passes with native Full HD rendering and the existing approved flags.
- Full suite: **164 passed, three pre-existing Projects deadline/reviewer failures**.
- Type check: the same **five baseline errors**; no new diagnostics.
- Timeline regression tests cover frame 0, all integer destinations/coalescing, no
  autoplay, delayed/failed replacement with retry, stale response ordering, useful
  progressive paint, one scheduler across all six boundaries, in-flight reversal,
  pinned bitmap disposal, adaptive budgets and original fist input from frame 0.
- Chrome, Edge and mobile continuity checks pass. The separate exploration run
  passes **24 checks** using explicit read-only API/media fixtures.
- Points, missions, teacher approval, roles and Projects/backend code are unchanged.
  Fixture navigation attempts no mutation and awards no stamp. Genuine production
  backend acceptance is **not established** by these checks.
- Model B remains approved and SHA-pinned. No A/B work was performed. Physical-camera
  operation and camera-on versus camera-off performance are not verified in this task.
- Actual media/production requests are blocked by this environment's proxy. The live
  deployment, runtime logs, object reachability and production UI remain unverified.

If per-file remote latency remains excessive, first benchmark the unchanged URLs
with ResourceTiming/DevTools, cold/warm HTTP cache and camera off/on on genuine hardware.
A separate experiment could compare a read-only verified encoded CacheStorage/Service
Worker cache, or worker-based hash/decode if measured main-thread work justifies it.
Keep exact SHA checks, immutable media/version keys and a bounded cache. Any change
to published delivery format requires a separately measured proposal; none was made here.

## Release and rollback

The Git checkpoint `rollback/main-before-continuous-book-20261109` preserves main
`6300d6f22355596c21e962eae2e4b6d54a861915`. It is **not a verified Vercel deployment ID**.
Retain the actual current production deployment ID/URL before releasing once Vercel
access is available. Re-fetch main, reconcile newer commits safely, then use normal
merge/PR checks and a non-force push. Monitor the existing project's automatic
production build before attempting any manual deploy. Verify the deployed commit,
release marker and actual domain; never infer deployment success from a Git push.

For an emergency regression after release, use the verified existing project's
Vercel Rollback action or scoped `vercel rollback <previous-deployment-url>` and
verify the original domain. Do not reset/force-push main or alter records/storage.
A previous deployment with the old intro/blank-frame defects is temporary recovery
only, not the permanent solution. The forward repair retains all seven unrestricted
chapters and server-authoritative achievements. No data/schema rollback is required.

## Exact changed-file inventory

| File                                                         | Purpose                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `client/src/components/book/TravelBook.tsx`                  | Route frames mode to the continuous adapter only for `/eco-journey`.                       |
| `client/src/components/book/FrameTravelBook.tsx`             | Original entry, compact jumps and independent optional education.                          |
| `client/src/components/book/frames/FrameBookPlayer.tsx`      | Persistent canvas, imperative input/paint binding and verified placeholder.                |
| `client/src/components/book/frames/FrameScheduler.ts`        | Adaptive caches, priority queues, decode limits, reuse and leases.                         |
| `client/src/components/book/frames/FrameTimeline.ts`         | RAF coalescing, latest-intent ordering and progressive last-valid paint.                   |
| `client/src/components/book/frames/FrameDiagnostics.ts`      | Bounded opt-in local profiling and lifecycle cleanup.                                      |
| `client/src/components/book/frames/useFrameManifest.ts`      | Verify/reuse bootstrap bytes and release Blob URL.                                         |
| `client/src/components/book/frames/manifest.ts`              | Preserve integrity/dimensions and instrument transfer/hash/decode.                         |
| `client/src/components/book/frames/frames.css`               | Original-image surface, compact jumps and continuous layout.                               |
| `client/src/components/book/gestures/GestureControls.tsx`    | Timing and redundant steady-pose UI update bailout.                                        |
| `client/src/components/book/gestures/HandTrackingRuntime.ts` | Inference/processing timing without camera behavior changes.                               |
| `server/frameTimeline.test.ts`                               | Ten new timeline/resource/input regression tests.                                          |
| `server/frameScheduler.test.ts`                              | Update valid expectations for expanded windows and retained active transfers.              |
| `scripts/qa-continuous-book.py`                              | Before/after, delay, pixel, timing and responsive-input QA.                                |
| `scripts/qa-free-exploration.py`                             | Update entry expectations; retain all roles/routes/reward checks and verify mission links. |
| `scripts/qa-real-book.py`                                    | Adapt actual-media acceptance selectors to continuous UI.                                  |
| `docs/seven-emirates-continuous-playback.md`                 | Repair, benchmarking, limitations and release/rollback handoff.                            |
| `docs/qa/seven-emirates-continuous-playback.json`            | Machine-readable evidence, outlier and source fingerprints.                                |
