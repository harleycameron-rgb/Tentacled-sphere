import unittest
from scandoc_origin_sphere import (
    ORIGIN, ORIGIN_HTMLS, SPHERE_HTMLS, simulated_transition,
    advance_simulation, relative_displacements,
)


class OriginSphereTests(unittest.TestCase):
    def setUp(self):
        self.faces = {
            "tap": {"vector": [1, 0, 0]},
            "surface": {"vector": [-1, 0, 0]},
            "gain": {"vector": [0, 1, 0]},
            "habitat": {"vector": [0, -1, 0]},
            "engine": {"vector": [0, 0, 1]},
            "business": {"vector": [0, 0, -1]},
        }
        self.zero = {name: [0, 0, 0] for name in SPHERE_HTMLS}

    def test_six_origin_htmls_distinct_from_eight_live_nodes(self):
        self.assertEqual(len(ORIGIN_HTMLS), 6)
        self.assertEqual(len(SPHERE_HTMLS), 8)
        self.assertEqual(SPHERE_HTMLS[-2:], ("time", "foretentacle"))

    def test_simulated_transition_is_immutable_and_closed(self):
        frame = simulated_transition(self.faces, "sentinel-1")
        self.assertEqual(frame.origin, ORIGIN)
        self.assertEqual(len(bytes.fromhex(frame.genesis_hex)), 192)
        self.assertEqual(frame.tick, 0)
        self.assertEqual(frame.live_gate, "CLOSED")
        self.assertEqual(frame.receipt_trust, "UNVERIFIED")
        with self.assertRaises(Exception):
            frame.tick = 2

    def test_moving_nodes_cannot_rewrite_genesis(self):
        frame = simulated_transition(self.faces, "sentinel-1")
        self.zero["tap"] = [0.25, 0, 0]
        moved = advance_simulation(frame, 1, self.zero)
        self.assertEqual(moved.genesis_hex, frame.genesis_hex)
        self.assertEqual(moved.origin, frame.origin)
        self.assertEqual(frame.positions[0], ORIGIN)
        self.assertNotEqual(moved.positions[0], frame.positions[0])
        self.assertEqual(len(relative_displacements(moved)), 28)

    def test_bad_origin_fails_closed(self):
        self.faces["surface"]["vector"] = [1, 0, 0]
        with self.assertRaises(ValueError):
            simulated_transition(self.faces, "sentinel-1")

    def test_invalid_tick_and_eight_vector_inputs_fail(self):
        frame = simulated_transition(self.faces, "sentinel-1")
        for tick in (0, 2, -1, True):
            with self.assertRaises(ValueError):
                advance_simulation(frame, tick, self.zero)
        for wrong in ({}, {"tap": [0, 0, 0]}, dict(self.zero, extra=[0, 0, 0])):
            with self.assertRaises(ValueError):
                advance_simulation(frame, 1, wrong)

    def test_nonfinite_or_unbounded_displacement_rejected(self):
        frame = simulated_transition(self.faces, "sentinel-1")
        for bad in ([float("nan"), 0, 0], [float("inf"), 0, 0], [2, 0, 0]):
            with self.assertRaises(ValueError):
                advance_simulation(frame, 1, dict(self.zero, tap=bad))


if __name__ == "__main__":
    unittest.main()
