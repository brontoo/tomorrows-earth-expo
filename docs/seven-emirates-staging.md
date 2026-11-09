# Seven Emirates: free-exploration staging candidate

Task 10 supersedes the former sequential book-access and Model A/B requirements.
The integration branch is `integration/seven-emirates-frame-engine`, based on
`72d319e3e435850a476c0fa45e28740da06f54d3`. No merge to main or production deployment
is part of this release candidate.

## Final behavior and educational boundary

Every visitor enters the closed book, opens Contents manually and can choose any
of the seven Emirates, including Fujairah first. Explicit chapter links open that
chapter immediately. `/my-journey` retains its achievement spread. Returning to
Contents, chapter tabs and previous/next Emirate controls require no authentication
or mission data. Loading, unavailable or incomplete optional missions never lock
exploration.

The reducer accepts every valid chapter index. `explorationRanges()` supplies one
integer frame range **[0,1673)** inside `FrameBookPlayer`; parents cannot inject
mission-dependent ranges. Mouse, touch, keyboard, slider and the existing gesture
port share this seek path. Boundary pairs are 238/239, 477/478, 716/717, 955/956,
1194/1195 and 1433/1434. Headings follow the displayed chapter. No autoplay was added.
Scheduler/cache policies, Full HD canvas, input sensitivity, reduced-motion handling,
camera opt-in and cleanup remain intact. The frame-only layout puts the full image,
controls and optional mission panel in normal flow, avoiding the legacy text overlay
that intercepted mobile drags; the cover and legacy layout remain unchanged.

Mission bindings and their ordering are unchanged. Stamps still derive only from
server `completed`/`verified` states. Opening pages writes only profile-local book
navigation/seen-stamp persistence, never mission/reward mutations. The existing
`frontier` metadata remains exclusively for the optional MissionDetail educational
workflow; it is not used to authorize book access. Existing submissions, teacher
approval and reward procedures remain unchanged. MissionDetail and the dashboard's
StudentJourneyOverview received copy corrections only, to distinguish optional
missions from unrestricted exploration. Projects and dashboard logic were not changed.

## Approved model and immutable media

Model **B / Current Version 1** is the only selectable model. Its verified SHA-256 is
`97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`.
The owner reports a real Chrome physical-camera session with **21/21 positive**
checklist responses. This is owner-supplied acceptance, not a camera test performed
by this headless runner. No further Model A comparison is required. Historical byte
differences remain in the model compatibility audit. The A/B selector is removed,
including development builds; the former A/B launcher refuses to start.

No images or manifest data were changed. `.gitattributes` preserves manifest LF
bytes on Windows, retaining strict authoritative SHA-256
`96e7635ce959133c36268b0028474f0737932af5dd498977e7a5d1b69a34d11f`.
A temporary Git checkout with `core.autocrlf=true` verifies byte identity.

## Isolated build and genuine staging requirements

The default production configuration remains unchanged. Public staging flags are
listed in `.env.staging.example`. Build an isolated frontend artifact with:

```sh
pnpm install --frozen-lockfile
node scripts/build-book-staging.mjs --out-dir /tmp/seven-emirates-staging
```

The builder explicitly supplies `frames`, gestures on, A/B off, the approved model
and the existing read-only public media base/version. It uses production compilation,
an empty env directory and filters inherited app credentials; it never loads the
repository `.env`. Only explicitly supplied `STAGING_VITE_SUPABASE_URL`,
`STAGING_VITE_SUPABASE_ANON_KEY` (public anon/publishable only) and
`STAGING_VITE_APP_ID` are mapped into the frontend. Never supply a service-role key.
Output cannot overwrite source folders or a nonempty directory owned by other tools.
The artifact marker records configuration booleans, not credentials.

For Vercel, `vercel.staging.json` is an explicit alternative configuration, preserving
the existing API rewrites. Use **an isolated nonproduction Vercel project**, not the
production project. After a deployment identity and genuine nonproduction backend
have been provisioned, a manual preview deployment can use:

```sh
vercel deploy --local-config vercel.staging.json --target=preview
```

Do not use `--prod`. This command was **not run** in this session.

**No genuine staging deployment or URL was produced.** Missing requirements:

- Authorized Vercel deployment identity/token and an isolated linked staging project/team.
- Genuine nonproduction database and app-server configuration, signing/auth settings,
  public nonproduction auth configuration and test accounts for student/teacher/admin.
- Network access from the acceptance runner to the actual public media/model services.
  This cloud runner's proxy rejects Supabase access with CONNECT HTTP 403.

The local Docker test database and intercepted API fixtures are not a deployable
backend and do not prove authentication, project submission, teacher approval or
reward persistence on staging. Do not copy production secrets, data or storage
policies into a preview. The media bucket is consumed read-only; no storage permissions
or production variables were changed.

