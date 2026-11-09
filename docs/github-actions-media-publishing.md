# Manual GitHub Actions publishing of the immutable Seven Emirates export

Workflow: `brontoo/7E-Book/.github/workflows/publish-seven-emirates.yml`, on its
default branch `main`. It has only `workflow_dispatch`, read-only GitHub
`contents` permission, fixed project/bucket/version, pinned third-party actions,
a protected-environment publishing job and serialized execution. It does not
deploy Expo, merge branches, activate the frame engine, execute source game JS,
or change storage policies/schema.

## Immutable inputs and preparation

- Media source: `brontoo/7E-Book` commit
  `1bc718ef5e770033a3f00f398223abce01052fb1`.
- Manifest version: `7e-1bc718ef5e77`.
- Exact manifest SHA-256:
  `96e7635ce959133c36268b0028474f0737932af5dd498977e7a5d1b69a34d11f`.
- Expo checkout: `integration/seven-emirates-frame-engine`; the workflow pins
  the reviewed publisher commit and refuses an unexpected branch head. Its
  checked-in workflow contains the exact commit. Advancing the Expo branch
  requires reviewing/updating that pin before another run.

`assemble_actions_media.py` compares the complete source file inventory against
all 1,673 manifest references, verifies the pinned clean source checkout, hashes,
sizes and native 1920×1080 decodes, then copies unchanged files into runner temp.
It copies the original manifest bytes without reserializing or regenerating it.
The existing `build_plan()` validates the assembled directory again. No upload
step is reachable when these checks fail. All large images stay outside Expo.

The existing `publish_supabase.py` remains the upload implementation: public
GET verification on resume, no upsert, MIME/size/SHA checks, three concurrent
workers, atomic checkpoint, cancellation on failure, and manifest publication
last. A successful report requires 1,674 remotely verified objects, with separate
`uploaded` and `alreadyVerified` counts. A successful POST alone is insufficient.

## Protected environment and credentials

In **7E-Book → Settings → Environments**, create
`seven-emirates-publishing`. Configure required reviewers and prevent self-review
where the repository plan supports these controls, and restrict deployment
branches to `main`. A workflow environment declaration alone does not establish
that approval protections have been configured; verify them in Settings.

Configure these **environment secrets**, never source files or chat:

1. `SUPABASE_SECRET_KEY`: preferred backend Secret API key for
   `https://hjqyhybgitdizfhwpdcv.supabase.co`.
2. `SUPABASE_POLICY_DATABASE_URL`: a read-only PostgreSQL connection to that
   same project's catalog metadata. Use the dashboard's IPv4-compatible Session
   Pooler connection string on GitHub-hosted runners. It must allow reading
   `pg_policies`, `pg_roles`, `pg_class` and `pg_namespace`; no data writes are
   required. The auditor enforces `default_transaction_read_only=on`, verified
   TLS, the intended project host/username and a 15-second statement timeout.
3. Only if Secret API keys cannot be used: `SUPABASE_SERVICE_ROLE_KEY`, a legacy
   service-role JWT. The newer secret takes precedence when both are present.
4. Only if Expo is private: `EXPO_REPOSITORY_READ_TOKEN`, a fine-grained token
   with **Contents: read** on the Expo repository, for the cross-repository
   checkout. The source repository uses its normal read-only job token.

Do not put a management key in `VITE_*`. Do not use publishable/anon/user keys
for this job. GitHub's own `GITHUB_TOKEN` remains read-only. Checkouts do not
persist tokens into Git configuration.

Supabase's current [API key documentation](https://supabase.com/docs/guides/getting-started/api-keys)
states that `sb_secret_…` keys are not JWTs and must be sent on `apikey`, not
`Authorization: Bearer`. This was checked in the official Supabase source at
commit `dc73b346c1f37eaae9e529fae81a4307b78fefe6`,
`apps/docs/content/guides/getting-started/api-keys.mdx`, Known limitations.
The publisher now uses only `apikey` for Secret API keys; legacy service-role
JWTs retain both headers. Unit tests verify the header construction. The runner
must still prove actual compatibility via an authenticated, read-only Storage
bucket GET before any upload. Local documentation/header tests alone do not
establish remote credential validity.

