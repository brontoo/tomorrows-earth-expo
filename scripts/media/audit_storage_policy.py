#!/usr/bin/env python3
"""Read-only, fail-closed storage RLS audit. Never creates or changes policies."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import ssl
import tempfile
import urllib.parse
from publish_supabase import PROJECT, BUCKET

SQL="""SELECT json_build_object(
 'rowSecurity', c.relrowsecurity,
 'roles', (SELECT json_agg(json_build_object('name',r.rolname,'superuser',r.rolsuper,
   'bypass',r.rolbypassrls,'ownerMember',pg_has_role(r.oid,c.relowner,'MEMBER')))
   FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','student')),
 'policies', (SELECT coalesce(json_agg(json_build_object('name',policyname,'permissive',permissive,
   'roles',roles,'command',cmd,'using',qual,'check',with_check)),'[]'::json)
   FROM pg_policies WHERE schemaname='storage' AND tablename='objects'))
 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
 WHERE n.nspname='storage' AND c.relname='objects';"""

class AuditFailure(ValueError):
    """Only fixed, reviewed messages may cross the diagnostic boundary."""
    def __init__(self, category, message):
        self.category = category
        super().__init__(message)


def connection_environment(dsn):
    try:
        u = urllib.parse.urlsplit(dsn)
        ref = urllib.parse.urlsplit(PROJECT).hostname.split('.')[0]
        user = urllib.parse.unquote(u.username or '')
        password = urllib.parse.unquote(u.password or '')
        port = u.port or 5432
        database = urllib.parse.unquote(u.path.lstrip('/')) or 'postgres'
        host = u.hostname or ''
    except (ValueError, TypeError):
        raise AuditFailure('invalid-connection', 'Malformed database URL; copy the Session Pooler URI from the intended project dashboard.') from None
    if u.scheme not in ('postgres', 'postgresql') or not host or not user or not password or u.fragment:
        raise AuditFailure('invalid-connection', 'Missing or invalid database connection fields; percent-encode reserved password characters.')
    direct = host == 'db.' + ref + '.supabase.co'
    pooler = bool(re.fullmatch(r'aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com', host)) and user.endswith('.' + ref) and bool(user[:-len(ref)-1])
    if not (direct or pooler):
        raise AuditFailure('invalid-connection', 'Database host/username does not identify the intended project. Copy the exact Session Pooler host and role.project-ref username; do not guess the region or cluster.')
    if port != 5432:
        raise AuditFailure('invalid-connection', 'Use Session Pooler port 5432, not transaction-pooler port 6543, or direct Postgres port 5432.')
    if database != 'postgres':
        raise AuditFailure('invalid-connection', 'Use the intended project postgres database for the storage policy catalog audit.')
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG') and not k.startswith('SUPABASE_')}
    # URL query parameters cannot override TLS, read-only settings or project binding.
    env.update(PGHOST=host, PGPORT=str(port), PGUSER=user, PGPASSWORD=password, PGDATABASE=database,
               PGSSLMODE='verify-full', PGSSLROOTCERT=os.environ.get('SUPABASE_POLICY_SSLROOTCERT') or 'system',
               PGCONNECT_TIMEOUT='15', PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=15000', LC_ALL='C')
    return env


def classify_postgres_error(stderr):
    """Inspect privately; return fixed messages only, never sanitized raw stderr."""
    text = stderr.lower()
    if any(s in text for s in ('certificate verify failed', 'certificate verification failed', 'root certificate',
                              'does not match host name', 'does not match hostname', 'server certificate',
                              'ssl error', 'ssl connection', 'ssl is not enabled', 'does not support ssl', 'tls handshake')):
        return AuditFailure('tls-verification', 'TLS certificate/hostname verification failed. Check the dashboard Session Pooler hostname and configure its trusted CA; verify-full remains required.')
    if any(s in text for s in ('could not translate host name', 'name or service not known', 'temporary failure in name resolution',
                              'connection refused', 'connection timed out', 'timeout expired', 'network is unreachable',
                              'no route to host', 'could not connect to server', 'server closed the connection', 'connection reset')):
        return AuditFailure('network', 'Database DNS/network connection failed. Use the dashboard IPv4 Session Pooler endpoint and review database network restrictions and runner reachability.')
    if '42501' in text or re.search(r'role\s+"[^"\n]*"\s+does not exist', text) or any(s in text for s in ('permission denied', 'must be member of role', 'must be owner', 'role does not exist')):
        return AuditFailure('role-or-catalog-permission', 'Database role/catalog access was denied. Verify the audit role exists and can read the required PostgreSQL catalogs; no write grant is needed.')
    if any(s in text for s in ('password authentication failed', 'authentication failed', 'tenant or user not found',
                              'no password supplied', 'sasl', 'scram', '28p01', '28000', 'no pg_hba.conf entry')):
        return AuditFailure('authentication', 'Database authentication/tenant routing failed. Verify the Session Pooler role.project-ref username and percent-encoded database password, not an API key.')
    if '3d000' in text or re.search(r'database\s+"[^"\n]*"\s+does not exist', text) or any(s in text for s in ('unsupported startup parameter', 'invalid connection option', 'invalid uri', 'database does not exist')):
        return AuditFailure('invalid-connection', 'Database connection/startup settings were rejected. Copy the Session Pooler URI for postgres on port 5432 and verify the role supports read-only session options.')
    if re.search(r'(?:error|fatal):\s+42[0-9a-z]{3}\s*:', text) or any(s in text for s in ('syntax error', 'relation does not exist', 'column does not exist')):
        return AuditFailure('sql-or-response', 'PostgreSQL rejected the read-only catalog SQL. Review server compatibility and the audit query; no policy change was attempted.')
    return AuditFailure('unexpected', 'Unexpected PostgreSQL failure. Raw database output is withheld; investigate through secure administrator database diagnostics.')


def configure_trust(env, directory):
    """Use system trust, a reviewed CA file, or system roots plus dashboard PEM."""
    pem = os.environ.get('SUPABASE_POLICY_CA_CERT')
    configured = env['PGSSLROOTCERT']
    if pem and configured != 'system':
        raise AuditFailure('tls-verification', 'Configure either SUPABASE_POLICY_CA_CERT or SUPABASE_POLICY_SSLROOTCERT, not both.')
    try:
        if pem:
            # Only PEM certificate blocks are accepted; reject keys or unrelated text.
            blocks = re.findall(r'-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----', pem)
            if not blocks or ''.join(pem.split()) != ''.join(''.join(blocks).split()):
                raise ValueError('invalid PEM')
            context = ssl.create_default_context()
            context.load_verify_locations(cadata=pem)
            certs = context.get_ca_certs(binary_form=True)
            if not certs:
                raise ValueError('no trusted certificates')
            path = Path(directory) / 'policy-root-ca.pem'
            path.write_text(''.join(ssl.DER_cert_to_PEM_cert(c) for c in certs))
            path.chmod(0o600)
            env['PGSSLROOTCERT'] = str(path)
            return 'system-plus-configured-ca'
        if configured != 'system':
            ssl.create_default_context(cafile=configured)
            return 'configured-ca-file'
        return 'system'
    except (OSError, ValueError, ssl.SSLError):
        raise AuditFailure('tls-verification', 'Trusted CA configuration is missing, unreadable or invalid. Use the certificate downloaded from the intended project dashboard; never a private key.') from None


def audit(metadata,bucket=BUCKET):
    if bucket!=BUCKET:raise ValueError('Only the dedicated game bucket is authorized')
    if metadata.get('rowSecurity') is not True:raise ValueError('Storage objects must have RLS enabled')
    roles=metadata.get('roles') or []
    if not {'anon','authenticated'}.issubset({r['name'] for r in roles}):raise ValueError('Required client roles could not be audited')
    if any(r.get('superuser') is not False or r.get('bypass') is not False or r.get('ownerMember') is not False for r in roles):raise ValueError('A client role can bypass storage RLS, or its privileges are unknown')
    expected="bucket_id<>'"+bucket+"'::text"
    normalize=lambda value:re.sub(r'[\s()]','',value or '')
    verified={}
    for command in ('INSERT','UPDATE','DELETE'):
        policies=[p for p in metadata.get('policies',[]) if p['command'] in (command,'ALL')]
        if not any(p['permissive']=='PERMISSIVE' for p in policies):verified[command]='default-deny';continue
        guards=[p for p in policies if p['permissive']=='RESTRICTIVE' and p['roles']==['public']
                and (command=='INSERT' or normalize(p.get('using'))==expected)
                and (command=='DELETE' or normalize(p.get('check'))==expected)]
        if not guards:
            names = [p.get('name', '<unnamed>') for p in policies if p['permissive'] == 'PERMISSIVE']
            raise AuditFailure('policy-enforcement', 'Cannot prove game bucket is read-only for ' + command +
                               '; candidate permissive policies: ' + json.dumps(names, ensure_ascii=True) +
                               '. This is not proof of an exploit: review policy predicates and applicable roles before proposing a bucket-specific restrictive guard. No policies changed.')
        verified[command]=guards[0]['name']
    return dict(bucket=bucket,verified=True,rolesChecked=[r['name'] for r in roles],writeGuards=verified,policyChangesPerformed=False)

def validate_response(raw):
    try:
        metadata = json.loads(raw)
        if not isinstance(metadata, dict) or not isinstance(metadata.get('rowSecurity'), bool):
            raise ValueError()
        roles, policies = metadata.get('roles'), metadata.get('policies')
        if not isinstance(roles, list) or not isinstance(policies, list):
            raise ValueError()
        for role in roles:
            if not isinstance(role, dict) or not isinstance(role.get('name'), str):
                raise ValueError()
        for policy in policies:
            if not isinstance(policy, dict) or not isinstance(policy.get('name'), str):
                raise ValueError()
            if policy.get('command') not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL') or policy.get('permissive') not in ('PERMISSIVE', 'RESTRICTIVE'):
                raise ValueError()
            if not isinstance(policy.get('roles'), list) or not all(isinstance(r, str) for r in policy['roles']):
                raise ValueError()
            if any(policy.get(k) is not None and not isinstance(policy[k], str) for k in ('using', 'check')):
                raise ValueError()
        return metadata
    except (ValueError, TypeError):
        raise AuditFailure('sql-or-response', 'Unexpected catalog response or storage.objects was not found. Expected one JSON object with roles, RLS and policies; raw output withheld.') from None


def run_audit():
    dsn = os.environ.get('SUPABASE_POLICY_DATABASE_URL')
    if not dsn:
        raise AuditFailure('invalid-connection', 'Set SUPABASE_POLICY_DATABASE_URL to the intended project read-only Session Pooler connection.')
    env = connection_environment(dsn)
    try:
        version = subprocess.run(['psql', '--version'], env=env, capture_output=True, text=True, timeout=10)
        match = re.search(r'PostgreSQL\) (\d+)', version.stdout)
        if version.returncode or not match or int(match[1]) < 16:
            raise AuditFailure('invalid-connection', 'psql/libpq 16 or newer is required for system root certificate support.')
        with tempfile.TemporaryDirectory(prefix='seven-emirates-policy-') as directory:
            trust = configure_trust(env, directory)
            result = subprocess.run(['psql', '-X', '-w', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
                                     '-v', 'VERBOSITY=verbose', '-c', SQL],
                                    env=env, capture_output=True, text=True, timeout=45)
        if result.returncode:
            raise classify_postgres_error(result.stderr)
        try:
            report = audit(validate_response(result.stdout.strip()))
        except AuditFailure:
            raise
        except ValueError as error:
            # audit() has only fixed reviewed errors; raw query output stays private.
            raise AuditFailure('policy-enforcement', str(error)) from None
        report['connection'] = dict(projectMatched=True, mode='session-pooler' if env['PGHOST'].endswith('.pooler.supabase.com') else 'direct',
                                    port=5432, databaseMatched=True, tlsMode='verify-full', trustSource=trust)
        return report
    except FileNotFoundError:
        raise AuditFailure('invalid-connection', 'psql is not installed; install PostgreSQL client 16 or newer.') from None
    except subprocess.TimeoutExpired:
        raise AuditFailure('network', 'Database client timed out; check endpoint reachability and database availability. No raw client output is exposed.') from None
    except OSError:
        raise AuditFailure('unexpected', 'Database client could not execute; inspect runner setup through secure administrator diagnostics.') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    try:
        report = run_audit()
    except AuditFailure as error:
        report = dict(bucket=BUCKET, verified=False, category=error.category, message=str(error), policyChangesPerformed=False)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + '\n')
        raise SystemExit('Policy audit [' + error.category + ']: ' + str(error)) from None
    except Exception:
        # No traceback, exception text, process args or environment on unexpected failures.
        raise SystemExit('Policy audit [unexpected]: Internal audit failure; raw details withheld. No publication authorized.') from None
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print('Storage bucket client-write audit passed; no policies changed.')


if __name__ == '__main__':
    main()
