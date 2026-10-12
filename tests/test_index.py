import math
import unittest
from unittest.mock import call, patch

from index import temporal_invariant_test


class TemporalInvariantTests(unittest.TestCase):
    @patch("index.time.sleep")
    @patch("index.time.time", side_effect=[1.0, 2.0])
    def test_samples_time_based_vectors(self, time_mock, sleep_mock):
        result = temporal_invariant_test(samples=2)

        self.assertEqual(
            result,
            [
                {
                    "t": 1.0,
                    "vector": [
                        round(math.sin(1.0 * 0.1137), 6),
                        round(math.cos(1.0 * 0.3371), 6),
                        round(math.sin(1.0 * 0.7711), 6),
                    ],
                },
                {
                    "t": 2.0,
                    "vector": [
                        round(math.sin(2.0 * 0.1137), 6),
                        round(math.cos(2.0 * 0.3371), 6),
                        round(math.sin(2.0 * 0.7711), 6),
                    ],
                },
            ],
        )
        self.assertEqual(time_mock.call_count, 2)
        sleep_mock.assert_has_calls([call(0.2), call(0.2)])


if __name__ == "__main__":
    unittest.main()
