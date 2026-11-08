#!/usr/bin/env python3
"""Local-only public-media server for testing the separately configured asset base URL."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class MediaHandler(SimpleHTTPRequestHandler):
    media_version = None
    def do_GET(self):
        if self.media_version and not urlsplit(self.path).path.startswith('/'+self.media_version+'/'):
            self.send_error(404);return
        super().do_GET()
    def translate_path(self, path):
        if self.media_version:
            prefix='/'+self.media_version
            if path.startswith(prefix+'/'):path=path[len(prefix):]
        return super().translate_path(path)
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "public, max-age=31536000, immutable" if self.media_version else "no-cache")
        super().end_headers()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True)
    parser.add_argument("--port", type=int, default=4180)
    parser.add_argument("--versioned",action="store_true",help="Serve under the manifest's immutable mediaVersion prefix")
    args = parser.parse_args()
    if args.versioned:MediaHandler.media_version=json.loads((Path(args.root)/'manifest.json').read_text())['mediaVersion']
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(MediaHandler, directory=args.root))
    print(f"Serving prepared imagery locally on port {args.port}", flush=True)
    server.serve_forever()
