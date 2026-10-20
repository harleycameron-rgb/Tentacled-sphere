import json
import tempfile
import unittest
from pathlib import Path
from urllib.error import HTTPError

from scripts.build_web import ROOT, INTERFACES, build
from test_dev_server import IntegratedServerTests


class InvariantBuildTests(unittest.TestCase):
    def test_all_interfaces_and_complete_local_source_assets_are_built(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            self.assertTrue(build(output))
            for interface in ("", *INTERFACES):
                page = output / "invariant" / interface / "index.html"
                self.assertIn("liveGate=CLOSED", page.read_text())
                self.assertIn("/web/coordinate-adapter.js", page.read_text())
            for source in (ROOT / "vendor").rglob("*"):
                if source.is_file():
                    self.assertEqual(source.read_bytes(),
                                     (output / source.relative_to(ROOT)).read_bytes())
            self.assertTrue(build(output, check=True))
            asset = output / "vendor" / "previews" / "site" / "surface" / "model.js"
            asset.write_text("stale")
            self.assertFalse(build(output, check=True))

    def test_production_interface_rewrites_keep_supported_output(self):
        config = json.loads((ROOT / "vercel.json").read_text())
        rewrites = {r["source"]: r["destination"] for r in config["rewrites"]}
        self.assertEqual(config["outputDirectory"], "public")
        for interface in INTERFACES:
            self.assertEqual(rewrites[f"/invariant/{interface}"],
                             f"/invariant/{interface}/index.html")
        self.assertEqual(rewrites["/api/tentacled-sphere"], "/api/index.py")


class InvariantServerTests(IntegratedServerTests):
    def test_direct_routes_reload_with_local_dependencies(self):
        for interface in INTERFACES:
            for suffix in ("", "/"):
                with self.subTest(interface=interface, suffix=suffix):
                    with self.fetch(f"/invariant/{interface}{suffix}") as response:
                        self.assertIn("INVARIANT", response.read().decode())
        for asset in ("/web/invariant-session.js", "/vendor/tap/sentinel_dot.js",
                      "/vendor/tap/icon-192.png", "/vendor/previews/site/surface/model.js",
                      "/vendor/previews/site/manifest/core.js"):
            with self.fetch(asset) as response:
                self.assertEqual(response.status, 200)
        with self.assertRaises(HTTPError) as error:
            self.fetch("/invariant/engine.input")
        self.assertEqual(error.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
