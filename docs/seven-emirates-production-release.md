# Task 11: production release preparation and access blocker

## Status

**Production has not been deployed or verified. Remote main has not been changed.**
The owner authorizes release to the existing project serving
https://tomorrows-earth-expo.vercel.app/; no new project is permitted.

Task 11 also requires verifying the existing Vercel project ID, owning team,
repository connection and production branch **before deploying**, and stopping
when authorization or project identity is unavailable. A push to main may trigger
an automatic production deployment. Therefore it is deferred until that prerequisite
can be fulfilled. No CLI deploy, promotion or duplicate deployment was attempted.

## Git preflight and preserved rollback reference

- Approved integration: `57f364e468f38f2b5f4d729e8ebf27f2ef9a1acb`.
- Fetched remote main: `df43163899c663173d953ec3815039ec2c7b6ae7`.
- Main is an ancestor of the approved integration; no divergence or production
  commits would be discarded by a fast-forward. The initial working tree was clean.
- The approved integration adds 11 commits and changes 78 files relative to main.
  Changes comprise the book/player, approved MediaPipe dependency, media tooling,
  immutable manifest/QA previews, regression tests and documentation. No backend
  procedure, database schema, API entrypoint or Projects implementation changed.
  MissionDetail and StudentJourneyOverview changes are educational wording only.
- Annotated tag **`rollback/main-before-seven-emirates-20261109`** was pushed and its
  remote peeled SHA verified as `df43163899c663173d953ec3815039ec2c7b6ae7`.
- This is a reference to the previous **Git main**, not a claim that the same commit
  or any particular deployment is currently serving the production domain.

The release-preparation commit on the integration branch retains the complete
approved history and adds only the production build wrapper, production build
command and this report. It does not alter the game implementation or media.

## Actual production build configuration

`vercel.json` keeps the existing output directory, install command and API rewrites.
Its build command now invokes `node scripts/build-book-production.mjs`.

The wrapper retains the existing environment for authentication, APIs, database
connectivity and platform services. It overrides only NODE_ENV to production and
these five public book settings for the Vite build:

```env
VITE_BOOK_ENGINE=frames
VITE_BOOK_GESTURES=true
VITE_BOOK_MODEL_AB=false
VITE_BOOK_ASSET_BASE_URL=https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/
VITE_BOOK_MEDIA_VERSION=7e-1bc718ef5e77
```

It does not use the staging builder, staging credentials or staging configurations.
It does not serialize environment variables. The generated public
`/seven-emirates-release.json` contains only the source commit, public book flags,
approved Model B SHA and full frame bounds. It is build provenance, **not evidence
of a successful deployment**. A failed build exits unsuccessfully without creating
that marker. The deployed marker must later match the actual production commit.

Model B remains pinned to
`97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`.
No A/B work, media extraction, chapter restriction, policy or data changes were made.
The owner-reported physical-camera result remains 21/21; no physical camera was
used for this release preparation.

## Validation

- Production wrapper build passes, including with inherited conflicting
  `VITE_BOOK_ENGINE=legacy`, gestures off and A/B on. The generated artifact and
  browser are checked for the required final configuration.
- Full suite rerun: **154 pass, 3 pre-existing Projects submission/reviewer-fixture
  failures**. Test execution uses the existing local development test database,
  never production data.
- Type-check rerun: the same **five pre-existing errors** in AdminDashboard,
  EcoGuide (two), SDK nullable string and seed transaction type. No new diagnostics.
- Local production-compiled browser coverage: **9 checks passed** (guest book flow
  and Projects/student/teacher/admin fixture UI smoke). An additional built-DOM
  check confirms the frames engine, Fujairah frame 1672, enabled gesture controls,
  pinned Model B, camera off and no A/B selector with optional APIs unavailable.
  These checks use unchanged Full HD reference
  media and explicit read-only API fixtures. This is not live website or backend
  acceptance. Prior unrestricted desktop/mobile, zero-progress and unavailable-API
  evidence is in `docs/qa/seven-emirates-free-exploration.json`.