## Bucket and read-only write-policy gate

The administrator must provide a dedicated existing bucket named
`seven-emirates-game`, public for reads. The workflow never creates a bucket or
changes student-project storage policies. Its connectivity check verifies the
returned bucket identity and public flag; connection/auth errors stop the job.

Public bucket status does **not** prove client writes are blocked. The separate
`audit_storage_policy.py` step makes a read-only catalog query. It requires RLS,
non-superuser/non-BYPASSRLS/non-owner client roles (`anon`, `authenticated`, and
`student` if present), and proves INSERT/UPDATE/DELETE are denied by either:

- PostgreSQL's default deny, when no permissive policy exists for that command;
  or
- A restrictive policy applying to PUBLIC, with the exact game-only predicate
  `bucket_id <> 'seven-emirates-game'::text`. INSERT needs WITH CHECK, DELETE
  needs USING, UPDATE needs both. Such a guard leaves other buckets unaffected
  and is ANDed with existing permissive policies. Private service-role access
  bypasses RLS as documented by Supabase.

This intentionally conservative audit rejects complex policies it cannot prove
safe, even if an administrator believes them equivalent. If it fails, obtain a
separately reviewed administrator bucket-isolation change, then retry. This task
and workflow perform **no policy DDL**, no schema changes and no student-upload
policy modifications. The read-only audit secret is necessary because the
Storage REST API does not expose database policy definitions.

psql 16+ and certificate verification are required. For a project-specific CA,
provide the trusted public CA file and set `SUPABASE_POLICY_SSLROOTCERT` to it;
never disable TLS verification. Prefer the standard trusted pooler endpoint.

## Manual run and results

1. Confirm the environment protections, secrets and bucket policies above.
2. Open **7E-Book → Actions → Publish Seven Emirates media**.
3. Choose **Run workflow**, branch **main**. Approve the protected environment
   if required. There are no automatic push or PR upload triggers.
4. Inspect integrity, connectivity and policy steps before publication.
5. A successful run must pass all remote verification and browser steps.

Reports contain no keys, DSNs, environment dumps or private request headers:
connection status, policy-audit booleans/guard names, upload counts/checkpoint,
public manifest/sample URLs, dimensions, hashes, CORS and client-canary result.
Only explicitly listed JSON reports/checkpoint files are retained for seven
days. Large frames and logs/credentials are not uploaded as artifacts.

Public verification fetches the exact versioned manifest and fourteen unique
first/last chapter samples: first/last Abu Dhabi, at least one frame in every
other Emirate, every consecutive chapter boundary, and the final Fujairah frame.
It verifies MIME, actual size, SHA, native dimensions and public CORS. A browser
canary bundles and executes the **actual Expo asset resolver, manifest validator
and frame decoder** against those public URLs. Its `.invalid` origin is an
explicit intercepted test page, not a claimed deployed website. It receives no
private credential. All decoded bitmaps are closed.

The reusable canary also supports `--local-fixture-root` for diagnostics, but
that mode reports `remoteVerified:false` and is **never** used by the workflow.
Local fixtures cannot constitute publication success.

## Windows alternative with the same publisher

Use Python 3.12+, Node 22 with Corepack, Git, and PostgreSQL's psql 16+ on PATH.
Create fresh directories rather than resetting existing work. Clone Expo's
integration branch and `7E-Book`, check Expo's HEAD against the workflow's pinned
commit, and detach the media checkout at the provenance commit above. Then run
from the Expo checkout in PowerShell:

