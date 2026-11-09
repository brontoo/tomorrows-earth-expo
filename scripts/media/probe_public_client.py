#!/usr/bin/env python3
"""Execute the real bundled client resolver/validator/decoder in Chromium, without credentials."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from assemble_actions_media import validate_manifest,MEDIA_VERSION
from verify_public_delivery import sample_indices
from publish_supabase import PROJECT,BUCKET

def probe(bundle,manifest_path,fixture_root=None):
    manifest,_=validate_manifest(manifest_path.read_bytes())
    origin='https://seven-emirates-check.invalid'
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or None,args=['--no-sandbox'])
        page=browser.new_page()
        if fixture_root:
            prefix=PROJECT+'/storage/v1/object/public/'+BUCKET+'/'+MEDIA_VERSION+'/'
            def local(route):
                key=route.request.url.removeprefix(prefix);path=(fixture_root/key).resolve()
                if not path.is_relative_to(fixture_root.resolve()):raise ValueError('Fixture path escapes root')
                route.fulfill(body=path.read_bytes(),content_type='application/json' if key=='manifest.json' else 'image/webp',headers={'Access-Control-Allow-Origin':'*'})
            page.route(prefix+'**',local)
        page.route(origin+'/',lambda route:route.fulfill(content_type='text/html',body='<!doctype html><title>Public client delivery check</title>'))
        page.route(origin+'/probe.js',lambda route:route.fulfill(content_type='application/javascript',body=bundle.read_text()))
        page.goto(origin+'/')
        result=page.evaluate('''async ({base,version,indices}) => {
          const client=await import('/probe.js');
          const location=client.resolveAssetLocation(base,window.location.origin,version);
          const response=await fetch(location.manifestUrl,{credentials:'omit'});
          if(!response.ok)throw new Error('Public manifest request failed');
          const manifest=client.validateFrameManifest(await response.json());
          if(manifest.mediaVersion!==version)throw new Error('Wrong media version');
          for(const index of indices){const image=await client.loadFrameImage(manifest,index,location.baseUrl,new AbortController().signal);image.close();}
          return {clientResolverVerified:true,manifestUrl:location.manifestUrl,frameCount:manifest.frameCount,decodedSampleCount:indices.length,testOrigin:window.location.origin};
        }''',dict(base=PROJECT+'/storage/v1/object/public/'+BUCKET+'/',version=MEDIA_VERSION,indices=sample_indices(manifest)))
        result['remoteVerified']=fixture_root is None
        result['mode']='public-remote' if fixture_root is None else 'local-fixture-only'
        browser.close();return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--bundle',type=Path,required=True);p.add_argument('--manifest',type=Path,required=True);p.add_argument('--report',type=Path,required=True);p.add_argument('--local-fixture-root',type=Path,help='Local diagnostics only; resulting report explicitly does not verify remote delivery');args=p.parse_args()
    try:
        result=probe(args.bundle,args.manifest,args.local_fixture_root);args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(result,indent=2)+'\n');print('Client resolver, manifest validation and browser decoding passed: '+result['mode'])
    except Exception as error:raise SystemExit(f'Public client check failed ({type(error).__name__}); publication is not accepted.') from None
