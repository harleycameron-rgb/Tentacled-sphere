"""SCANDOC origin-to-Sphere simulation contract, version 0.

This is a local, read-only transition prototype. It does NOT qualify native
firing, persist cloud state, or grant an eight-HTML runtime authority.
"""
from dataclasses import dataclass, replace
import math
from scandoc_genesis import candidate_snapshot, validate_candidate
from scandoc_qualification import qualify_faces

ORIGIN = (1024.0, 1024.0, 0.0)
ORIGIN_HTMLS = ("tap", "surface", "gain", "habitat", "engine", "business")
SPHERE_HTMLS = ("tap", "surface", "gain", "habitat", "engine", "business", "time", "foretentacle")


@dataclass(frozen=True)
class SphereFrame:
    """Immutable simulation state, never an authenticated cloud receipt."""
    genesis_hex: str
    sentinel_id: str
    tick: int
    origin: tuple
    positions: tuple
    live_gate: str = "CLOSED"
    receipt_trust: str = "UNVERIFIED"


def simulated_transition(faces, sentinel_id):
    """Check geometry and build a fixed candidate genesis, with gate CLOSED.

    No user-facing HTML can write a genesis or change the origin.
    """
    check = qualify_faces(faces)
    if not check["valid"]:
        raise ValueError("origin geometry rejected: " + "; ".join(check["reasons"]))
    candidate = candidate_snapshot(faces, sentinel_id)
    if not validate_candidate(candidate, faces):
        raise ValueError("genesis consistency check failed")
    return SphereFrame(
        genesis_hex=candidate["snapshot_hex"],
        sentinel_id=sentinel_id,
        tick=0,
        origin=ORIGIN,
        positions=(ORIGIN,) * len(SPHERE_HTMLS),
    )


def advance_simulation(frame, next_tick, displacements):
    """One strictly monotonic step with bounded, finite local displacements.

    A caller may propose one displacement per live Sphere HTML, but not
    change the genesis, the six origin witnesses, or the native gate.
    """
    if not isinstance(frame, SphereFrame) or frame.live_gate != "CLOSED":
        raise ValueError("invalid simulation frame")
    if not isinstance(next_tick, int) or isinstance(next_tick, bool) or next_tick != frame.tick + 1:
        raise ValueError("next logical tick must be exactly previous tick + 1")
    if not isinstance(displacements, dict) or set(displacements) != set(SPHERE_HTMLS):
        raise ValueError("exactly eight named Sphere inputs required")
    updated = []
    for app, previous in zip(SPHERE_HTMLS, frame.positions):
        vector = displacements[app]
        if not isinstance(vector, (tuple, list)) or len(vector) != 3 or any(
            isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or abs(v) > 1
            for v in vector
        ):
            raise ValueError(f"{app}: invalid displacement")
        point = tuple(a + b for a, b in zip(previous, vector))
        if not all(math.isfinite(x) for x in point):
            raise ValueError("nonfinite resulting position")
        updated.append(point)
    return replace(frame, tick=next_tick, positions=tuple(updated))


def relative_displacements(frame):
    """Return pairwise relative positions for all eight live nodes."""
    if not isinstance(frame, SphereFrame):
        raise TypeError("expected SphereFrame")
    return {
        f"{SPHERE_HTMLS[i]}:{SPHERE_HTMLS[j]}": tuple(
            frame.positions[i][k] - frame.positions[j][k] for k in range(3)
        )
        for i in range(len(SPHERE_HTMLS))
        for j in range(i + 1, len(SPHERE_HTMLS))
    }
