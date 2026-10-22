import builtins
import os
import re
import unittest
from unittest.mock import patch

from src import multi_llm_council as council

ANSWERS = {
    "a": "Residue is what remains after invariants are removed. It marks drift.",
    "b": "Residue is what remains after invariants are removed. It is measurable.",
    "c": "Something unrelated entirely.",
}


def fake_call(model, topic, api_key, base_url):
    return ANSWERS[model]


class MultiLLMCouncilTests(unittest.TestCase):
    def test_without_api_key_still_returns_sealed_result(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(council, "_post_json") as post:
            result = council.run_council("What is residue in an invariance engine?")

        post.assert_not_called()
        self.assertRegex(result["sentinel"], r"^[0-9a-f]{128}$")
        self.assertTrue(council.verify_sentinel(result))
        self.assertEqual(result["models"], list(council.DEFAULT_MODELS))
        self.assertEqual(result["shared"], "")
        self.assertEqual(result["lengths"]["total_upper_bound"], 0)
        for key in ("topic", "models", "responses", "shared", "residuals", "lengths", "sentinel", "created_at"):
            self.assertIn(key, result)

    def test_extracts_shared_description_and_residuals(self):
        with patch.object(council, "_call_model", side_effect=fake_call):
            result = council.run_council("topic", models=["a", "b", "c", "a"], api_key="k")

        self.assertEqual(result["models"], ["a", "b", "c"])
        self.assertEqual(result["shared"], "Residue is what remains after invariants are removed.")
        self.assertEqual(result["residuals"], {"a": "It marks drift.", "b": "It is measurable.", "c": ANSWERS["c"]})
        lengths = result["lengths"]
        self.assertEqual(set(lengths["residual_lengths"]), {"a", "b", "c"})
        self.assertEqual(
            lengths["total_upper_bound"],
            lengths["shared_length"] + sum(lengths["residual_lengths"].values()),
        )
        self.assertTrue(council.verify_sentinel(result))

    def test_sentinel_detects_tampering(self):
        with patch.object(council, "_call_model", side_effect=fake_call):
            result = council.run_council("topic", models=["a", "b"], api_key="k")
        result["shared"] = "forged"
        self.assertFalse(council.verify_sentinel(result))

    def test_model_failure_is_recorded(self):
        def call(model, *args):
            if model == "b":
                raise ConnectionError("down")
            return ANSWERS[model]

        with patch.object(council, "_call_model", side_effect=call):
            result = council.run_council("topic", models=["a", "b"], api_key="k")

        self.assertEqual(result["responses"][1], {"model": "b", "content": None, "error": "ConnectionError"})
        self.assertEqual(result["shared"], "")
        self.assertEqual(result["residuals"]["b"], "")
        self.assertTrue(council.verify_sentinel(result))

    def test_sentinel_matches_canonical_sorted_json(self):
        self.assertEqual(council.canonical_json({"b": 1, "a": [1, "é"]}), '{"a":[1,"é"],"b":1}')

    def test_no_files_are_opened(self):
        with patch.object(builtins, "open", side_effect=AssertionError("file access")), \
                patch.object(council, "_call_model", side_effect=fake_call):
            result = council.run_council("topic", models=["a", "b"], api_key="k")
        self.assertTrue(re.fullmatch(r"[0-9a-f]{128}", result["sentinel"]))

    def test_rejects_empty_topic(self):
        with self.assertRaises(ValueError):
            council.run_council("  ")


if __name__ == "__main__":
    unittest.main()
