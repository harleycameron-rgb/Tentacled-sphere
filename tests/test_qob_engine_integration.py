"""Cross-check the real experimental six-leg contract against QOB baseline.

Tests are read-only; separation is synthetic and liveGate remains CLOSED.
"""
import unittest
from api.trajectory_contract import LEGS, ORIGIN, separate, trajectory, counterflow


class QOBEngineIntegration(unittest.TestCase):
    def setUp(self):
        self.legs={name:(0.0,0.0,0.0) for name in LEGS}

    def test_exact_six_launch_legs_and_shared_origin(self):
        self.assertEqual(LEGS,("tap","surface","gain","habitat","engine","business"))
        self.assertEqual(ORIGIN,(1024,1024,0))
        result=separate(self.legs)
        self.assertEqual(result["origin"],ORIGIN)
        self.assertEqual(result["liveGate"],"CLOSED")
        self.assertFalse(result["sphereWrites"])

    def test_temporal_arms_only_after_separation(self):
        s=separate(self.legs)
        self.assertIsNone(s["trajectory"])
        out=trajectory(s,[{"tick":0,"center":(0,0,0)},{"tick":1,"center":(1,0,0)}])
        self.assertEqual(out["spatial_tentacles"],LEGS)
        self.assertEqual(out["temporal_tentacles"],("past","future"))
        self.assertEqual(out["future"],"NO_FORWARD_OF_NOW")
        self.assertEqual(out["receiptTrust"],"UNVERIFIED")

    def test_eight_vector_is_not_six_leg_separation(self):
        with self.assertRaises(ValueError):
            separate({**self.legs,"time":(0,0,0),"future":(0,0,0)})

    def test_disagreement_is_rejected_not_averaged(self):
        bad=dict(self.legs,tap=(20,0,0))
        with self.assertRaises(ValueError):
            separate(bad,tolerance=0.5)

    def test_counterflow_can_increase_drift(self):
        result=counterflow((1,0,0),(-1,0,0),1)
        self.assertGreater(result[0],1)

    def test_separation_commitment_not_native_receipt(self):
        s=separate(self.legs)
        self.assertEqual(len(s["separationCommitment"]),128)
        self.assertEqual(s["receiptTrust"],"UNVERIFIED")
        self.assertEqual(s["liveGate"],"CLOSED")


if __name__=="__main__":
    unittest.main()
