"""Read-only SCANDOC geometry preservation contract gate.

This gate reviews proposed descriptor overwrites. It does not fire the native
engine, protect the deployment pipeline, or modify existing eight-app models.
"""
from __future__ import annotations
import copy
import math
from typing import Any

SCHEMA = "scandoc-geometry-contract/1"
LEGS = ("Tap", "Surface", "Gain", "Habitat", "Engine", "Business")
PAIRS = (("Tap", "Surface"), ("Gain", "Habitat"), ("Engine", "Business"))
MODULES = ("InvariantTap", "Invariant Surface", "Evidence Gate",
           "modulARTopology", "Credit Game", "Study Environment")
PROTECTED_GEOMETRY = {
    "schema": SCHEMA,
    "origin": [1024, 1024, 0],
    "stages": ["Sentinel", "Cube", "Sphere"],
    "legs": list(LEGS),
    "opposing_pairs": [list(p) for p in PAIRS],
    "spatial_axes": 3,
    "launch_commitments": 6,
    "centre_write_requires_commitments": 6,
    "fourth_spatial_burn_axis": "FORBIDDEN",
    "temporal_arms": [
        {"id": 7, "name": "Time Axis", "phase": "POST_LAUNCH",
         "origin_link": "Sentinel genesis receipt"},
        {"id": 8, "name": "Foretentacle", "phase": "POST_LAUNCH",
         "horizon": "NO_FORWARD_OF_NOW"},
    ],
}
PROTECTED_GATES = {"zero_data_coupler_seal": "CLOSED",
                   "native_burn_gate": "CLOSED"}
ALLOWED_ROOT_KEYS = frozenset(("geometry", "gates", "involvement",
                               "presentation", "filters", "revision"))


def reference_descriptor() -> dict[str, Any]:
    """Generate the declared invariant profile, never from candidate input."""
    return {"geometry": copy.deepcopy(PROTECTED_GEOMETRY),
            "gates": dict(PROTECTED_GATES),
            "involvement": None, "presentation": {}, "filters": {},
            "revision": "reference"}


def _valid_json_tree(value: Any) -> bool:
    """Reject NaN/inf, non-string keys and non-JSON types."""
    if value is None or type(value) in (str, bool, int):
        return True
    if type(value) is float:
        return math.isfinite(value)
    if type(value) is list:
        return all(_valid_json_tree(v) for v in value)
    if type(value) is dict:
        return all(type(k) is str and _valid_json_tree(v)
                   for k, v in value.items())
    return False


def _validate_involvement(value: Any) -> list[str]:
    if value is None:
        return []  # Explicitly unresolved, not measured.
    if type(value) is not dict:
        return ["involvement must be null or a module-weight mapping"]
    if set(value) != set(MODULES):
        return ["involvement must contain exactly six legacy module IDs"]
    errors = []
    for module, row in value.items():
        if type(row) is not dict or set(row) != set(LEGS):
            errors.append(f"involvement[{module}] must contain six leg IDs")
            continue
        if any(type(w) not in (int, float) or not math.isfinite(w)
               or w < 0 or w > 1 for w in row.values()):
            errors.append(f"involvement[{module}] weights invalid")
        elif not math.isclose(sum(row.values()), 1.0, rel_tol=0,
                              abs_tol=1e-9):
            errors.append(f"involvement[{module}] must sum to 1")
    return errors


def check_overwrite(before: Any, after: Any) -> dict[str, Any]:
    """Fail closed on protected geometry changes, gate changes or bad weights.

    Passing is a read-only descriptor result, NOT proof of runtime enforcement.
    """
    errors: list[str] = []
    if type(before) is not dict or type(after) is not dict:
        return {"decision": "REJECT", "errors": ["descriptors must be objects"]}
    if not _valid_json_tree(before) or not _valid_json_tree(after):
        errors.append("descriptors must be finite JSON values")
    if set(after) - ALLOWED_ROOT_KEYS:
        errors.append("candidate contains undeclared root fields")
    if before.get("geometry") != PROTECTED_GEOMETRY:
        errors.append("reference geometry differs from protected profile")
    if after.get("geometry") != PROTECTED_GEOMETRY:
        errors.append("candidate changes or omits protected geometry")
    if before.get("gates") != PROTECTED_GATES:
        errors.append("reference gate states differ from closed profile")
    if after.get("gates") != PROTECTED_GATES:
        errors.append("candidate changes or omits closed gate states")
    errors.extend(_validate_involvement(after.get("involvement")))
    for name in ("presentation", "filters"):
        if name in after and type(after[name]) is not dict:
            errors.append(f"{name} must be an object")
    if "revision" in after and (type(after["revision"]) is not str
                                or not after["revision"]):
        errors.append("revision must be a nonempty string")
    return {"decision": "REJECT" if errors else "ALLOW_DESCRIPTOR_UPDATE",
            "errors": errors,
            "scope": "Read-only descriptor check, not runtime enforcement"}
