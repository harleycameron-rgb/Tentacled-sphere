# ================================================================
# CLOUDBURNER17 / TENTACLED SPHERE — MULTI-LLM COUNCIL
# Kolmogorov Upper Bound • Shared Description • Residuals • SHA-512 Sentinel
# ================================================================
"""Run several LLMs on one topic and measure what they share.

Each model answers independently. Sentences that a majority of the
successful answers agree on form the ``shared`` description; whatever
each model said beyond that is its ``residual``. Description lengths are
upper bounds on Kolmogorov complexity, measured as zlib-compressed UTF-8
byte counts. The whole result is sealed with a SHA-512 sentinel over the
sorted-key canonical JSON (``sorted-object-keys-json-v1``), matching the
browser protocol in ``web/protocol.js`` (results hold only strings and
integers, so Python and JavaScript serialise them identically).

Zero-data: nothing is written to disk, logged, or cached between calls.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import os
import re
import urllib.parse
import urllib.request
import zlib

try:  # httpx is preferred when installed; the standard library is the fallback.
    import httpx
except ImportError:  # pragma: no cover - depends on the environment
    httpx = None

DEFAULT_MODELS = (
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-haiku",
    "google/gemini-flash-1.5",
)
DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
REQUEST_TIMEOUT_SECONDS = 60.0
SENTINEL_ALGORITHM = "SHA-512"
CANONICALIZATION = "sorted-object-keys-json-v1"

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")
_NON_WORD = re.compile(r"[^\w\s]")
_WHITESPACE = re.compile(r"\s+")


# ------------------------------------------------------------
# Canonical JSON and sentinel
# ------------------------------------------------------------
def canonical_json(value) -> str:
    """Serialise ``value`` as compact JSON with sorted object keys."""
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def compute_sentinel(result: dict) -> str:
    """Return the SHA-512 hex digest of ``result`` without its sentinel field."""
    sealed = {key: value for key, value in result.items() if key != "sentinel"}
    return hashlib.sha512(canonical_json(sealed).encode("utf-8")).hexdigest()


def verify_sentinel(result: dict) -> bool:
    """Return True when ``result["sentinel"]`` matches its content."""
    return result.get("sentinel") == compute_sentinel(result)


# ------------------------------------------------------------
# Model calls
# ------------------------------------------------------------
def _post_json(url: str, payload: dict, headers: dict) -> dict:
    """POST ``payload`` as JSON and return the decoded JSON response."""
    if httpx is not None:
        response = httpx.post(url, json=payload, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        return response.json()
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={**headers, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def _call_model(model: str, topic: str, api_key: str, base_url: str) -> str:
    """Ask one model about ``topic`` and return its text answer."""
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Answer concisely in plain declarative sentences."},
            {"role": "user", "content": topic},
        ],
        "temperature": 0,
    }
    headers = {"Authorization": "Bearer " + api_key}
    data = _post_json(base_url.rstrip("/") + "/chat/completions", payload, headers)
    content = data["choices"][0]["message"]["content"]
    if not isinstance(content, str):
        raise ValueError("model returned non-text content")
    return content


def _collect_responses(topic: str, models: list[str], api_key: str | None, base_url: str) -> list[dict]:
    """Call every model independently; failures are recorded, never raised."""
    responses = []
    for model in models:
        if not api_key:
            responses.append({"model": model, "content": None, "error": "missing API key"})
            continue
        try:
            content = _call_model(model, topic, api_key, base_url)
            responses.append({"model": model, "content": content, "error": None})
        except Exception as exc:  # network, HTTP, or malformed payload
            responses.append({"model": model, "content": None, "error": type(exc).__name__})
    return responses


def _require_secure_base_url(base_url: str) -> str:
    """Reject endpoints that would send the API key in cleartext."""
    parsed = urllib.parse.urlparse(base_url)
    local = parsed.hostname in ("localhost", "127.0.0.1", "::1")
    if parsed.scheme != "https" and not (parsed.scheme == "http" and local):
        raise ValueError("base URL must use https (http is allowed only for localhost)")
    return base_url


# ------------------------------------------------------------
# Shared description and residuals
# ------------------------------------------------------------
def _sentences(text: str) -> list[str]:
    return [part.strip() for part in _SENTENCE_SPLIT.split(text) if part.strip()]


def _normalise(sentence: str) -> str:
    return _WHITESPACE.sub(" ", _NON_WORD.sub("", sentence.lower())).strip()


def description_length(text: str) -> int:
    """Upper bound on K(text): zlib-compressed UTF-8 bytes (0 for empty text)."""
    if not text:
        return 0
    return len(zlib.compress(text.encode("utf-8"), 9))


def extract_shared(responses: list[dict]) -> tuple[str, dict[str, str]]:
    """Split answers into a majority-shared description and per-model residuals.

    A sentence is shared when its normalised form appears in a strict
    majority (and at least two) of the ``n`` successful answers.
    """
    answered = [r for r in responses if r["content"]]
    quorum = max(2, len(answered) // 2 + 1)

    split = {r["model"]: [(s, _normalise(s)) for s in _sentences(r["content"])] for r in answered}
    support: dict[str, int] = {}
    for pairs in split.values():
        for key in {key for _, key in pairs if key}:
            support[key] = support.get(key, 0) + 1
    shared_keys = {key for key, count in support.items() if count >= quorum}

    shared_lines: list[str] = []
    seen: set[str] = set()
    for pairs in split.values():
        for sentence, key in pairs:
            if key in shared_keys and key not in seen:
                seen.add(key)
                shared_lines.append(sentence)

    residuals = {r["model"]: "" for r in responses}
    for model, pairs in split.items():
        residuals[model] = "\n".join(sentence for sentence, key in pairs if key not in shared_keys)
    return "\n".join(shared_lines), residuals


# ------------------------------------------------------------
# Public API
# ------------------------------------------------------------
def run_council(
    topic: str,
    models: list[str] | None = None,
    api_key: str | None = None,
) -> dict:
    """Run the council on ``topic`` and return a sealed, in-memory result.

    Returns a pure dict containing:
    - topic
    - models
    - responses (raw)
    - shared
    - residuals
    - lengths
    - sentinel
    - created_at

    ``api_key`` defaults to ``OPENROUTER_API_KEY``. The endpoint defaults to
    OpenRouter; any OpenAI-compatible base URL may be supplied through
    ``OPENROUTER_BASE_URL``. Model failures are recorded in ``responses``
    so a sentinel is always produced.
    """
    if not isinstance(topic, str) or not topic.strip():
        raise ValueError("topic must be a non-empty string")
    model_list = list(dict.fromkeys(models)) if models else list(DEFAULT_MODELS)
    key = api_key or os.getenv("OPENROUTER_API_KEY")
    base_url = _require_secure_base_url(os.getenv("OPENROUTER_BASE_URL") or DEFAULT_BASE_URL)

    responses = _collect_responses(topic, model_list, key, base_url)
    shared, residuals = extract_shared(responses)
    shared_length = description_length(shared)
    residual_lengths = {model: description_length(text) for model, text in residuals.items()}

    result = {
        "topic": topic,
        "models": model_list,
        "responses": responses,
        "shared": shared,
        "residuals": residuals,
        "lengths": {
            "shared_length": shared_length,
            "residual_lengths": residual_lengths,
            "total_upper_bound": shared_length + sum(residual_lengths.values()),
        },
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "algorithm": SENTINEL_ALGORITHM,
        "canonicalization": CANONICALIZATION,
    }
    result["sentinel"] = compute_sentinel(result)
    return result


if __name__ == "__main__":
    council = run_council("What is residue in an invariance engine?")
    print("sentinel", council["sentinel"][:16], "total_upper_bound", council["lengths"]["total_upper_bound"])
