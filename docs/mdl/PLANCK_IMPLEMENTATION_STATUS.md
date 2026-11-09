# MDL — Planck separation implementation status

Status: experimental draft only. Native gate CLOSED; sphereWrites false; no deployment.

## Implemented on draft branch
- `web/protocol.js` retains the legacy `completeSeparation(runId,separationId)` simulation method. This legacy path does **not** capture a six-face snapshot.
- New opt-in async `completeSeparationWithSnapshot(runId,separationId,faceCommitments)` validates exactly six named, nonempty face commitments, freezes the snapshot and hashes the canonical geometry (fixed origin plus six commitments) with SHA-512.
- Geometry hash deliberately excludes run identity, timestamp and receipt metadata. Hashes establish content consistency, **not** authority or proof of a physical event.
- In snapshot mode, trajectory points reject missing or mismatched `geometryHash`; trajectory and attachment receipts include the hash. Reused separation identifiers are rejected within the consumer lifetime.
- Regression tests exist for immutability, hash binding, replay rejection and legacy closed-gate behaviour.
- A draft GitHub Actions workflow `.github/workflows/qob-planck-review.yml` requests JavaScript and Python regressions. **No successful run has been confirmed for the latest commits.**

## Unimplemented or unknown
- The six-face-to-1536-bit encoding is **UNIMPLEMENTED**. The experimental bridge accepts an opaque 384-hex-character value, without verifying its derivation. Do not infer six 256-bit pieces.
- Automatic derivation of temporal tentacles 7 and 8 and generation of eight tip geometries are **UNIMPLEMENTED**. Draft APIs accept externally supplied expressions.
- Whether trajectory is a single conceptual Planck-gap transition, and whether the six tentacles remain seated in the cube, are current **research hypotheses**, not engine results.
- **Planck Threshold Non-Assumption (proposed):** a pre-gap invariant cannot be assumed to persist across the gap. Post-gap claims require independent checks; otherwise classify UNKNOWN.
- Planck terminology is conceptual; no physical Planck-scale discontinuity is demonstrated.

## Public research preview
Five linked, mobile-friendly explanatory HTML pages are staged under `docs/research-pages/`, with one shared stylesheet. They are draft files only, not a live-site update.

## Release boundary
No PR merge, native firing, deployment, DNS change or production write has been authorized by these draft commits. Receipts remain UNVERIFIED and the native gate remains CLOSED.
