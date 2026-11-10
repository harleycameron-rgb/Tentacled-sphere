"""Source-level regression checks for the human-frame observation glass.

These tests check markup and event wiring, not actual browser security or
physical impermeability. They must not be represented as invariant proofs.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "web" / "app-template.html"
SCRIPT = ROOT / "web" / "app.js"
CSS = ROOT / "web" / "style.css"


class HumanObservationGlassTests(unittest.TestCase):
    def test_glass_contains_svg_but_not_simulation_controls(self):
        text = TEMPLATE.read_text(encoding="utf-8")
        start = text.index('<div class="human-observation-glass"')
        end = text.index("</div>\n            <p id=\"geometry-report\"", start)
        glass = text[start:end]
        self.assertIn('id="sphere"', glass)
        self.assertIn("SENTINEL LINEAGE FIXED", glass)
        self.assertIn("NO OBSERVER OPERATION", glass)
        for token in ('id="apply-centre"', 'id="fire-sentinel"',
                      'id="start-sensors"', 'id="actual-input-fire"'):
            self.assertNotIn(token, glass)

    def test_projection_is_not_an_input_surface(self):
        css = CSS.read_text(encoding="utf-8")
        self.assertIn(".human-observation-glass #sphere {", css)
        self.assertIn("pointer-events: none", css)
        self.assertIn("touch-action: none", css)

    def test_observation_feed_does_not_auto_ignite(self):
        text = SCRIPT.read_text(encoding="utf-8")
        self.assertNotIn("feedTimer", text)
        self.assertNotIn('setTimeout(() => runSerial(() => ignite(readControls()))', text)

    def test_pages_regenerated_from_template(self):
        source = TEMPLATE.read_text(encoding="utf-8")
        names = (("home", "Integrated view"), ("tap", "Tap"),
                 ("surface", "Surface"), ("spiritlevel", "SpiritLevel"),
                 ("gain", "Gain"), ("habitat", "Habitat"), ("time", "Time"),
                 ("space", "Space"), ("lineage", "Lineage"))
        for app, title in names:
            path = ROOT / ("index.html" if app == "home" else f"apps/{app}.html")
            expected = source.replace("__APP_ID__", app).replace("__TITLE__", title)
            with self.subTest(app=app):
                self.assertEqual(path.read_text(encoding="utf-8"), expected)


if __name__ == "__main__":
    unittest.main()
