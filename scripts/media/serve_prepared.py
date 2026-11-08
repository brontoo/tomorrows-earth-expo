#!/usr/bin/env python3
"""Local-only public-media server for testing the separately configured asset base URL."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class MediaHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True)
    parser.add_argument("--port", type=int, default=4180)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(MediaHandler, directory=args.root))
    print(f"Serving prepared imagery locally on port {args.port}", flush=True)
    server.serve_forever()
