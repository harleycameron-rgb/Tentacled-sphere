#!/usr/bin/env python3
"""Explicit, status-and-shape-only checks for the Perplexity Router API."""

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from llm import RouterClient, RouterError


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--models", action="store_true", help="list authenticated catalog IDs")
    mode.add_argument("--smoke", action="store_true", help="make one minimal completion")
    parser.add_argument("--model", help="exact model ID from the live catalog")
    args = parser.parse_args()
    if args.models and args.model:
        parser.error("--model is only valid with --smoke")

    model = args.model if args.model is not None else os.environ.get("PERPLEXITY_MODEL")
    try:
        with RouterClient(model=model, max_attempts=1) as router:
            if args.models:
                for model_id in router.list_models():
                    print(model_id)
                return 0
            result = router.complete(
                [{"role": "user", "content": "Reply OK."}],
                max_completion_tokens=16,
            )
            completion = result.completion
            print(
                f"HTTP status: {result.status_code}; "
                f"object={completion.object}; "
                f"choices={len(completion.choices)}; "
                f"usage_present={completion.usage is not None}"
            )
            return 0 if result.status_code == 200 else 1
    except RouterError as error:
        status = str(error.http_status) if error.http_status is not None else "unavailable"
        print(f"HTTP status: {status}; error={error.code}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
