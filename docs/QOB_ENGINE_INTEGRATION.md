# QOB Engine Integration — Evidence Boundary

Status: proposed tests, not yet confirmed passing. No production code modified.

This repository contains TWO DISTINCT geometrical interfaces:

1. `web/geometry.js` implements an eight-vector cube-vertex preview with six octahedral ports. Its `APP_IDS` are preview arm labels and **do not** establish the six launch-leg / two time-axis contract.
2. `api/trajectory_contract.py` is an opt-in six-named-leg experimental separation and subsequent two-temporal-arm trajectory contract. Its deterministic SHA-512 separation commitment is **not** a trusted native receipt. Its gate remains CLOSED.

Tests in `tests/web_qob_integrity.test.js` and `tests/test_qob_engine_integration.py` exercise these existing code paths without rewriting either.

Important remaining gaps:
- No explicit physical cube edge-length state is represented in the JavaScript unit-vector preview; preservation of normalized pair distances is not proof of fixed physical cube dimensions.
- The six-leg separation is a tolerance-checked numerical model, not six cryptographically signed face commitments.
- No centre-write transition or native burn adapter is implemented or authorized here.
- No formal coupling to `scandoc-provenance` policy has been implemented; this PR aligns test expectations only.
- Visual harmonic transformations can alter pair distances and must not be promoted to invariants.
- Temporal receipts, geometry commitments and native authority remain separate concepts.

Review against the documentation draft in `harleycameron-rgb/scandoc-provenance` PR #11 before merging. Do not deploy or open the native gate.
