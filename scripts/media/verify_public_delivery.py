#!/usr/bin/env python3
"""Verify the published manifest, all chapter boundary samples, dimensions and public CORS."""
import argparse
from io import BytesIO
import json
from pathlib import Path
from PIL import Image
from publish_supabase import PROJECT, BUCKET, SupabaseDelivery, validate_public_response
from assemble_actions_media import validate_manifest

def sample_indices(manifest):
    return sorted({0,manifest['frameCount']-1,*[v for c in manifest['chapters'] for v in (c['startInclusive'],c['endExclusive']-1)]})

def verify(manifest_path,project=PROJECT,bucket=BUCKET,origin='https://seven-emirates-check.invalid'):
    raw=manifest_path.read_bytes();manifest,_=validate_manifest(raw)
    # Public verification never sends a management credential.
    delivery=SupabaseDelivery(project,bucket,'')
    import hashlib
    record=dict(key=manifest['mediaVersion']+'/manifest.json',contentType='application/json',size=len(raw),sha256=hashlib.sha256(raw).hexdigest())
    def read(obj):
        body,headers=delivery.request(delivery.public_path(obj['key']),extra_headers={'Origin':origin})
        validate_public_response(obj,body,headers)
        if headers.get('Access-Control-Allow-Origin') not in ('*',origin):raise ValueError('Public CORS headers do not permit the test origin')
        return body
    read(record)
    samples=[]
    for index in sample_indices(manifest):
        frame=manifest['frames'][index]
        obj=dict(key=manifest['mediaVersion']+'/'+frame['url'],contentType='image/webp',size=frame['byteLength'],sha256=frame['sha256'])
        body=read(obj)
        with Image.open(BytesIO(body)) as image:
            image.load()
            if image.format!='WEBP' or image.size!=(1920,1080):raise ValueError('Public image is not the native Full HD frame')
        samples.append(dict(index=index,url=delivery.project+delivery.public_path(obj['key']),sha256=frame['sha256'],width=1920,height=1080,corsVerified=True))
    return dict(manifestUrl=delivery.project+delivery.public_path(record['key']),manifestVerified=True,sampleCount=len(samples),samples=samples,testOrigin=origin)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--manifest',type=Path,required=True);p.add_argument('--report',type=Path,required=True);args=p.parse_args()
    try:
        result=verify(args.manifest);args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(result,indent=2)+'\n');print(f"Public manifest and {result['sampleCount']} Full HD boundary samples verified, including CORS.")
    except Exception as error:
        raise SystemExit(f'Public delivery verification failed ({type(error).__name__}); publication is not accepted.') from None
