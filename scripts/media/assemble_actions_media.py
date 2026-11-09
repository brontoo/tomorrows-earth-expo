#!/usr/bin/env python3
"""Assemble the exact committed manifest and its complete pinned source export; no image transforms."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
from PIL import Image
from publish_supabase import build_plan

MANIFEST_SHA256='96e7635ce959133c36268b0028474f0737932af5dd498977e7a5d1b69a34d11f'
SOURCE_COMMIT='1bc718ef5e770033a3f00f398223abce01052fb1'
MEDIA_VERSION='7e-1bc718ef5e77'
IDS=['abu-dhabi','dubai','sharjah','ajman','umm-al-quwain','ras-al-khaimah','fujairah']

def validate_manifest(raw):
    if hashlib.sha256(raw).hexdigest()!=MANIFEST_SHA256:raise ValueError('Manifest differs from the reviewed immutable manifest')
    m=json.loads(raw)
    if m['provenance']['commit']!=SOURCE_COMMIT or m['mediaVersion']!=MEDIA_VERSION or (m['width'],m['height'],m['frameCount'])!=(1920,1080,1673):raise ValueError('Wrong provenance or native sequence dimensions/count')
    if len(m['frames'])!=1673 or len(m['chapters'])!=7:raise ValueError('Wrong sequence/chapter count')
    end=0
    for index,c in enumerate(m['chapters']):
        if c['chapterId']!=IDS[index] or c['startInclusive']!=end or not end<c['endExclusive']<=1673 or not end<=c['restingFrame']<c['endExclusive']:raise ValueError('Invalid chapter ranges')
        end=c['endExclusive']
    if end!=1673:raise ValueError('Incomplete contiguous coverage')
    keys=set()
    for index,f in enumerate(m['frames']):
        key=f['url'];parts=PurePosixPath(key).parts
        if f['index']!=index or f['width']!=1920 or f['height']!=1080 or not key.startswith('frames/') or PurePosixPath(key).is_absolute() or '..' in parts or '\\' in key or key in keys:raise ValueError('Invalid or duplicate frame key')
        keys.add(key)
    return m,keys

def assemble(source,manifest_path,output):
    source,output=source.resolve(),output.resolve()
    expo=Path(__file__).resolve().parents[2]
    if output.is_relative_to(source) or output.is_relative_to(expo):raise ValueError('Prepared images must remain outside both checkouts')
    raw=manifest_path.read_bytes();m,expected=validate_manifest(raw)
    revision=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
    if revision!=SOURCE_COMMIT:raise ValueError('Source checkout is not the pinned provenance commit')
    if subprocess.check_output(['git','-C',str(source),'status','--porcelain'],text=True).strip():raise ValueError('Source checkout must be clean')
    actual={p.relative_to(source).as_posix() for p in (source/'frames').rglob('*') if p.is_file()}
    if actual!=expected:raise ValueError('Source and manifest do not describe exactly the same 1,673 assets')
    marker=output/'.seven-emirates-actions'
    if output.exists() and any(output.iterdir()) and not marker.exists():raise ValueError('Refusing an unrelated nonempty output directory')
    output.mkdir(parents=True,exist_ok=True);marker.touch()
    for record in m['frames']:
        p=source/record['url']
        if p.is_symlink() or not p.resolve().is_relative_to(source):raise ValueError('Source frame escapes its checkout')
        data=p.read_bytes()
        if len(data)!=record['byteLength'] or hashlib.sha256(data).hexdigest()!=record['sha256']:raise ValueError('Source frame hash or byte-length mismatch')
        with Image.open(p) as image:
            if image.format!='WEBP' or image.size!=(1920,1080) or getattr(image,'n_frames',1)!=1:raise ValueError('Source is not a native Full HD still')
            image.load()
        dest=output/record['url'];dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists() and dest.read_bytes()!=data:raise ValueError('Existing prepared frame differs')
        if not dest.exists():shutil.copyfile(p,dest)
    dest=output/'manifest.json'
    if dest.exists() and dest.read_bytes()!=raw:raise ValueError('Existing prepared manifest differs')
    dest.write_bytes(raw)
    plan=build_plan(output)
    return dict(sourceCommit=revision,manifestSha256=plan['manifestSha256'],mediaVersion=MEDIA_VERSION,validatedFrames=1673,plannedObjects=plan['objectCount'])

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True);parser.add_argument('--manifest',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();print(json.dumps(assemble(args.source,args.manifest,args.output),indent=2))
