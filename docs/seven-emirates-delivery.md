# Seven Emirates delivery and staging readiness — Phase 3

## Status

The integration branch was pushed and its remote head confirmed at
`3721febe019c3e973ec23afe0a656535074ac49d` before Phase 3 work began.
Production remains on the default `legacy` engine. No production deployment,
main merge, gesture implementation, storage upload or bucket mutation occurred.

The supplied Supabase project is `https://hjqyhybgitdizfhwpdcv.supabase.co`.
Public connection attempts were rejected by the cloud proxy (CONNECT HTTP 403),
and no `SUPABASE_SERVICE_ROLE_KEY` binding is present. The environment draft
save returned `INVALID_ARGUMENT`; persistence of the requested domain, variables
and credential requirement could not be confirmed. Remote objects verified: **0**.
The bucket's existence, policies, available quota and actual CDN delivery are
unverified. Local readiness does not establish remote staging readiness.

## Implementation review and media decision

The measured manifest and all 1,673 source WebP bytes are unchanged. The manifest
still covers seven contiguous native 1920×1080 chapter ranges. Relative keys,
dimensions, lengths and SHA-256 are validated before image decoding/drawing.
The independent educational layer supplies allowed ranges, mission navigation
and server-owned stamps; this phase changes none of its rules or backend APIs.

The original `7E-Book/app.js` uses a 30-image cache, seven concurrent requests
and directional 11/7-frame prefetch. The previous React adaptation loaded only
the requested frame and retained eight decoded images. This phase adds bounded
directional prefetch, encoded caching, foreground priority and device policies;
it preserves the integrated mouse/touch/keyboard mapping and no-autoplay model.
The original gesture modules are still not imported.

A dedicated public Supabase Storage bucket named `seven-emirates-game` is
appropriate for immutable public imagery and JSON, using its CDN-backed public
object endpoint. It must be separate from `project-files` and student uploads.
No technical incompatibility has been established; missing network/management
access is a setup blocker, not a reason to replace Supabase. Confirm project
storage/egress capacity before uploading the roughly 264 MB sequence. If capacity
or CDN requirements cannot be met, R2 behind a dedicated CDN domain is an
alternative; it has not been configured or tested here.

Public bucket status provides public reads, not permission to write anonymously.
Before publishing, inspect existing `storage.objects` INSERT/UPDATE/DELETE
policies and ensure none grants anonymous/student writes to this new bucket.
Do not change or drop shared student-upload policies. A read-only inspection in
the project's SQL editor is:

```sql
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';
```

Management credentials stay in secure server environment settings. Never set a
service-role key in `VITE_*`, source files, browser headers, chat or Git. Existing
application authentication/Supabase client settings were left unchanged.

## Resumable upload and full verification

`scripts/media/publish_supabase.py` is a Python-standard-library workflow. It
preserves inherited proxy settings and certificate verification. It verifies
all local SHA-256/size records and accepts only dedicated `seven-emirates-*`
bucket names. Default behavior is local planning with no network requests:

```sh
PYTHONDONTWRITEBYTECODE=1 python scripts/media/publish_supabase.py \
  --root /workspace/media/seven-emirates/prepared
```

The verified plan has 1,674 objects: 1,673 images and one manifest, with immutable
prefix `7e-1bc718ef5e77/`. Its manifest SHA-256 is
`96e7635ce959133c36268b0028474f0737932af5dd498977e7a5d1b69a34d11f`.
No recompression, resizing, overlays or video conversion is performed. Neither
QA contact sheets nor student files are in this delivery plan.

Required setup before applying:

1. Allow outbound HTTPS to `hjqyhybgitdizfhwpdcv.supabase.co` in cloud network settings.
2. Securely inject `SUPABASE_SERVICE_ROLE_KEY` with project bucket/object management access.
3. Create/review the dedicated public bucket and its write-policy isolation; or
   use the explicit creation flag below after that policy review.
4. Set nonsecret `SEVEN_EMIRATES_SUPABASE_URL` to the supplied project origin and
   optionally `SEVEN_EMIRATES_BUCKET=seven-emirates-game`. These are already the
   tool's defaults, not changes to the application's authentication configuration.

Then run the authorized upload command:

```sh
PYTHONDONTWRITEBYTECODE=1 python scripts/media/publish_supabase.py \
  --root /workspace/media/seven-emirates/prepared \
  --apply --create-bucket --workers 3 \
  --checkpoint /workspace/media/seven-emirates/upload-checkpoint.json
```

Omit `--create-bucket` if it already exists. Repeat the same command after a
failure to resume. Every existing object is publicly downloaded and its MIME,
actual size, Content-Length when supplied, and SHA-256 are checked. A matching
object is not uploaded again; mismatches are rejected, never upserted. Missing
objects are uploaded with `x-upsert:false` and one-year cache age, then verified
through the public endpoint. Management redirects are refused. New queued work
is cancelled on failure; successful objects remain recorded in an atomic,
credential-free checkpoint. The manifest is published only after all frames
succeed. Changed bytes require a new version, never an overwrite.

Actual remote uploads and verification were **not executed** because access is
missing. Running `--apply` currently stops at the explicit missing-key check.
Seven local transport/checkpoint unit tests pass; they do not validate Supabase.

## Configuration and local preview

The client supports:

- `VITE_BOOK_ENGINE`: defaults to `legacy`.
- `VITE_BOOK_ASSET_BASE_URL`: public bucket root (or an already-versioned root).
- `VITE_BOOK_MEDIA_VERSION`: optional immutable version appended to the base;
  when set, the downloaded manifest must match it.

The intended, **unverified** public bucket base is:

