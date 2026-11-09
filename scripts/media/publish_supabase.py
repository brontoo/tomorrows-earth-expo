#!/usr/bin/env python3
"""Plan, resume and verify immutable public media delivery. No credentials are written to disk.

Default is a local plan. --apply requires secure environment configuration.
All existing objects are downloaded and SHA-256 verified, never blindly overwritten.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import threading
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "https://hjqyhybgitdizfhwpdcv.supabase.co"
BUCKET = "seven-emirates-game"

def sha(data): return hashlib.sha256(data).hexdigest()

def management_headers(token):
    """New Secret API keys are not JWTs. Storage authorization is proved by ensure_bucket()."""
    if token.startswith("sb_secret_"):
        return {"apikey":token}
    try:
        parts=token.split('.')
        payload=json.loads(base64.urlsafe_b64decode(parts[1]+'='*(-len(parts[1])%4))) if len(parts)==3 else {}
    except (ValueError,IndexError):payload={}
    if not isinstance(payload,dict) or payload.get('role')!='service_role':
        raise ValueError('Use a Supabase Secret API key or legacy service-role JWT, never a publishable/anon/user key')
    return {"apikey":token,"Authorization":"Bearer "+token}

def validate_public_response(obj,body,headers):
    if headers.get_content_type() != obj["contentType"]: raise ValueError(f"Remote MIME type mismatch: {obj['key']}")
    if len(body) != obj["size"] or sha(body) != obj["sha256"]: raise ValueError(f"Remote bytes differ; immutable object will not be overwritten: {obj['key']}")
    if headers.get("Content-Length") and int(headers["Content-Length"]) != obj["size"]: raise ValueError("Remote content length mismatch")

def build_plan(root, bucket=BUCKET):
    root = root.resolve()
    raw = (root / "manifest.json").read_bytes()
    manifest = json.loads(raw)
    version = manifest["mediaVersion"]
    if not re.fullmatch(r"[A-Za-z0-9_-][A-Za-z0-9._-]*", version): raise ValueError("Unsafe media version")
    if not re.fullmatch(r"seven-emirates-[a-z0-9-]+", bucket): raise ValueError("Use a dedicated seven-emirates-* bucket, never student upload storage")
    if manifest["frameCount"] != 1673 or len(manifest["frames"]) != 1673: raise ValueError("Unexpected sequence count")
    objects = []
    seen = set()
    for index, frame in enumerate(manifest["frames"]):
        key = frame["url"]
        local = (root / key).resolve()
        if frame["index"] != index or frame["width"] != 1920 or frame["height"] != 1080 or not local.is_relative_to(root) or key in seen: raise ValueError("Invalid frame mapping")
        seen.add(key)
        data = local.read_bytes()
        if len(data) != frame["byteLength"] or sha(data) != frame["sha256"]: raise ValueError(f"Local frame integrity mismatch: {key}")
        objects.append(dict(key=version+"/"+key, path=str(local), size=len(data), sha256=sha(data), contentType="image/webp"))
    # Publish the manifest only after every frame succeeds.
    objects.append(dict(key=version+"/manifest.json", path=str(root/"manifest.json"), size=len(raw), sha256=sha(raw), contentType="application/json"))
    return dict(mediaVersion=version, manifestSha256=sha(raw), bucket=bucket, objectCount=len(objects), objects=objects)

class NoManagementRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): raise ValueError("Management redirects are refused")

class SupabaseDelivery:
    def __init__(self, project, bucket, token):
        parsed = urllib.parse.urlsplit(project)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/"): raise ValueError("Use the HTTPS project origin only")
        self.project, self.bucket, self.token = project.rstrip("/"), bucket, token
        context = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
        self.opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=context), NoManagementRedirects())
    def request(self, path, method="GET", data=None, content_type=None, private=False, extra_headers=None):
        headers = {"Accept-Encoding":"identity"}
        if private: headers.update(management_headers(self.token))
        if extra_headers:headers.update(extra_headers)
        if content_type: headers["Content-Type"] = content_type
        if method == "POST" and "/object/" in path: headers.update({"x-upsert":"false","cache-control":"max-age=31536000"})
        request = urllib.request.Request(self.project+path, method=method, data=data, headers=headers)
        with self.opener.open(request, timeout=60) as response: return response.read(), response.headers
    def public_path(self, key): return "/storage/v1/object/public/"+urllib.parse.quote(self.bucket,safe="")+"/"+urllib.parse.quote(key,safe="/")
    def ensure_bucket(self, create=False):
        path = "/storage/v1/bucket/"+urllib.parse.quote(self.bucket,safe="")
        try: body,_ = self.request(path,private=True)
        except urllib.error.HTTPError as error:
            if not create or error.code not in (400,404): raise RuntimeError(f"Bucket lookup failed (HTTP {error.code}); check project, bucket and management credential") from None
            payload=json.dumps(dict(id=self.bucket,name=self.bucket,public=True,file_size_limit=20*1024*1024,allowed_mime_types=["image/webp","application/json"])).encode()
            self.request("/storage/v1/bucket",method="POST",data=payload,content_type="application/json",private=True)
            body,_=self.request(path,private=True)
        metadata=json.loads(body)
        if metadata.get("id",metadata.get("name")) != self.bucket: raise ValueError("Storage returned the wrong bucket")
        if metadata.get("public") is not True: raise ValueError("Game delivery requires the dedicated public bucket")
        return metadata
    def verify(self, obj):
        try: body,headers = self.request(self.public_path(obj["key"]))
        except urllib.error.HTTPError as error:
            # Supabase's missing-object response may use HTTP 400. Never treat auth/policy errors as missing.
            if error.code == 404: return False
            if error.code == 400:
                try: missing=json.loads(error.read()).get("error") == "not_found"
                except (ValueError,AttributeError): missing=False
                if missing: return False
            raise RuntimeError(f"Public object read failed (HTTP {error.code})") from None
        validate_public_response(obj,body,headers)
        return True
    def upload_and_verify(self, obj):
        if self.verify(obj): return "verified-existing"
        path="/storage/v1/object/"+urllib.parse.quote(self.bucket,safe="")+"/"+urllib.parse.quote(obj["key"],safe="/")
        data=Path(obj["path"]).read_bytes()
        if sha(data)!=obj["sha256"]: raise ValueError("Local file changed since planning")
        status="uploaded-and-verified"
        try: self.request(path,method="POST",data=data,content_type=obj["contentType"],private=True)
        except urllib.error.HTTPError as error:
            if error.code not in (400,409): raise RuntimeError(f"Upload failed (HTTP {error.code})") from None
            # Another resumable worker/process may have uploaded it. Read and verify; never upsert.
            status="verified-existing"
        if not self.verify(obj): raise ValueError("Uploaded object is still missing")
        return status

def publish(plan, delivery, checkpoint, workers=3):
    checkpoint=checkpoint.resolve()
    state=dict(mediaVersion=plan["mediaVersion"],manifestSha256=plan["manifestSha256"],verified={})
    if checkpoint.exists():
        previous=json.loads(checkpoint.read_text())
        if any(previous.get(k)!=state[k] for k in ("mediaVersion","manifestSha256")): raise ValueError("Checkpoint belongs to different media; use a new checkpoint")
    lock=threading.Lock()
    def one(obj):
        status=delivery.upload_and_verify(obj)
        with lock:
            state["verified"][obj["key"]]=dict(sha256=obj["sha256"],status=status)
            checkpoint.parent.mkdir(parents=True,exist_ok=True)
            temp=checkpoint.with_suffix(checkpoint.suffix+".tmp")
            temp.write_text(json.dumps(state,indent=2)+"\n");os.replace(temp,checkpoint)
        return status
    pool=ThreadPoolExecutor(max_workers=workers)
    futures=[pool.submit(one,obj) for obj in plan["objects"][:-1]]
    try:
        for future in as_completed(futures):future.result()
    except Exception:
        for future in futures:future.cancel()
        raise
    finally:pool.shutdown(wait=True,cancel_futures=True)
    one(plan["objects"][-1])
    return len(state["verified"])

if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root",type=Path,required=True)
    parser.add_argument("--project",default=os.environ.get("SEVEN_EMIRATES_SUPABASE_URL",PROJECT))
    parser.add_argument("--bucket",default=os.environ.get("SEVEN_EMIRATES_BUCKET",BUCKET))
    parser.add_argument("--checkpoint",type=Path,default=Path("/workspace/media/seven-emirates/upload-checkpoint.json"))
    parser.add_argument("--workers",type=int,choices=range(1,5),default=3)
    parser.add_argument("--apply",action="store_true")
    parser.add_argument("--create-bucket",action="store_true")
    parser.add_argument("--report",type=Path,help="Credential-free successful publication summary")
    args=parser.parse_args()
    plan=build_plan(args.root,args.bucket)
    print(json.dumps({k:v for k,v in plan.items() if k!="objects"},indent=2))
    if args.apply:
        token=os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not token: raise SystemExit("Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY securely before --apply; never use client/VITE variables")
        try:
            remote=SupabaseDelivery(args.project,args.bucket,token)
            remote.ensure_bucket(args.create_bucket)
            count=publish(plan,remote,args.checkpoint,args.workers)
            verified=json.loads(args.checkpoint.read_text())["verified"]
            summary=dict(mediaVersion=plan["mediaVersion"],manifestSha256=plan["manifestSha256"],project=remote.project,bucket=remote.bucket,
                         verifiedTotal=count,uploaded=sum(v['status']=='uploaded-and-verified' for v in verified.values()),
                         alreadyVerified=sum(v['status']=='verified-existing' for v in verified.values()),
                         manifestUrl=remote.project+remote.public_path(plan["mediaVersion"]+"/manifest.json"))
            if args.report:
                args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(summary,indent=2)+'\n')
            print(f"Remote verified objects: {count}")
            print("Public version base:",remote.project+remote.public_path(plan["mediaVersion"]+"/"))
        except Exception as error:
            # Avoid printing HTTP request headers or credential-bearing exception details.
            detail=str(error) if isinstance(error,(ValueError,RuntimeError)) else (f"HTTP {error.code}" if isinstance(error,urllib.error.HTTPError) else "Check network access and checkpoint")
            raise SystemExit(f"Publication incomplete ({type(error).__name__}): {detail}. No remote-readiness claim.") from None
    else: print("Plan only: no remote requests, uploads or bucket changes were performed.")
