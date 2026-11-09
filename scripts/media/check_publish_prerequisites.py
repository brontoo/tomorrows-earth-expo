#!/usr/bin/env python3
"""Read-only Storage connectivity and credential/header compatibility check."""
import argparse
import json
import os
from pathlib import Path
from publish_supabase import PROJECT,BUCKET,SupabaseDelivery,management_headers

def check():
    key=os.environ.get('SUPABASE_SECRET_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not key:raise ValueError('Configure SUPABASE_SECRET_KEY in the protected GitHub environment (legacy SUPABASE_SERVICE_ROLE_KEY is optional fallback)')
    management_headers(key)
    delivery=SupabaseDelivery(PROJECT,BUCKET,key)
    # An authenticated Storage API GET proves the chosen key/header scheme works.
    delivery.ensure_bucket(create=False)
    return dict(project=PROJECT,bucket=BUCKET,connectivityVerified=True,publicBucketVerified=True,
                credentialKind='secret-api-key' if key.startswith('sb_secret_') else 'legacy-service-role-jwt',bucketChangesPerformed=False)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--report',type=Path,required=True);args=p.parse_args()
    try:
        result=check();args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(result,indent=2)+'\n');print('Authenticated Storage read and public bucket checks passed; no objects or policies changed.')
    except Exception as error:
        detail=str(error) if isinstance(error,(ValueError,RuntimeError)) else type(error).__name__
        raise SystemExit('Publishing prerequisites not satisfied: '+detail) from None
