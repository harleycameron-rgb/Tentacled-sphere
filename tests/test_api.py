import json
import math
import os
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from unittest.mock import patch

from api.index import geometry, handler


class GeometryTests(unittest.TestCase):
    def test_defaults_and_unit_vectors(self):
        result = geometry()
        self.assertEqual(result["seed"], 1.0)
        self.assertEqual(result["delta"], 0.1137)
        self.assertEqual(len(result["tentacles"]), 8)
        for index, tentacle in enumerate(result["tentacles"]):
            self.assertEqual(tentacle["index"], index)
            self.assertAlmostEqual(tentacle["value"], 1.0 + index * 0.1137)
            self.assertAlmostEqual(math.hypot(*tentacle["vector"]), 1.0)
            self.assertGreater(tentacle["curvature"], 0)
        curvatures = [item["curvature"] for item in result["tentacles"]]
        self.assertEqual(result["curvature"]["min"], min(curvatures))
        self.assertEqual(result["curvature"]["max"], max(curvatures))
        self.assertEqual(result["curvature"]["mean"], sum(curvatures) / 8)

    def test_known_vector_and_curvature(self):
        tentacle = geometry(0, 0)["tentacles"][0]
        radius = math.sqrt(1 - 0.875 ** 2)
        self.assertEqual(tentacle["vector"], [radius, 0.0, 0.875])
        self.assertEqual(tentacle["curvature"], 1 / radius)

    def test_deterministic_negative_and_zero_delta(self):
        for delta in (0, -0.5):
            with self.subTest(delta=delta):
                self.assertEqual(geometry(-2, delta), geometry(-2, delta))
                self.assertEqual(geometry(-2, delta)["tentacles"][7]["value"], -2 + 7 * delta)

    def test_nonfinite_and_overflow_rejected(self):
        for seed, delta in ((math.nan, 1), (1, math.inf), (-math.inf, 1), (1e308, 1e308)):
            with self.subTest(seed=seed, delta=delta):
                with self.assertRaises(ValueError):
                    geometry(seed, delta)


class EndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        try:
            connection.request("GET", path)
            response = connection.getresponse()
            body = response.read()
            self.assertEqual(response.getheader("Content-Type"), "application/json; charset=utf-8")
            self.assertEqual(int(response.getheader("Content-Length")), len(body))
            self.assertEqual(response.getheader("Cache-Control"), "no-store")
            return response.status, json.loads(body)
        finally:
            connection.close()

    @patch.dict(os.environ, {}, clear=True)
    def test_default_request(self):
        status, result = self.request("/api/tentacled-sphere")
        self.assertEqual(status, 200)
        self.assertEqual(result, geometry())

    @patch.dict(os.environ, {"SEED": "2.5", "DELTA": "-0.2"})
    def test_environment_defaults_and_query_overrides(self):
        self.assertEqual(self.request("/api/tentacled-sphere")[1], geometry(2.5, -0.2))
        self.assertEqual(
            self.request("/api/tentacled-sphere?seed=0&delta=0")[1], geometry(0, 0)
        )
        self.assertEqual(
            self.request("/api/tentacled-sphere?seed=3")[1], geometry(3, -0.2)
        )

    @patch.dict(os.environ, {"SEED": "invalid", "DELTA": "invalid"})
    def test_invalid_environment_can_be_overridden(self):
        self.assertEqual(self.request("/api/tentacled-sphere")[0], 400)
        self.assertEqual(self.request("/api/tentacled-sphere?seed=1&delta=0")[0], 200)

    def test_invalid_queries_return_json_errors(self):
        queries = (
            "seed=", "delta=", "seed=abc", "seed=NaN", "delta=Infinity",
            "seed=-Infinity", "seed=1e999", "seed=1&seed=2",
            "delta=1&delta=2", "seed=1e308&delta=1e308",
            "&".join(f"x{i}=1" for i in range(33)),
        )
        for query in queries:
            with self.subTest(query=query):
                status, result = self.request("/api/tentacled-sphere?" + query)
                self.assertEqual(status, 400)
                self.assertIn("error", result)

    def test_unknown_path(self):
        status, result = self.request("/missing")
        self.assertEqual(status, 404)
        self.assertEqual(result, {"error": "Not found"})


if __name__ == "__main__":
    unittest.main()
