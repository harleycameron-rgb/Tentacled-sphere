"""Read-only geometric qualification proposal for six Cube face inputs.

Checks three opposing unit-vector pairs, mutually orthogonal axes and exact
face identities. It does not authorize a native burn or validate physical sensors.
"""
import math

FACE_ORDER = ("tap", "surface", "gain", "habitat", "engine", "business")
PAIR_NAMES = (("tap", "surface"), ("gain", "habitat"), ("engine", "business"))
DEFAULT_TOLERANCE = 1e-9


def qualify_faces(faces, tolerance=DEFAULT_TOLERANCE):
    if not isinstance(tolerance, (int, float)) or isinstance(tolerance, bool) or not math.isfinite(tolerance) or not 0 < tolerance <= 1e-5:
        raise ValueError("invalid numerical tolerance")
    if not isinstance(faces, dict) or set(faces) != set(FACE_ORDER):
        return {"valid": False, "reasons": ["exactly six named faces required"], "gate": "CLOSED"}
    reasons = []
    vectors = {}
    for face in FACE_ORDER:
        item = faces[face]
        if not isinstance(item, dict) or set(item) != {"vector"}:
            reasons.append(f"{face}: expected only vector")
            continue
        v = item["vector"]
        if not isinstance(v, (list, tuple)) or len(v) != 3 or any(
            isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in v
        ):
            reasons.append(f"{face}: vector must be three finite numbers")
            continue
        if abs(math.hypot(*v) - 1.0) > tolerance:
            reasons.append(f"{face}: vector not unit length")
            continue
        vectors[face] = tuple(v)
    axes = []
    for positive, negative in PAIR_NAMES:
        if positive not in vectors or negative not in vectors:
            continue
        a, b = vectors[positive], vectors[negative]
        if math.hypot(*(a[i] + b[i] for i in range(3))) > tolerance:
            reasons.append(f"{positive}/{negative}: poles not opposite")
        axes.append((positive, a))
    for i in range(len(axes)):
        for j in range(i + 1, len(axes)):
            dot = sum(x * y for x, y in zip(axes[i][1], axes[j][1]))
            if abs(dot) > tolerance:
                reasons.append(f"{axes[i][0]}/{axes[j][0]}: axes not orthogonal")
    return {"valid": not reasons, "reasons": reasons, "gate": "CLOSED",
            "qualified_geometry_only": not reasons,
            "native_burn_authorized": False}
