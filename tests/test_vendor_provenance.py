import hashlib
import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("src"):
            self.paths.append(attrs["src"])
        if tag == "link" and attrs.get("href"):
            self.paths.append(attrs["href"])


class VendorProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.record = json.loads((ROOT / "vendor/provenance.json").read_text())

    def test_all_imports_have_pins_hashes_and_explained_source_changes(self):
        entries = self.record["imports"]
        self.assertEqual(len(entries), 30)
        seen = set()
        for entry in entries:
            source = self.record["sources"][entry["source"]]
            self.assertRegex(source["revision"], r"^[0-9a-f]{40}$")
            self.assertRegex(entry["original_sha256"], r"^[0-9a-f]{64}$")
            destination = Path(source["destination_root"]) / entry["path"]
            self.assertNotIn(destination, seen)
            seen.add(destination)
            data = (ROOT / destination).read_bytes()
            changed = hashlib.sha256(data).hexdigest() != entry["original_sha256"]
            self.assertEqual(changed, bool(entry["changes"]), str(destination))
            if changed:
                self.assertEqual(
                    hashlib.sha256(data).hexdigest(),
                    self.record["adapted_sha256"][destination.as_posix()],
                )
            for explanation in entry["changes"]:
                self.assertTrue(self.record["modification_notes"][explanation])
        expected = set()
        for source in self.record["sources"].values():
            for file in (ROOT / source["destination_root"]).rglob("*"):
                if file.is_file() and file.relative_to(ROOT).as_posix() not in self.record["local_adapters"]:
                    expected.add(file.relative_to(ROOT))
        self.assertEqual(seen, expected)

    def test_runtime_dependencies_are_local_and_complete(self):
        for folder in ["vendor/tap", "vendor/previews/site"]:
            for page in (ROOT / folder).rglob("*.html"):
                parser = Resources()
                parser.feed(page.read_text())
                for resource in parser.paths:
                    self.assertNotRegex(resource, r"^(?:https?:)?//")
                    self.assertTrue((page.parent / resource).is_file(), (page, resource))
            for css in (ROOT / folder).rglob("*.css"):
                self.assertFalse(re.search(r"@import\s|url\(\s*['\"]?https?://", css.read_text()))
        manifest = json.loads((ROOT / "vendor/tap/manifest.webmanifest").read_text())
        for icon in manifest["icons"]:
            self.assertTrue((ROOT / "vendor/tap" / icon["src"]).is_file())

    def test_original_notices_and_service_worker_boundary_are_preserved(self):
        notices = ROOT / "vendor/previews/docs/upstream-notices"
        self.assertIn("MIT License", (notices / "Invariant-Surface-LICENSE.txt").read_text())
        self.assertIn("Apache License", (notices / "WaxTablet-LICENSE.txt").read_text())
        self.assertIn("Harley Cameron", (notices / "WaxTablet-NOTICE.txt").read_text())
        self.assertNotIn("serviceWorker.register", (ROOT / "vendor/tap/index.html").read_text())
        self.assertFalse(list((ROOT / "vendor").rglob("*.md")))


if __name__ == "__main__":
    unittest.main()
