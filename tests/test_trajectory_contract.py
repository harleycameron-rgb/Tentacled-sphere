"""Negative and positive tests for the opt-in Scandoc trajectory contract."""
import math
import unittest
from api.trajectory_contract import LEGS, separate, trajectory, blunt_drift, counterflow


class TrajectoryContractTests(unittest.TestCase):
    def setUp(self):
        self.legs = {name: (0.01 * i, 0, 0) for i, name in enumerate(LEGS)}

    def samples(self):
        return [{"tick": 0, "center": (0, 0, 0)},
                {"tick": 1, "center": (1, 0, 0)}]

    def test_six_legs(self):
        self.assertEqual(separate(self.legs)["legs"], LEGS)

    def test_extra_leg_rejected(self):
        with self.assertRaises(ValueError):
            separate(dict(self.legs, extra=(0, 0, 0)))

    def test_missing_leg_rejected(self):
        with self.assertRaises(ValueError):
            separate({k: v for k, v in self.legs.items() if k != "tap"})

    def test_outlier_rejected_not_hidden_by_median(self):
        self.legs["tap"] = (100, 0, 0)
        with self.assertRaises(ValueError):
            separate(self.legs)

    def test_nonfinite_leg_rejected(self):
        self.legs["tap"] = (math.nan, 0, 0)
        with self.assertRaises(ValueError):
            separate(self.legs)

    def test_separation_has_no_trajectory(self):
        self.assertIsNone(separate(self.legs)["trajectory"])

    def test_post_separation_trajectory(self):
        result = trajectory(separate(self.legs), self.samples())
        self.assertEqual(len(result["trajectory"]), 2)
        self.assertEqual(result["future"], "NO_FORWARD_OF_NOW")
        self.assertEqual(result["temporal_tentacles"], ("past", "future"))

    def test_one_sample_rejected(self):
        with self.assertRaises(ValueError):
            trajectory(separate(self.legs), self.samples()[:1])

    def test_negative_tick_rejected(self):
        with self.assertRaises(ValueError):
            trajectory(separate(self.legs), [{"tick": -1, "center": (0, 0, 0)},
                                             self.samples()[1]])

    def test_duplicate_tick_rejected(self):
        with self.assertRaises(ValueError):
            trajectory(separate(self.legs), [{"tick": 1, "center": (0, 0, 0)},
                                             {"tick": 1, "center": (1, 0, 0)}])

    def test_open_gate_rejected(self):
        s = separate(self.legs)
        s["liveGate"] = "OPEN"
        with self.assertRaises(ValueError):
            trajectory(s, self.samples())

    def test_sphere_write_rejected(self):
        s = separate(self.legs)
        s["sphereWrites"] = True
        with self.assertRaises(ValueError):
            trajectory(s, self.samples())

    def test_blunting(self):
        self.assertAlmostEqual(math.hypot(*blunt_drift((3, 4, 0), 2)), 2)

    def test_zero_drift(self):
        self.assertEqual(blunt_drift((0, 0, 0), 2), (0.0, 0.0, 0.0))

    def test_counterflow_not_always_stabilising(self):
        self.assertGreater(math.hypot(*counterflow((1, 0, 0), (-1, 0, 0), 1)), 1)

    def test_bad_limit_rejected(self):
        with self.assertRaises(ValueError):
            counterflow((1, 0, 0), (0, 1, 0), math.nan)

    def test_receipt_unverified(self):
        self.assertEqual(separate(self.legs)["receiptTrust"], "UNVERIFIED")


    def test_extreme_agreeing_inputs_do_not_overflow_median(self):
        legs = {name: (1e308, 1e308, 1e308) for name in LEGS}
        s = separate(legs)
        self.assertEqual(s["center"], (1e308, 1e308, 1e308))
        self.assertEqual(len(s["separationCommitment"]), 128)

    def test_extreme_drift_is_blunted_without_hypot_overflow(self):
        result = blunt_drift((1e308, -1e308, 1e308), 2)
        self.assertTrue(all(math.isfinite(x) for x in result))
        self.assertAlmostEqual(math.hypot(*result), 2)

    def test_separation_commitment_survives_trajectory(self):
        s = separate(self.legs)
        out = trajectory(s, self.samples())
        self.assertEqual(out["separationCommitment"], s["separationCommitment"])
        self.assertEqual(out["separationCenter"], s["center"])

    def test_mutated_separation_provenance_rejected(self):
        s = separate(self.legs)
        s["separationInputs"]["tap"] = (100, 0, 0)
        with self.assertRaises(ValueError):
            trajectory(s, self.samples())

    def test_unverified_receipt_cannot_be_upgraded_by_caller(self):
        s = separate(self.legs)
        s["receiptTrust"] = "VERIFIED"
        with self.assertRaises(ValueError):
            trajectory(s, self.samples())

    def test_origin_mismatch_rejected(self):
        s = separate(self.legs)
        s["origin"] = (0, 0, 0)
        with self.assertRaises(ValueError):
            trajectory(s, self.samples())

if __name__ == "__main__":
    unittest.main()
