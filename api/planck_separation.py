"""Opaque 1536-bit Planck separation snapshot; research-only, no native writes."""
from collections.abc import Mapping
from dataclasses import dataclass
import hashlib
import math
import re
from .trajectory_contract import LEGS, ORIGIN, separate

TEMPORAL = ("time_axis", "foretentacle")
STATE_PATTERN = re.compile(r"[0-9a-fA-F]{384}")

@dataclass(frozen=True)
class PlanckSnapshot:
    state_hex: str
    face_commitments: tuple
    origin: tuple
    state_digest_sha512: str
    separation_commitment: str
    native_gate: str = "CLOSED"
    receipt_trust: str = "UNVERIFIED"

def snapshot_six_faces(face_commitments, state_hex, legs):
    if not isinstance(face_commitments, Mapping) or set(face_commitments) != set(LEGS):
        raise ValueError("exactly six named face commitments required")
    if any(not isinstance(face_commitments[k], str) or not face_commitments[k].strip() for k in LEGS):
        raise ValueError("empty face commitment")
    if not isinstance(state_hex, str) or STATE_PATTERN.fullmatch(state_hex) is None:
        raise ValueError("1536-bit state requires 384 hex characters")
    separation = separate(legs)
    return PlanckSnapshot(
        state_hex.lower(),
        tuple((k, face_commitments[k]) for k in LEGS),
        ORIGIN,
        hashlib.sha512(bytes.fromhex(state_hex)).hexdigest(),
        separation["separationCommitment"],
    )

def first_trajectory(snapshot, tick, tip_expressions):
    if not isinstance(snapshot, PlanckSnapshot) or snapshot.native_gate != "CLOSED" or snapshot.receipt_trust != "UNVERIFIED":
        raise ValueError("closed, unverified Planck snapshot required")
    if type(tick) not in (int, float) or not math.isfinite(tick) or tick < 0:
        raise ValueError("invalid logical tick")
    if not isinstance(tip_expressions, Mapping) or set(tip_expressions) != set(LEGS + TEMPORAL):
        raise ValueError("all eight distinct named tip expressions required")
    if any(tip_expressions[k] is None for k in LEGS + TEMPORAL):
        raise ValueError("missing tip expression")
    return {
        "event": "FIRST_TRAJECTORY",
        "tick": tick,
        "snapshot_digest_sha512": snapshot.state_digest_sha512,
        "separation_commitment": snapshot.separation_commitment,
        "origin": snapshot.origin,
        "spatial_tentacles": LEGS,
        "temporal_tentacles": TEMPORAL,
        "tip_expressions": dict(tip_expressions),
        "native_gate": "CLOSED",
        "receipt_trust": "UNVERIFIED",
        "sphere_writes": False,
        "future": "NO_FORWARD_OF_NOW",
    }
