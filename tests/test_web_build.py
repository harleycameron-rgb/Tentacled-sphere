import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_web import APPS, ROOT, build


class WebBuildTests(unittest.TestCase):
    def test_generates_all_pages_from_the_shared_template_and_copies_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            self.assertTrue(build(output))
            self.assertTrue((output / "index.html").is_file())
            for app_id, _ in APPS:
                page = (output / "apps" / f"{app_id}.html").read_text(encoding="utf-8")
                self.assertIn(f'data-app="{app_id}"', page)
                self.assertIn("/web/app.js", page)
                self.assertNotIn("__APP_ID__", page)
            for asset in ("geometry.js", "protocol.js", "audio.js", "app.js", "style.css"):
                self.assertEqual(
                    (output / "web" / asset).read_bytes(),
                    (ROOT / "web" / asset).read_bytes(),
                )

    def test_check_mode_detects_stale_generated_html(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            self.assertTrue(build(output))
            (output / "apps" / "tap.html").write_text("stale", encoding="utf-8")
            self.assertFalse(build(output, check=True))

    def test_vercel_rewrites_keep_api_and_both_short_app_routes(self):
        configuration = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
        rewrites = {
            route["source"]: route["destination"]
            for route in configuration["rewrites"]
        }
        self.assertEqual(rewrites["/api/tentacled-sphere"], "/api/index.py")
        self.assertEqual(configuration["outputDirectory"], "public")
        for app_id, _ in APPS:
            destination = f"/apps/{app_id}.html"
            self.assertEqual(rewrites[f"/{app_id}"], destination)
            self.assertEqual(rewrites[f"/{app_id}/"], destination)


if __name__ == "__main__":
    unittest.main()
