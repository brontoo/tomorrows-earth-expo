#!/usr/bin/env python3
"""Read-only, fail-closed storage RLS audit. Never creates or changes policies."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
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

def connection_environment(dsn):
    u=urllib.parse.urlsplit(dsn);ref=urllib.parse.urlsplit(PROJECT).hostname.split('.')[0]
    user=urllib.parse.unquote(u.username or '')
    if u.scheme not in ('postgres','postgresql') or not u.hostname or not user or not u.password:raise ValueError('Invalid read-only policy database connection')
    direct=u.hostname=='db.'+ref+'.supabase.co'
    pooler=u.hostname.endswith('.pooler.supabase.com') and user.endswith('.'+ref)
    if not (direct or pooler):raise ValueError('Policy database must belong to the intended Supabase project')
    env={k:v for k,v in os.environ.items() if not k.startswith('PG') and k not in ('SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_POLICY_DATABASE_URL')}
    env.update(PGHOST=u.hostname,PGPORT=str(u.port or 5432),PGUSER=user,PGPASSWORD=urllib.parse.unquote(u.password),PGDATABASE=urllib.parse.unquote(u.path.lstrip('/')) or 'postgres',
               PGSSLMODE='verify-full',PGSSLROOTCERT=os.environ.get('SUPABASE_POLICY_SSLROOTCERT','system'),PGCONNECT_TIMEOUT='15',PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=15000')
    return env

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
        if not guards:raise ValueError('Cannot prove game bucket is read-only for '+command+'; administrator policy review is required')
        verified[command]=guards[0]['name']
    return dict(bucket=bucket,verified=True,rolesChecked=[r['name'] for r in roles],writeGuards=verified,policyChangesPerformed=False)

def run_audit():
    dsn=os.environ.get('SUPABASE_POLICY_DATABASE_URL')
    if not dsn:raise ValueError('Set SUPABASE_POLICY_DATABASE_URL to a read-only connection for storage policy inspection')
    result=subprocess.run(['psql','-X','-w','-A','-t','-v','ON_ERROR_STOP=1','-c',SQL],env=connection_environment(dsn),capture_output=True,text=True,timeout=45)
    if result.returncode:raise ValueError('Read-only database policy query failed; verify psql 16+, TLS, connection and catalog-read permission')
    try:return audit(json.loads(result.stdout.strip()))
    except (json.JSONDecodeError,AttributeError):raise ValueError('Storage policy metadata was unavailable') from None

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--report',type=Path,required=True);args=parser.parse_args()
    try:
        report=run_audit();args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,indent=2)+'\n');print('Storage bucket client-write audit passed; no policies changed.')
    except (ValueError,subprocess.TimeoutExpired,FileNotFoundError) as error:
        message=str(error) if isinstance(error,ValueError) else 'Policy auditor requires a reachable read-only connection and psql 16+'
        raise SystemExit(message) from None
