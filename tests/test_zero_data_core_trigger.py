"""Static contract tests for reserved Zero-Data invariant-only trigger."""
import dataclasses
import unittest
from api.zero_data_core_trigger import RESERVATION, qualification_state


class ZeroDataTriggerReservationTests(unittest.TestCase):
    def test_sentinel_one_way_lineage(self):
        self.assertEqual(RESERVATION.lineage_origin, "Sentinel")
        self.assertEqual(RESERVATION.direction, "SOURCE_TO_OBSERVER")
        self.assertFalse(RESERVATION.observer_write_authority)

    def test_cannot_fire(self):
        self.assertFalse(RESERVATION.execution_connected)
        self.assertEqual(RESERVATION.native_gate, "CLOSED")
        self.assertEqual(qualification_state(), "UNRESOLVED_NO_EXECUTION")
        for name in ("fire", "ignite", "commit", "execute", "arm"):
            self.assertFalse(hasattr(RESERVATION, name))

    def test_frozen_reservation(self):
        with self.assertRaises(dataclasses.FrozenInstanceError):
            RESERVATION.execution_connected = True


if __name__ == "__main__":
    unittest.main()
