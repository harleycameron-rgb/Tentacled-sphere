import unittest
from scandoc_qualification import qualify_faces


class QualificationTests(unittest.TestCase):
    def setUp(self):
        self.faces = {
            "tap": {"vector": [1, 0, 0]},
            "surface": {"vector": [-1, 0, 0]},
            "gain": {"vector": [0, 1, 0]},
            "habitat": {"vector": [0, -1, 0]},
            "engine": {"vector": [0, 0, 1]},
            "business": {"vector": [0, 0, -1]},
        }

    def test_valid_geometry_does_not_open_native_gate(self):
        result = qualify_faces(self.faces)
        self.assertTrue(result["valid"])
        self.assertEqual(result["gate"], "CLOSED")
        self.assertFalse(result["native_burn_authorized"])

    def test_missing_face(self):
        self.faces.pop("business")
        self.assertFalse(qualify_faces(self.faces)["valid"])

    def test_rejects_non_opposite_pair(self):
        self.faces["surface"] = {"vector": [0, -1, 0]}
        self.assertFalse(qualify_faces(self.faces)["valid"])

    def test_rejects_non_orthogonal_axes(self):
        self.faces["gain"] = {"vector": [1, 0, 0]}
        self.faces["habitat"] = {"vector": [-1, 0, 0]}
        self.assertFalse(qualify_faces(self.faces)["valid"])

    def test_rejects_nan_zero_and_extra_axes(self):
        for vector in ([float("nan"), 0, 0], [0, 0, 0], [1, 0, 0, 0]):
            self.faces["tap"] = {"vector": vector}
            self.assertFalse(qualify_faces(self.faces)["valid"])

    def test_tolerance_must_be_bounded(self):
        for tolerance in (0, -1, 1, float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                qualify_faces(self.faces, tolerance)


if __name__ == "__main__":
    unittest.main()
