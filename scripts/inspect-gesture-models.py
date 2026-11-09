"""Inspect exact SHA-pinned task bundles; never extracts weights into source Git.
Only ZIP component/associated-label metadata is inspected, not camera input.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

MODELS = {
 'prototype': dict(url='https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task',sha256='a966b1d4e774e0423c19c8aa71f070e5a72fe7a03c2663dd2f3cb0b0095ee3e1'),
 'current': dict(url='https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',sha256='97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482'),
}

def inventory(data, prefix='', depth=0):
    if depth>5: raise ValueError('Unexpected model archive nesting')
    results=[]
    if not zipfile.is_zipfile(io.BytesIO(data)):return results
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if len(archive.infolist())>256:raise ValueError('Unexpected model archive inventory')
        for entry in archive.infolist():
            if entry.is_dir():continue
            if entry.file_size>128*1024*1024:raise ValueError('Unexpected model component size')
            body=archive.read(entry);name=prefix+entry.filename
            record=dict(path=name,byteLength=len(body),sha256=hashlib.sha256(body).hexdigest())
            if entry.filename.endswith('.tflite'):record['fileIdentifier']=body[4:8].decode('ascii',errors='replace')
            if 'label' in entry.filename.lower() and entry.filename.endswith('.txt') and len(body)<65536:
                record['labels']=body.decode('utf-8').splitlines()
            results.append(record)
            if entry.filename.endswith(('.task','.tflite')):
                results.extend(inventory(body,name+'/',depth+1))
    return results


def inspect(data, reference):
    sha=hashlib.sha256(data).hexdigest()
    if sha!=reference['sha256']:raise ValueError('Model SHA-256 mismatch; no substitute is accepted')
    entries=inventory(data)
    if not entries:raise ValueError('Expected task bundle ZIP metadata was unavailable')
    return dict(verified=True,sha256=sha,byteLength=len(data),components=entries,
                tfliteCompatibility='requires actual SDK 1.2.2 browser initialization; ZIP inspection alone cannot establish compatibility')


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--prototype',type=Path);p.add_argument('--current',type=Path)
    p.add_argument('--report',type=Path,required=True);a=p.parse_args()
    report=dict(hashProvenance='Owner-confirmed acceptance run 42595276281',models={},physicalCameraVerified=False,functionalCompatibility='not-tested',releaseGate='Known unequal model artifacts await physical A/B review')
    for key,reference in MODELS.items():
        try:
            path=getattr(a,key)
            if path:data=path.read_bytes()
            else:
                with urllib.request.urlopen(reference['url'],timeout=60) as response:data=response.read()
            report['models'][key]=dict(url=reference['url'],**inspect(data,reference))
        except Exception as error:report['models'][key]=dict(url=reference['url'],verified=False,expectedSha256=reference['sha256'],error=str(error))
    if all(m['verified'] for m in report['models'].values()):
        maps={key:{c['path']:c['sha256'] for c in m['components'] if c['path'].endswith('.tflite')} for key,m in report['models'].items()}
        paths=sorted(set(maps['prototype'])|set(maps['current']))
        report['sameTflitePayloads']=[p for p in paths if maps['prototype'].get(p)==maps['current'].get(p)]
        report['differentOrMissingTflitePayloads']=[p for p in paths if maps['prototype'].get(p)!=maps['current'].get(p)]
        report['possibleEffectsRequirePhysicalReview'] = {
          'gestureClassifierOrEmbedder': 'Changed payload may alter Closed_Fist/Pointing_Up scores and threshold margins.',
          'handLandmarkOrDetector': 'Changed payload may alter landmark stability, tracking loss/reacquisition and pinch geometry.',
          'packagingOnly': 'Different outer hashes alone cannot establish a behavioral difference; compare actual TFLite payloads and categories.'}
        report['sameOuterBytes']=report['models']['prototype']['sha256']==report['models']['current']['sha256']
    a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
    if not all(m['verified'] for m in report['models'].values()):raise SystemExit('Inspection incomplete; model metadata not inferred')

if __name__=='__main__':main()