```powershell
# Run in a fresh parent directory. These commands do not reset existing work.
git clone --branch integration/seven-emirates-frame-engine https://github.com/brontoo/tomorrows-earth-expo.git tomorrows-earth-expo-publish
git clone https://github.com/brontoo/7E-Book.git 7E-Book
git -C 7E-Book switch --detach 1bc718ef5e770033a3f00f398223abce01052fb1
Set-Location tomorrows-earth-expo-publish
# Check git rev-parse HEAD against EXPO_EXPECTED_COMMIT in the workflow before proceeding.
python -m pip install Pillow==13.0.0 playwright==1.62.0
python -m playwright install chromium
corepack pnpm install --frozen-lockfile

$prepared = Join-Path $env:TEMP 'seven-emirates-prepared'
$reports = Join-Path $env:TEMP 'seven-emirates-reports'
python scripts/media/assemble_actions_media.py --source ../7E-Book `
  --manifest media/seven-emirates/manifest.json --output $prepared

# Prompts are secure; values are kept in process memory, not source/history text.
$env:SUPABASE_SECRET_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'Supabase Secret API key' -AsSecureString)).Password
$env:SUPABASE_POLICY_DATABASE_URL = [System.Net.NetworkCredential]::new('', (Read-Host 'Read-only policy database URL' -AsSecureString)).Password

python scripts/media/check_publish_prerequisites.py --report "$reports/connection.json"
if ($LASTEXITCODE -ne 0) { throw 'Connectivity/bucket check failed; stop' }
python scripts/media/audit_storage_policy.py --report "$reports/policy-audit.json"
if ($LASTEXITCODE -ne 0) { throw 'Policy audit failed; stop' }
python scripts/media/publish_supabase.py --root $prepared --apply `
  --project https://hjqyhybgitdizfhwpdcv.supabase.co --bucket seven-emirates-game `
  --checkpoint "$reports/checkpoint.json" --report "$reports/publication.json"
if ($LASTEXITCODE -ne 0) { throw 'Publication incomplete; rerun to resume' }

Remove-Item Env:SUPABASE_SECRET_KEY, Env:SUPABASE_POLICY_DATABASE_URL
python scripts/media/verify_public_delivery.py --manifest "$prepared/manifest.json" `
  --report "$reports/public-verification.json"
if ($LASTEXITCODE -ne 0) { throw 'Public retrieval verification failed' }
corepack pnpm exec esbuild scripts/media/public_probe_entry.ts --bundle `
  --platform=browser --format=esm --outfile="$reports/probe.js"
python scripts/media/probe_public_client.py --bundle "$reports/probe.js" `
  --manifest "$prepared/manifest.json" --report "$reports/public-client.json"
if ($LASTEXITCODE -ne 0) { throw 'Public client verification failed' }
```

Check `$LASTEXITCODE` after assembly/dependency commands too; stop on any error.
Do not enable PowerShell transcript/shell tracing around credentials. On failure,
remove credential environment variables before leaving the session. The same
immutable/public-byte verification and no-overwrite behavior apply on Windows.

## Current execution status

Local preparation and tests are performed without a live Supabase credential.
GitHub's environment/dispatch API is returning Forbidden from the cloud task,
so environment secrets/protections cannot be inspected or configured here and
no GitHub-runner execution is claimed. A workflow pushed to default main is
ready for the manual setup/run above; it is not proof of completed publication.
Until a successful runner report exists, uploaded, already-verified and final
remote counts are **unverified**, not presumed to be 1,674. No successful public
manifest or image URL is claimed.

Local validation: all 20 publisher/helper tests pass; all 1,673 native source
frames were assembled and checked against the exact manifest. The actual
bundled client resolver/decoder passed all 14 boundary samples using explicit
local fixtures (`remoteVerified:false`). The policy catalog SELECT was parsed
successfully by local PostgreSQL, but this is not a Supabase policy audit.
The unchanged application build passes. Type checking retains the six known
baseline diagnostics, and Vitest retains 118 passing tests and the same three
baseline failures. No frontend, mission procedure, schema or gesture code was
modified in this task.
