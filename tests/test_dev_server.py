import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import urlopen

from scripts.build_web import APPS
from scripts.dev_server import WebHandler


class IntegratedServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), WebHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def fetch(self, path):
        return urlopen(self.base_url + path, timeout=5)

    def test_home_all_standalone_routes_and_api_are_served_together(self):
        with self.fetch("/") as response:
            self.assertEqual(response.status, 200)
            self.assertIn('data-app="home"', response.read().decode("utf-8"))

        for app_id, _ in APPS:
            for route in (f"/apps/{app_id}.html", f"/{app_id}", f"/{app_id}/"):
                with self.subTest(route=route), self.fetch(route) as response:
                    self.assertEqual(response.status, 200)
                    self.assertIn(
                        f'data-app="{app_id}"',
                        response.read().decode("utf-8"),
                    )

        with self.fetch("/api/tentacled-sphere?seed=1.0&delta=0.1137") as response:
            payload = json.loads(response.read())
            self.assertEqual(response.status, 200)
            self.assertEqual(len(payload["tentacles"]), 8)
            self.assertEqual([arm["index"] for arm in payload["tentacles"]], list(range(8)))


if __name__ == "__main__":
    unittest.main()