```text
https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/
```

With `VITE_BOOK_MEDIA_VERSION=7e-1bc718ef5e77`, the client requests the manifest
under that version prefix and resolves every relative image key there. URL
credentials, query tokens, non-HTTP(S) schemes and unsafe versions are rejected.
Public requests omit credentials. No GitHub raw URL is used as a delivery CDN.

No deployment credentials/preview connection are configured. The read-only
GitHub commit-status API probe returned Forbidden, so an automatically created
preview URL could not be verified either. Native Git branch access works.
Use this isolated
local preview, which requires no production settings or real storage credential:

```sh
# Terminal 1: immutable, version-prefixed public-media simulation on loopback.
python scripts/media/serve_prepared.py \
  --root /workspace/media/seven-emirates/prepared --versioned --port 4180

# Terminal 2: build and serve the opt-in preview, leaving default dist untouched.
export COREPACK_HOME=/workspace/.cache/corepack
VITE_BOOK_ENGINE=frames \
VITE_BOOK_ASSET_BASE_URL=http://127.0.0.1:4180/ \
VITE_BOOK_MEDIA_VERSION=7e-1bc718ef5e77 \
  corepack pnpm build --outDir /tmp/7e-phase3-preview
corepack pnpm exec vite preview --outDir /tmp/7e-phase3-preview \
  --host 127.0.0.1 --port 4173 --strictPort

# Separate terminal: real imagery + explicit auth/mission fixtures.
PYTHONDONTWRITEBYTECODE=1 python scripts/qa-frame-delivery.py
FRAME_QA_BASE_URL=http://127.0.0.1:4173 python scripts/qa-frame-book.py
```

Inspect the preview's `/eco-journey` route locally. These are build-time Vite
flags, not a production toggle. For remote staging, change only the preview's
public asset base after the 1,674-object remote verification completes. Do not
activate production or implement MediaPipe as part of this phase.

## Network/cache policy and lifecycle

| Retained resource | Desktop | Mobile/narrow or ≤4 GiB reported device memory |
| --- | ---: | ---: |
| Decoded Full HD cache | 8 images / 63.28 MiB | 4 images / 31.64 MiB |
| Encoded byte cache | 8 MiB | 2 MiB |
| Concurrent fetch/decode jobs | 3 | 2 |
| Prefetch ahead / behind | 4 / 2 | 2 / 1 |

Device policy is chosen at mount. Transient decoder resources are additional
and bounded by concurrency; these are cache limits, not total browser-memory
limits. Current-frame fetches use high priority; speculative fetches use low
priority and are preempted when needed. Direction follows actual scrub input.
Both caches evict by recency and decoded images are closed explicitly. No
prefetch can cross the supplied educational access ranges.

The renderer ignores superseded async completions. Same-chapter failures retain
the last valid image; switching chapters clears the old chapter rather than
using it as a substitute. Retry and legacy recovery remain available. Individual
jobs time out after 15 seconds; initial manifest/image readiness times out after
30 seconds and retains legacy fallback. A configured preview shows a loading
status while initializing instead of downloading/initializing the legacy
renderer and films unnecessarily. Default legacy behavior is unchanged.

## Measurements and verification evidence

`media/seven-emirates/staging-qa.json` records the final isolated local run.
Chromium emulated network throughput/latency, with HTTP cache disabled for cold
navigation; cached steps use the player's own decoded/encoded caches. CPU and
mobile hardware were not emulated. API/auth responses are explicit fixtures.

| Profile | RTT / throughput | Cold navigation → frame | Cached step median / max | Entry image requests |
| --- | --- | ---: | ---: | ---: |
| Desktop | 80 ms / 1 MiB/s | 3,166.9 ms | 4.3 / 11.6 ms | 4 |
| Mobile viewport | 150 ms / 256 KiB/s | 7,776.5 ms | 6.1 / 22.7 ms | 3 |

These are single-run local staging measurements, not Supabase/CDN benchmarks or
guaranteed device performance. Slow-network cold entry remains materially slower
than cached scrubbing and needs a real CDN/device measurement before activation.
The initial image probe and real requested frame both load at native resolution.

The delivery browser suite passed 11 checks with zero page errors: desktop and
mobile cold/cached navigation, failure/retry, correct loading imagery, permitted
refresh, locked URL clamping and cleanup; unrelated login and Projects pages
make zero media requests. Five SPA round trips per profile returned live bitmaps
to zero outside the game. Global listener counts stabilized at 47 after the first
lazy Projects-module warmup and remained 47 on every subsequent round trip.
No whole-sequence load occurred. Existing frame-player and legacy suites are
also run; final check totals are reported with the branch commit.

The existing frame-player browser suite passes all 8 checks and the default
legacy browser suite passes all 14, both with zero page errors.
The final default and opt-in builds pass (existing bundle-size warnings remain).
The TypeScript check retains the same six baseline diagnostics, with no new
diagnostics. The full Vitest run reports 118 passed and the same three baseline
failures out of 121 tests; all 17 scheduler/version tests pass. Seven uploader
unit tests pass. Baseline failures remain the expired submission-deadline test
assumptions and missing approved-teacher fixture; baseline type errors remain
the missing MediaPipe package, AdminDashboard field mismatch, EcoGuide API/type
errors, nullable SDK string and seed transaction type. None was suppressed.

## Remaining prerequisites before MediaPipe

Remote bucket, RLS isolation, network access, private management credential,
1,674-object public verification, and real CDN/device performance remain to be
established. Original MP4/lossless-reference provenance remains unavailable as
recorded in Phase 2. Gestures, main merge and production activation require
their own next task; none is performed here.
