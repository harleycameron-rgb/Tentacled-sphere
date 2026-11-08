# Readiness and executed evidence — 2026-11-08

Development baseline a7a481b, branch feature/scandoc-mdl-unified-v1. This is a foundation increment, not final MDL acceptance. No merge, deployment, production configuration or DNS change performed.

## Executed

Environment: Linux, Node v24.22.1, Python 3.12. Tests use synthetic numerical fixtures and temporary SQLite databases. HTTP tests bind ephemeral localhost ports only.

| Command | Actual result |
|---|---|
| node --test --test-isolation=none tests/web_*.test.js scandoc-cloud-beast/test/*.test.js scandoc-mdl/test/*.test.js | 41 passed, 0 failed: 19 existing regressions + 22 new foundation tests |
| python3 -m unittest discover -s tests | 40 passed, OK |
| python3 scripts/build_web.py --check | exit 0; generated application files unchanged |

The initial sandbox-only HTTP attempt failed with listen EPERM. Rerun with localhost network permission passed. Node process-isolated runner output in this environment collapsed a file into one result; isolation=none was used to execute and report individual tests transparently. No hidden skip or inferred pass is counted.

New assertions cover six-face transitions/pairs, locked genesis, rejected native/fourth-axis operations, strict finite payloads, monotonic ticks, numerical input response, pause continuity, actual history and missing-history reporting, present-only decomposition, separated hashes, role/genesis tampering, true geometric median including coincident/outlier/nonconvergence cases, incompatible metric/load rejection, finite velocity/acceleration, temporal exclusion from spatial comparisons, four-state Oath, durable restart replay, idempotent retry, failed transaction rollback, detached state reads, append-only triggers, corrupt record rejection, multi-connection refresh, event budget, HTTP authentication, tip capability boundaries, cross-origin rejection and late snapshot/event reads without refiring.

## Status by milestone

| Area | Implemented | Missing / unverified |
|---|---|---|
| Audit / topology | File inventory, role registry, three pairs, separate six/eight identities | Existing app-to-new-protocol adapter |
| Cube gate | Deterministic six numerical commitment records, paired simulation firing, immutable genesis | Six complete preparation HTMLs; gameplay qualification; HTML artifact commitments (null) |
| Sphere runtime | Authenticated state service code, SQLite replay, eight input schemas, six compatible spatial projections, logical time | Actual cloud provisioning, account authentication, revocation UX, rate limiting, scheduler, operational backups and independent audit |
| Eight Sphere HTMLs | Existing applications preserved | Full distinct connected gameplay, rich continuous trajectory UI and browser credential handling |
| Oath | Supported/unsupported/disproven/unknown computational classification | Independent evidence ingestion and formal verification; physical invariance remains unknown |
| Temporal | Actual retained-centre inspection and present decomposition primitives | Full Time/Foretentacle trajectory games and rich retained state history |
| Privacy | No new media/sensor capture, no outgoing telemetry or dependencies | End-to-end camera/audio/sensor lifecycle testing with connected clients |

Browser/device tests were not run for this increment: iPhone Safari, Android Chrome, Mac Safari/Chrome, touch/orientation, audio and sensor cleanup, accessibility, offline browser operation and performance measurements remain unverified. Python dev-server tests and generated-file checks do not establish browser gameplay readiness. The existing requested session/skylite/instruments browser scripts are absent on this main baseline and are not claimed executed.

No externally verified receipts exist. Internal hashes and replay consistency support representation integrity, not observational truth. The native gate remains CLOSED. Existing local/offline applications do not become authoritative cloud clients automatically.

## Next actions for review

1. Review this foundation and the declared dimensionless frame, pair tolerance, input bounds and bounded-history/event policies.
2. Implement distinct Cube and Sphere HTML clients against an explicit adapter, beginning with Tap/Surface lineage while preserving existing applications. Add actual state/UI/browser tests; qualify all six before enabling temporal gameplay.
3. Add durable cloud hosting, user authentication/authorization, revocation, request limits, backups and independent receipt anchoring before any public state-changing deployment. This requires an explicit deployment decision; none was made here.
4. Complete the remaining MDL gameplay, coupling diagnostics and mobile/offline acceptance gates before calling the architecture complete.
