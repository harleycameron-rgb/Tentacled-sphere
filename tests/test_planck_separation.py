import unittest
from api.planck_separation import snapshot_six_faces, first_trajectory, TEMPORAL
from api.trajectory_contract import LEGS, ORIGIN

class PlanckSeparationTests(unittest.TestCase):
    def setUp(self):
        self.faces={k:"commit:"+k for k in LEGS}
        self.legs={k:(0,0,0) for k in LEGS}
        self.state="ab"*192
        self.tips={k:{"expression":"synthetic:"+k} for k in LEGS+TEMPORAL}

    def snap(self):
        return snapshot_six_faces(self.faces,self.state,self.legs)

    def test_snapshot_exact_1536_bits_and_origin(self):
        s=self.snap()
        self.assertEqual(len(bytes.fromhex(s.state_hex))*8,1536)
        self.assertEqual(len(s.face_commitments),6)
        self.assertEqual(s.origin,ORIGIN)
        self.assertEqual(s.native_gate,"CLOSED")

    def test_invalid_length_or_hex_rejected(self):
        for bad in ("00"*191,"gg"*192,"00"*193):
            with self.assertRaises(ValueError):
                snapshot_six_faces(self.faces,bad,self.legs)

    def test_missing_face_rejected(self):
        with self.assertRaises(ValueError):
            snapshot_six_faces({k:v for k,v in self.faces.items() if k!="tap"},self.state,self.legs)

    def test_first_trajectory_instantiates_two_temporal_arms(self):
        out=first_trajectory(self.snap(),0,self.tips)
        self.assertEqual(out["temporal_tentacles"],TEMPORAL)
        self.assertEqual(len(out["tip_expressions"]),8)
        self.assertEqual(out["future"],"NO_FORWARD_OF_NOW")
        self.assertFalse(out["sphere_writes"])

    def test_missing_tip_rejected(self):
        with self.assertRaises(ValueError):
            first_trajectory(self.snap(),0,{k:v for k,v in self.tips.items() if k!="foretentacle"})

    def test_snapshot_is_immutable(self):
        from dataclasses import FrozenInstanceError
        s=self.snap()
        with self.assertRaises(FrozenInstanceError):
            s.state_hex="00"*192

    def test_digest_changes_when_state_changes(self):
        a=self.snap()
        b=snapshot_six_faces(self.faces,"ac"*192,self.legs)
        self.assertNotEqual(a.state_digest_sha512,b.state_digest_sha512)

    def test_no_negative_or_nonfinite_tick(self):
        for tick in (-1,float("nan"),float("inf")):
            with self.assertRaises(ValueError):
                first_trajectory(self.snap(),tick,self.tips)

if __name__=="__main__":
    unittest.main()