## Validation and limitations

Machine-readable evidence is in `docs/qa/seven-emirates-free-exploration.json`.

- `pnpm build`: passes, with existing large-chunk notices.
- `pnpm check`: five pre-existing diagnostics remain (AdminDashboard votes field,
  EcoGuide API/implicit type, SDK nullable string, seed transaction type).
- `pnpm test --maxWorkers=2 --minWorkers=1`, using only the existing local test DB:
  154 pass, three pre-existing Projects submission/reviewer-fixture failures remain.
  Two are deadline-related; the reviewer fixture is not approved. No production DB used.
- Targeted book/gesture/model tests: **61 passed**; Python model-tool tests: **3 passed**.
  Gesture/model, travel-book and unrestricted-exploration tests retain server-derived
  achievement checks. All 1,673 integer positions and all six boundary pairs are
  exercised, including deterministic fist-controller navigation both directions.
- All 1,673 existing external reference frames validate at 1920×1080 with exact
  SHA-256 and byte sizes. This is local reference validation, not remote object
  recounting or media processing.
- Browser QA: **24 checks passed**, no page errors, unexpected network failures or
  attempted API mutations. It uses a production-compiled local artifact, byte-identical Full HD media
  fixtures and explicit read-only API fixtures. It covers entry/Contents, Fujairah
  first, Dubai, deep links, seven enabled chapters, boundaries, mouse/touch/key/slider,
  guest/zero-progress/unavailable-API states and responsive layout. No camera was
  enabled or SDK/model result fabricated. No navigation mutation was attempted.
- Projects and student/teacher/admin dashboard checks are fixture UI smoke only.
  Projects does not request book media/model/camera. Dashboards retain their existing
  decorative book poster; the frame engine and camera are not initialized.
- Genuine staging browser/backend acceptance, live CDN checks from this environment,
  and physical camera execution by this runner remain unperformed. Owner Model B
  acceptance stands independently; Model A testing is not a release gate.

## Exact rollback without restoring locks

Keep this release candidate's free-exploration code. To fall back to the legacy
renderer **in staging only**, build from the same integration commit:

```sh
node scripts/build-book-staging.mjs --legacy-rollback --out-dir /tmp/seven-emirates-staging-rollback
```

This sets `legacy`, gestures off and A/B off, retaining all seven unlocked chapters,
optional missions and unchanged educational records. For the isolated Vercel staging
project use the matching explicit configuration:

```sh
vercel deploy --local-config vercel.staging-rollback.json --target=preview
```

Verify guest Fujairah-first, Contents and seven enabled chapter controls on that
preview. Do not revert to the pre-Task-10 commit or promote an older locked build.
No database rollback, media rewrite or policy change is needed. Production stays
unchanged throughout.

## Promotion recommendation

This is a candidate for genuine isolated staging once infrastructure is available.
Production promotion should wait for real staging authentication/role, Projects
submission, mission/teacher/reward non-mutation and deployed-browser acceptance.
The five TypeScript and three test baseline issues remain visible platform debt.
Do not merge main or deploy production as part of this task.

## Changed-file inventory

The machine-readable QA report contains the full inventory for this change. Files
are grouped below by responsibility; no image, authoritative manifest, database,
backend procedure, package lockfile or production deployment configuration changed.

- Presentation/access: `client/src/components/book/TravelBook.tsx`, `book.css`,
  `chapters.ts`, `frames/FrameBookPlayer.tsx`, `frames/contracts.ts`,
  `frames/exploration.ts`, `frames/frames.css`.
- Model finalization/comment: `client/src/components/book/gestures/GestureControls.tsx`,
  `GestureModels.ts`, `HandTrackingRuntime.ts`, `BookGestureController.ts`.
- Educational wording only: `client/src/pages/MissionDetail.tsx`,
  `client/src/components/field/StudentJourneyOverview.tsx`.
- Tests: `server/travelBook.test.ts`, `bookExploration.test.ts`,
  `bookGestureModels.test.ts`, `bookGestureResources.test.ts`, `bookGestures.test.ts`,
  `scripts/test-model-tools.py`.
- QA/tooling: `scripts/build-book-staging.mjs`, `qa-free-exploration.py`,
  `qa-real-book.py`, `qa_model_reporting.py`, `start-book-model-ab.ps1`.
- Configuration: `.gitattributes`, `.gitignore`, `.env.staging.example`,
  `vercel.staging.json`, `vercel.staging-rollback.json`.
- Documentation/evidence: `docs/seven-emirates-staging.md`,
  `docs/seven-emirates-model-ab.md`,
  `docs/qa/seven-emirates-model-compatibility.json`,
  `docs/qa/seven-emirates-free-exploration.json`.
