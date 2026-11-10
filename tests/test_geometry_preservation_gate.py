"""Regression checks for the standalone read-only preservation gate."""
import copy
import unittest
from geometry_preservation_gate import (
    LEGS, MODULES, check_overwrite, reference_descriptor,
)


class GeometryPreservationGateTests(unittest.TestCase):
    def setUp(self):
        self.before = reference_descriptor()
        self.after = copy.deepcopy(self.before)

    def rejected(self):
        self.assertEqual(check_overwrite(self.before, self.after)["decision"],
                         "REJECT")

    def test_identical_descriptor(self):
        self.assertEqual(check_overwrite(self.before, self.after)["decision"],
                         "ALLOW_DESCRIPTOR_UPDATE")

    def test_presentation_change_allowed(self):
        self.after["presentation"] = {"theme": "dark", "shells": 3}
        self.after["filters"] = {"velocity_splat": True}
        self.assertEqual(check_overwrite(self.before, self.after)["decision"],
                         "ALLOW_DESCRIPTOR_UPDATE")

    def test_valid_cross_leg_ratios_allowed(self):
        self.after["involvement"] = {
            m: {leg: 1 / 6 for leg in LEGS} for m in MODULES}
        self.assertEqual(check_overwrite(self.before, self.after)["decision"],
                         "ALLOW_DESCRIPTOR_UPDATE")

    def test_origin_change_rejected(self):
        self.after["geometry"]["origin"][0] = 1025
        self.rejected()

    def test_opposition_change_rejected(self):
        self.after["geometry"]["opposing_pairs"][0] = ["Tap", "Gain"]
        self.rejected()

    def test_axis_addition_rejected(self):
        self.after["geometry"]["spatial_axes"] = 4
        self.rejected()

    def test_seventh_launch_commitment_rejected(self):
        self.after["geometry"]["launch_commitments"] = 7
        self.rejected()

    def test_premature_temporal_arm_rejected(self):
        self.after["geometry"]["temporal_arms"][0]["phase"] = "PRE_LAUNCH"
        self.rejected()

    def test_no_forward_of_now_removed_rejected(self):
        del self.after["geometry"]["temporal_arms"][1]["horizon"]
        self.rejected()

    def test_native_gate_open_rejected(self):
        self.after["gates"]["native_burn_gate"] = "OPEN"
        self.rejected()

    def test_seal_open_rejected(self):
        self.after["gates"]["zero_data_coupler_seal"] = "OPEN"
        self.rejected()

    def test_missing_geometry_rejected(self):
        del self.after["geometry"]
        self.rejected()

    def test_extra_unknown_root_rejected(self):
        self.after["unreviewed_axis"] = 7
        self.rejected()

    def test_nan_weight_rejected(self):
        self.after["involvement"] = {
            m: {leg: 1 / 6 for leg in LEGS} for m in MODULES}
        self.after["involvement"][MODULES[0]][LEGS[0]] = float("nan")
        self.rejected()

    def test_unbalanced_weight_rejected(self):
        self.after["involvement"] = {
            m: {leg: 1 / 6 for leg in LEGS} for m in MODULES}
        self.after["involvement"][MODULES[0]][LEGS[0]] = 0.5
        self.rejected()

    def test_missing_weight_rejected(self):
        self.after["involvement"] = {
            m: {leg: 1 / 6 for leg in LEGS} for m in MODULES}
        del self.after["involvement"][MODULES[0]][LEGS[0]]
        self.rejected()

    def test_protect_against_mutable_reference(self):
        self.before["geometry"]["origin"][0] = 50
        self.rejected()

    def test_metadata_cannot_hijack_gate(self):
        self.after["geometry"] = None
        self.after["revision"] = "approved-but-not-really"
        self.rejected()


if __name__ == "__main__":
    unittest.main()
