# Planck Gap: six-face snapshot → first trajectory (review contract)

Status: experimental, unverified, native gate CLOSED.

1. The six named launch faces must be present as commitments.
2. A caller-supplied opaque **1536-bit** state is snapshotted at separation. Its **encoding from six faces is unspecified**. This module DOES NOT prove that the supplied state was derived from those faces, and MUST NOT be used as an authentication verifier.
3. The first trajectory references that state digest and the existing experimental separation commitment; it introduces `time_axis` and `foretentacle` and requires all eight tip expression slots.
4. All eight expressions are supplied by the caller; **their geometrical correctness and changes are not proven**. No automatic tip deformation is implemented.
5. Snapshot fields are immutable at the Python dataclass level, but nested input provenance and external authorization remain outside the contract.
6. No physical Planck-time duration is asserted. This is a logical separation boundary.
7. No native writes, trusted receipts, or forward-of-now projections are permitted.

Open questions requiring independent Grok/MDL review: six-face→1536 encoding; atomicity and replay identity; first trajectory continuity and tip-specific geometric functions; fixed physical cube dimensions; authorization boundary and counterexamples.

Related: `harleycameron-rgb/scandoc-provenance` PR #11. Do not merge or deploy without review.
