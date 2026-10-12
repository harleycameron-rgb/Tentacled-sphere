import json
import math
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit


def geometry(seed=1.0, delta=0.1137):
    if not math.isfinite(seed) or not math.isfinite(delta):
        raise ValueError("seed and delta must be finite numbers")

    tentacles = []
    for index in range(8):
        value = seed + index * delta
        if not math.isfinite(value):
            raise ValueError("geometry sequence must remain finite")
        z = 1 - 2 * (index + 0.5) / 8
        radius = math.sqrt(1 - z * z)
        tentacles.append({
            "index": index,
            "value": value,
            "vector": [radius * math.cos(value), radius * math.sin(value), z],
            "curvature": 1 / radius,
        })

    curvatures = [tentacle["curvature"] for tentacle in tentacles]
    return {
        "seed": seed,
        "delta": delta,
        "tentacles": tentacles,
        "curvature": {
            "min": min(curvatures),
            "max": max(curvatures),
            "mean": sum(curvatures) / len(curvatures),
        },
    }


def parameter(query, name, default):
    values = query.get(name)
    if values is not None and len(values) != 1:
        raise ValueError(f"{name} must be specified once")
    raw = values[0] if values is not None else os.environ.get(name.upper(), default)
    try:
        value = float(raw)
    except (ValueError, OverflowError):
        raise ValueError(f"{name} must be a finite number") from None
    if not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number")
    return value


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path != "/api/tentacled-sphere":
            self.send_json(404, {"error": "Not found"})
            return
        try:
            query = parse_qs(url.query, keep_blank_values=True, max_num_fields=32)
            result = geometry(
                parameter(query, "seed", "1.0"),
                parameter(query, "delta", "0.1137"),
            )
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        self.send_json(200, result)

    def send_json(self, status, data):
        body = json.dumps(data, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("PORT", "8000"))), handler)
    print(f"Listening at http://127.0.0.1:{server.server_port}/api/tentacled-sphere")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
