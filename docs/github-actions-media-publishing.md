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
5. Optional `SUPABASE_POLICY_CA_CERT`: PEM CA certificate downloaded from the
   intended project dashboard, if additional trust is required. See below.

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

## PostgreSQL audit diagnostics and trusted CA configuration

The failed run `42572894118` reached the policy query after successful Storage
and frame integrity checks. Its old generic message cannot establish the
underlying cause: that version discarded PostgreSQL stderr. Do not infer that
TLS, a password, SQL, or an unsafe policy was responsible without new evidence.

The audit now reads stderr privately in the C locale and emits only fixed
categories and reviewed instructions: `invalid-connection`, `network`,
`tls-verification`, `authentication`, `role-or-catalog-permission`,
`sql-or-response`, `policy-enforcement`, or `unexpected`. It never logs raw
stderr, full connection strings, passwords, environment dumps or tracebacks.
Expected failures produce a credential-free `verified:false` report retained by
the existing artifact step. A failure always exits nonzero and blocks upload.
Unknown failures are not guessed to be authentication or policy failures.

In the intended Supabase project dashboard, choose **Connect → Session pooler**.
Copy its actual host (do not construct it from the region), port **5432**, database
**postgres**, and username **<audit-role>.hjqyhybgitdizfhwpdcv**. Use that database
role's password, not an API key. Percent-encode reserved password characters
before saving `SUPABASE_POLICY_DATABASE_URL` in the GitHub publishing environment.
Do not use transaction mode on port 6543. Direct Postgres on port 5432 is also
accepted but may require IPv6 or the project's IPv4 add-on. The script validates
project binding and fields without printing the connection or username.

TLS remains **verify-full** in every mode. URL query options cannot downgrade
it. `PGSSLROOTCERT=system` works only if the server chain is trusted by the runner;
it is not evidence that the Supabase CA is installed. PostgreSQL client/libpq 16+
is checked before the query. Supabase documents downloading its CA from
**Database → Settings → SSL Configuration → Download Certificate** and configuring
it for `verify-full`, including a shared-pooler example:

- [Supabase connection methods and SSL](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase SSL enforcement and CA setup](https://supabase.com/docs/guides/platform/ssl-enforcement)

If a new run reports `tls-verification`, obtain the certificate through the
intended project's dashboard and add its complete PEM contents as environment
secret **SUPABASE_POLICY_CA_CERT**. This is a public CA certificate, never a private
key. The workflow passes it only to the audit step. The audit validates PEM and
builds a mode-0600 temporary trust bundle containing system CAs plus this CA,
then removes the file after the query. Hostname verification remains mandatory;
a CA cannot repair a wrong hostname. No CA is fetched from an unauthenticated
endpoint, guessed, or committed. Whether the actual pooler requires an additional
CA must be established by the next authenticated runner check, not assumed.

For Windows, use the same optional `SUPABASE_POLICY_CA_CERT` PEM environment
variable, or set `SUPABASE_POLICY_SSLROOTCERT` to the dashboard certificate file
path; configure one method only. The file is validated and `verify-full` remains
mandatory. Clear these settings after the run. A database network failure should
be investigated using the dashboard Session Pooler endpoint and database network
restrictions; an authentication failure requires checking the role/project suffix
and database password. For role/catalog permission failures, an administrator
should review access to the listed read-only catalogs, without granting storage
writes or changing student policies.

If policy proof fails, the diagnostic names the candidate permissive policies
with escaped identifiers. This conservative audit does not establish that a
policy is exploitable simply because it cannot prove a guard. Review the exact
predicates and applicable roles. Any remediation must be separately reviewed and
limited to game-bucket INSERT/UPDATE/DELETE restrictive guards; preserve SELECT
and other bucket behavior. The script never executes remediation DDL.

Run a **new manual workflow on main**, not a rerun of the old definition. Inspect
its audit category/report before making any secret correction; never paste a
secret into an issue or chat. A passing audit and all downstream remote checks
are required before publication can be called successful.

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

The user confirmed run `42572894118` passed both checkouts, the publisher tests,
all 1,673 source frame checks, authenticated Storage/public-bucket verification
and PostgreSQL client installation. It stopped at the old generic policy-query
error; upload was skipped. That message discarded the underlying error, so its
connection/TLS/authentication/SQL cause is not established. GitHub's API still
returns Forbidden from this cloud task, preventing direct log inspection,
secret/protection inspection or dispatch here. No live policy audit or successful
publication is claimed by this fix; uploaded/already-verified/final remote counts
require a successful runner report, not an HTTP upload response alone.

For this diagnostic fix, all **34 publisher/helper tests** pass, including failure
classification, secret suppression, Session Pooler validation, temporary CA trust,
nonzero failure reports and unchanged policy enforcement. Previously, all 1,673
native source frames matched the exact manifest, and the actual client resolver
and decoder passed all 14 boundary samples with explicit local fixtures
(`remoteVerified:false`). Those local checks do not establish public hosting.

Earlier Task 05 application validation passed the build and retained the six
known type-check diagnostics and three baseline Vitest failures (118 passes).
This diagnostic fix changes no application, mission, schema, gesture or media
files; its validation is the publisher/policy suite and workflow actionlint.
