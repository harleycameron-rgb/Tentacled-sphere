import unittest
from scripts.build_web import browser_page


class CoordinateBrowserBuildTests(unittest.TestCase):
    def test_scripts_precede_app_in_dependency_order(self):
        original = '    <script src="/web/app.js" defer></script>'
        page = browser_page(original)
        paths = ["/web/coordinates.js", "/web/coordinate-adapter.js", "/web/app.js"]
        self.assertEqual([page.count(path) for path in paths], [1, 1, 1])
        self.assertEqual([page.index(path) for path in paths], sorted(page.index(path) for path in paths))

    def test_decoration_is_idempotent(self):
        page = browser_page('    <script src="/web/app.js" defer></script>')
        self.assertEqual(browser_page(page), page)

    def test_unrelated_html_is_unchanged(self):
        page = "<html><head></head><body>Unrelated</body></html>"
        self.assertEqual(browser_page(page), page)


if __name__ == "__main__":
    unittest.main()
