# MDL — Planck separation implementation status

Status: experimental draft; native gate CLOSED; no deployment or native writes.

## Implemented in public simulation protocol
- `web/protocol.js` contains `StructuralMeltingConsumer` with assembly, separation, plotting and attachment states.
- Current `completeSeparation(runId, separationId)` records identity and timestamp, **not an atomic six-face snapshot**.
- SHA-512 content hashes are not authorization.
- Simulation receipts carry `liveGate: "CLOSED"`, `receiptTrust: "UNVERIFIED"`, and `sphereWrites: false`.

## Draft-only, not production features
- `api/planck_separation.py` and `api/planck_bridge.js` accept an **opaque** 1536-bit value, but do not encode it from six faces or authenticate that derivation.
- The six-face-to-1536-bit system-state encoding is **UNIMPLEMENTED**. Do not assume six 256-bit segments.
- `first_trajectory` and `firstTrajectory` require eight externally supplied expressions. Generation of temporal tentacles 7 and 8, and computation of all eight tip geometries from trajectory, are **UNIMPLEMENTED**.
- The opt-in bridge does not yet bind every native `StructuralMeltingConsumer` trajectory point or attachment receipt to an atomic snapshot geometry hash.
- The cube remains fixed as the historical geometry; no fourth spatial axis is authorized.

## Proposed minimal integration
Capture exactly six named commitments and fixed origin in a single immutable separation event; hash its canonical geometry content separately from temporal identity and receipt metadata. Reject wrong or missing geometry hash in subsequent trajectory points. Preserve backward compatibility only where explicitly documented; do not silently treat legacy separation as a verified snapshot.

These are status statements, not evidence of execution or a production readiness claim.
