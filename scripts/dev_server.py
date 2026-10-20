#!/usr/bin/env python3
"""Serve the generated browser pages and the existing Python API locally."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from api.index import handler as APIHandler
from scripts.build_web import browser_page

APP_ROUTES = {
    f"/{app}": f"/apps/{app}.html"
    for app in (
        "tap", "surface", "spiritlevel", "gain",
        "habitat", "time", "space", "lineage",
    )
}
APP_ROUTES.update({f"{path}/": target for path, target in tuple(APP_ROUTES.items())})


class WebHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/tentacled-sphere":
            APIHandler.do_GET(self)
            return
        if path in APP_ROUTES:
            suffix = urlsplit(self.path).query
            self.path = APP_ROUTES[path] + (f"?{suffix}" if suffix else "")
        super().do_GET()

    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir() and urlsplit(self.path).path.endswith("/"):
            path = path / "index.html"
        if path.is_file() and path.suffix == ".html":
            body = browser_page(path.read_text(encoding="utf-8")).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()

    def send_json(self, status, data):
        body = json.dumps(data, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), WebHandler)
    print(f"Serving Tentacled Sphere at http://127.0.0.1:{server.server_port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
