"""Experimental six-leg separation and post-separation trajectory contract.

This is an opt-in research module, NOT the existing eight-arm preview API.
No live gate or sphere write can be enabled by this module.
"""
from collections.abc import Mapping
import math
import hashlib
import json

LEGS = ("tap", "surface", "gain", "habitat", "engine", "business")
ORIGIN = (1024, 1024, 0)


def vector(value):
    if (not isinstance(value, (list, tuple)) or len(value) != 3
            or any(type(x) not in (int, float) or not math.isfinite(x) for x in value)):
        raise ValueError("finite 3-vector required")
    out = tuple(float(x) for x in value)
    if not all(math.isfinite(x) for x in out):
        raise ValueError("vector conversion overflow")
    return out


def separate(legs, *, tolerance=0.5):
    if not isinstance(legs, Mapping) or set(legs) != set(LEGS):
        raise ValueError("exactly six named launch legs required")
    if type(tolerance) not in (int, float) or not math.isfinite(tolerance) or tolerance < 0:
        raise ValueError("invalid tolerance")
    values = [vector(legs[k]) for k in LEGS]
    # A stable coordinate-wise median avoids overflow in (left + right) / 2.
    axes = [sorted(v[i] for v in values) for i in range(3)]
    center = tuple((axis[2] / 2 + axis[3] / 2) for axis in axes)
    if not all(math.isfinite(x) for x in center):
        raise ValueError("non-finite separation centre")
    if any(math.dist(v, center) > tolerance for v in values):
        raise ValueError("separation blocked: disagreement exceeds tolerance")
    # Research-only deterministic digest; not a trusted firing receipt or qualification.
    canonical = json.dumps({"legs": {k: values[i] for i, k in enumerate(LEGS)},
                            "center": center, "origin": ORIGIN},
                           sort_keys=True, separators=(",", ":"), allow_nan=False)
    commitment = hashlib.sha512(canonical.encode("utf-8")).hexdigest()
    return {
        "separationCommitment": commitment,
        "separationInputs": {k: values[i] for i, k in enumerate(LEGS)},
        "separated": True, "center": center, "legs": LEGS, "origin": ORIGIN,
        "trajectory": None, "liveGate": "CLOSED", "sphereWrites": False,
        "receiptTrust": "UNVERIFIED",
    }


def trajectory(separation, samples):
    if (not isinstance(separation, Mapping)
            or separation.get("separated") is not True
            or separation.get("legs") != LEGS
            or separation.get("liveGate") != "CLOSED"
            or separation.get("sphereWrites") is not False
            or separation.get("receiptTrust") != "UNVERIFIED"
            or separation.get("origin") != ORIGIN):
        raise ValueError("closed six-leg separation required")
    # Recompute the research commitment to detect accidental or maliciously
    # inconsistent handoffs. This does not authenticate the source of six inputs.
    inputs = separation.get("separationInputs")
    if not isinstance(inputs, Mapping) or set(inputs) != set(LEGS):
        raise ValueError("six separation inputs and provenance required")
    canonical = json.dumps({"legs": {k: vector(inputs[k]) for k in LEGS},
                            "center": vector(separation.get("center")),
                            "origin": ORIGIN}, sort_keys=True,
                           separators=(",", ":"), allow_nan=False)
    if separation.get("separationCommitment") != hashlib.sha512(canonical.encode("utf-8")).hexdigest():
        raise ValueError("separation provenance mismatch")
    if not isinstance(samples, (list, tuple)) or len(samples) < 2:
        raise ValueError("two post-separation samples required")
    points = []
    previous = None
    for sample in samples:
        if (not isinstance(sample, Mapping) or type(sample.get("tick")) not in (int, float)
                or not math.isfinite(sample["tick"])):
            raise ValueError("finite logical tick required")
        tick = float(sample["tick"])
        if tick < 0 or (previous is not None and tick <= previous):
            raise ValueError("negative or nonmonotonic tick")
        points.append((tick, vector(sample.get("center"))))
        previous = tick
    return {
        "trajectory": tuple(points), "separationCommitment": separation["separationCommitment"],
        "origin": ORIGIN, "separationCenter": tuple(separation["center"]), "past": "SHARED_PROVENANCE",
        "future": "NO_FORWARD_OF_NOW", "spatial_tentacles": LEGS,
        "temporal_tentacles": ("past", "future"),
        "liveGate": "CLOSED", "sphereWrites": False,
        "receiptTrust": "UNVERIFIED",
    }


def blunt_drift(drift, limit):
    d = vector(drift)
    if type(limit) not in (int, float) or not math.isfinite(limit) or limit < 0:
        raise ValueError("invalid drift limit")
    scale = max(abs(x) for x in d)
    if scale == 0:
        return d
    # Normalize first: hypot of three individually finite numbers can overflow.
    unit = tuple(x / scale for x in d)
    scaled_norm = math.hypot(*unit)
    if scale <= limit / scaled_norm:
        return d
    return tuple((x / scaled_norm) * limit for x in unit)


def counterflow(velocity, drift, limit):
    v = vector(velocity)
    d = blunt_drift(drift, limit)
    result = tuple(a - b for a, b in zip(v, d))
    if not all(math.isfinite(x) for x in result):
        raise ValueError("counterflow overflow")
    return result
