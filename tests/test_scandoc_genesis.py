import copy
import unittest
from scandoc_genesis import FACE_ORDER, candidate_snapshot, validate_candidate


class GenesisCandidateTests(unittest.TestCase):
    def setUp(self):
        self.faces = {name: {"axis": i // 2, "pole": i % 2, "value": i}
                      for i, name in enumerate(FACE_ORDER)}

    def test_six_face_candidate_is_exactly_1536_bits(self):
        receipt = candidate_snapshot(self.faces, "sentinel-1")
        self.assertEqual(len(bytes.fromhex(receipt["snapshot_hex"])), 192)
        self.assertEqual(receipt["snapshot_bits"], 1536)
        self.assertEqual(receipt["liveGate"], "CLOSED")
        self.assertFalse(receipt["sphereWrites"])
        self.assertTrue(validate_candidate(receipt, self.faces))

    def test_input_order_does_not_change_snapshot(self):
        reverse = dict(reversed(list(self.faces.items())))
        self.assertEqual(candidate_snapshot(reverse, "sentinel-1")["snapshot_hex"],
                         candidate_snapshot(self.faces, "sentinel-1")["snapshot_hex"])

    def test_tampering_is_rejected(self):
        receipt = candidate_snapshot(self.faces, "sentinel-1")
        changed = copy.deepcopy(self.faces)
        changed["tap"]["value"] = 99
        self.assertFalse(validate_candidate(receipt, changed))
        altered = dict(receipt, qualified=True)
        self.assertFalse(validate_candidate(altered, self.faces))

    def test_invalid_faces_and_nonfinite_rejected(self):
        with self.assertRaises(ValueError):
            candidate_snapshot({"tap": {}}, "sentinel-1")
        with self.assertRaises(ValueError):
            candidate_snapshot(dict(self.faces, tap=float("nan")), "sentinel-1")
        with self.assertRaises(PermissionError):
            candidate_snapshot(self.faces, "sentinel-1", qualified=True)

    def test_genesis_identity_changes_commitments(self):
        self.assertNotEqual(candidate_snapshot(self.faces, "sentinel-1")["snapshot_hex"],
                            candidate_snapshot(self.faces, "sentinel-2")["snapshot_hex"])


if __name__ == "__main__":
    unittest.main()