- The live browser attempt failed with `net::ERR_TUNNEL_CONNECTION_FAILED`.
  Curl to the production domain and Vercel API failed with CONNECT HTTP 403 before
  receiving an origin response. The GitHub commit-status API also returned Forbidden.
- Actual production homepage, Projects, authentication, dashboards, APIs, book media,
  deployment runtime logs, published commit and physical camera remain unverified.

## Exact blockers and recovery prerequisites

The observed environment has no configured Vercel secret/identity, no
`VERCEL_TOKEN`, `VERCEL_PROJECT_ID` or `VERCEL_ORG_ID`, no local `.vercel/project.json`
and no Vercel CLI authentication file. No Vercel connector is available. Git read
and push work, but they do not establish Vercel ownership or deployment success.

To resume, supply an authorized Vercel credential through **secure environment
settings**, never chat. It must have access to the existing production project/team.
Project/team IDs can be supplied as runtime metadata or discovered using that
credential and the exact target domain. Do not create another project.

Enable network access in the environment settings for:

- `api.vercel.com` and `vercel.com` for project identity/deployment inspection.
- `api.github.com` for commit checks and deployment statuses.
- `tomorrows-earth-expo.vercel.app` for the actual live website.
- `hjqyhybgitdizfhwpdcv.supabase.co` for unchanged read-only book media.
- `storage.googleapis.com` for the approved Model B.

Existing `cdn.jsdelivr.net` access must remain available for the pinned SDK runtime.
If Vercel returns a separate deployment hostname, permit that exact hostname too.
Do not bypass the proxy or disable TLS verification. Do not supply production DB,
auth or service-role secrets to this chat just to validate browser behavior.

## Resume the authorized release

1. Inspect the alias/project through authenticated Vercel access; verify project ID,
   owner/team, connected `brontoo/tomorrows-earth-expo` repository and production
   branch main. Record the current production deployment ID/URL for rollback.
2. Fetch again and inspect remote main and integration. Verify main remains an
   ancestor and the worktree is clean. Preserve newer commits if anything changed.
3. Update local main from origin/main, then `git merge --ff-only
integration/seven-emirates-frame-engine`. Push normally with `git push origin
main`; never force. If branch protection requires a PR, use that process.
4. Verify remote main equals the resulting release SHA and contains approved
   commit `57f364e`. The production Vercel build must use the production wrapper.
5. Monitor the Git-triggered production deployment first. Use an authenticated
   existing-project CLI deployment only if automatic deployment is absent. Avoid
   creating a second unnecessary deployment.
6. Verify the deployment commit and public release marker, then the real homepage,
   Projects, auth and role routes, API responses and runtime/browser logs. Use
   read-only production checks; do not manufacture submissions or rewards.
7. Verify the real book: manual entry/Contents, all seven available, Fujairah first,
   all deep links, Supabase frames, six boundaries bidirectionally, mouse/key/mobile
   touch, no navigation mutations, B-only controls and explicit camera opt-in.
   Never run fixture-intercepting QA and label it live backend acceptance.
8. Report the production deployment URL/status and verified live results, separating
   inaccessible authenticated workflows and any unperformed physical-camera checks.

## Rollback

Keep the verified **previous Vercel deployment ID** before triggering release.
For a critical deployment regression, use the existing project's supported Vercel
Rollback action (or authenticated `vercel rollback <previous-deployment-url>` scoped
to the verified project/team). Confirm the original domain resolves to that deployment.
No previous deployment ID/URL is currently known, so no rollback command was executed.

The Git rollback tag is retained for audit. Do not reset/force-push main or delete
records. An emergency previous deployment may be a temporary recovery only; do not
restore old chapter-locking code as the permanent solution. A forward fix can retain
this approved unrestricted educational layer and use the available legacy renderer
without restoring access restrictions. No schema, record or policy rollback is needed.
