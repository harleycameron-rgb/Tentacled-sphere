"""Experimental six-leg separation and post-separation trajectory contract.

This is an opt-in research module, NOT the existing eight-arm preview API.
No live gate or sphere write can be enabled by this module.
"""
from collections.abc import Mapping
import math
import statistics

LEGS = ("tap", "surface", "gain", "habitat", "engine", "business")
ORIGIN = (1024, 1024, 0)


def vector(value):
    if (not isinstance(value, (list, tuple)) or len(value) != 3
            or any(type(x) not in (int, float) or not math.isfinite(x) for x in value)):
        raise ValueError("finite 3-vector required")
    return tuple(float(x) for x in value)


def separate(legs, *, tolerance=0.5):
    if not isinstance(legs, Mapping) or set(legs) != set(LEGS):
        raise ValueError("exactly six named launch legs required")
    if type(tolerance) not in (int, float) or not math.isfinite(tolerance) or tolerance < 0:
        raise ValueError("invalid tolerance")
    values = [vector(legs[k]) for k in LEGS]
    center = tuple(statistics.median(v[i] for v in values) for i in range(3))
    if any(math.dist(v, center) > tolerance for v in values):
        raise ValueError("separation blocked: disagreement exceeds tolerance")
    return {
        "separated": True, "center": center, "legs": LEGS, "origin": ORIGIN,
        "trajectory": None, "liveGate": "CLOSED", "sphereWrites": False,
        "receiptTrust": "UNVERIFIED",
    }


def trajectory(separation, samples):
    if (not isinstance(separation, Mapping)
            or separation.get("separated") is not True
            or separation.get("legs") != LEGS
            or separation.get("liveGate") != "CLOSED"
            or separation.get("sphereWrites") is not False):
        raise ValueError("closed six-leg separation required")
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
        "trajectory": tuple(points), "past": "SHARED_PROVENANCE",
        "future": "NO_FORWARD_OF_NOW", "spatial_tentacles": LEGS,
        "temporal_tentacles": ("past", "future"),
        "liveGate": "CLOSED", "sphereWrites": False,
        "receiptTrust": "UNVERIFIED",
    }


def blunt_drift(drift, limit):
    d = vector(drift)
    if type(limit) not in (int, float) or not math.isfinite(limit) or limit < 0:
        raise ValueError("invalid drift limit")
    norm = math.hypot(*d)
    if norm == 0:
        return d
    return tuple(x * min(1.0, limit / norm) for x in d)


def counterflow(velocity, drift, limit):
    v = vector(velocity)
    d = blunt_drift(drift, limit)
    result = tuple(a - b for a, b in zip(v, d))
    if not all(math.isfinite(x) for x in result):
        raise ValueError("counterflow overflow")
    return result
