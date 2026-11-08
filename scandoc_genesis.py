"""Provisional six-face 1536-bit genesis snapshot codec.

Pure proposal: NOT a qualified burn, native verification, or cloud state writer.
Six ordered SHA-256 commitments are concatenated into 192 immutable bytes.
"""
import hashlib
import json
import math

FACE_ORDER = ("tap", "surface", "gain", "habitat", "engine", "business")
PAIRS = ((0, 1), (2, 3), (4, 5))
ORIGIN = (1024, 1024, 0)
SCHEMA = "scandoc-genesis-candidate/1"
DOMAIN = b"SCANDOC-GENESIS-CANDIDATE-1\x00"


def canonical(value):
    """Strict, finite JSON canonicalization for this candidate only."""
    def check(item):
        if isinstance(item, float) and not math.isfinite(item):
            raise ValueError("nonfinite number")
        if isinstance(item, dict):
            if not all(isinstance(k, str) for k in item):
                raise ValueError("object keys must be strings")
            for v in item.values():
                check(v)
        elif isinstance(item, (list, tuple)):
            for v in item:
                check(v)
        elif item is not None and not isinstance(item, (str, bool, int, float)):
            raise ValueError("unsupported type")
    check(value)
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def candidate_snapshot(faces, sentinel_id, *, qualified=False):
    """Return a candidate receipt; never issue a qualified burn."""
    if qualified:
        raise PermissionError("native burn gate CLOSED: qualified snapshot not available")
    if not isinstance(sentinel_id, str) or not sentinel_id:
        raise ValueError("sentinel_id required")
    if not isinstance(faces, dict) or set(faces) != set(FACE_ORDER):
        raise ValueError("exactly six named face inputs required")
    commitments = []
    for face in FACE_ORDER:
        payload = {"schema": SCHEMA, "origin": ORIGIN, "sentinel": sentinel_id,
                   "face": face, "value": faces[face]}
        commitments.append(hashlib.sha256(DOMAIN + canonical(payload)).digest())
    raw = b"".join(commitments)
    assert len(raw) == 192
    return {
        "schema": SCHEMA,
        "face_order": list(FACE_ORDER),
        "pairs": [list(pair) for pair in PAIRS],
        "origin": list(ORIGIN),
        "sentinel_id": sentinel_id,
        "snapshot_hex": raw.hex(),
        "snapshot_bits": 1536,
        "commitment_algorithm": "SHA-256-per-face",
        "receipt_sha512": hashlib.sha512(DOMAIN + raw).hexdigest(),
        "qualified": False,
        "liveGate": "CLOSED",
        "sphereWrites": False,
        "receiptTrust": "UNVERIFIED",
        "note": "Candidate encoding only; pairing geometry and burn qualification not verified.",
    }


def validate_candidate(receipt, faces):
    """Recompute every byte; a match establishes consistency, not authenticity."""
    if not isinstance(receipt, dict) or receipt.get("qualified") is not False:
        return False
    try:
        expected = candidate_snapshot(faces, receipt["sentinel_id"])
    except (ValueError, KeyError, TypeError, PermissionError):
        return False
    return receipt == expected
