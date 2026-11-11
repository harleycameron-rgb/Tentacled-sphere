# SCANDOC-MDL-UNIFIED/1.0 foundation

This increment implements a simulation foundation, not the complete fourteen-interface architecture. Native gate CLOSED. No native operation exists.

## Files and responsibilities

- `scandoc-mdl/src/schema.js`: versioned topology, strict finite command envelope, canonical JSON and domain-separated SHA-256 integrity hashes.
- `geometry.js`: bounded modified Weiszfeld geometric median with convergence reporting; compatible relative position/velocity/acceleration; four-state computational Oath classification.
- `core.js`: pure deterministic transitions; Sentinel simulation declaration; six face lifecycle records; paired qualification; immutable simulation genesis; eight distinct input schemas; pause and declared-interval evolution; actual bounded history.
- `store.js`: explicit SQLite path, immutable root, append-only triggers, atomic command transactions, replay/hash checking, idempotency and concurrent connection refresh.
- `server.js`: authenticated HTTP API, operator and per-tip capabilities, same-origin rejection, bounded requests, loopback default. No automatic deployment.
- `test/*.test.js`: state, numerical, persistence and HTTP regression tests.

## Authority and coordinates

Before qualification `state.origin` and `state.genesis` are null. A topology reference to [1024,1024,0] is not an authoritative origin write. Six unique opposing commitments are needed for SIMULATION_FIRE. This locks numerical simulation genesis only; HTML/gameplay evidence and independent verification are absent. It cannot open the native gate.

Pairs are Tap(+z)/Surface(-z), Gain(+x)/Habitat(-x), Engine(+y)/Business(-y). Local launch radii are dimensionless [0.75,1.25], exact fixed-axis normals, opposite position sums within 1e-8. Immutable launch positions initialize the six moving tips. Spatial positions use sphere-local-cartesian/1, dimensionless-euclidean/1; world reference is origin plus local offset under this declared simulation convention. These are not calibrated Earth distances.

Only six compatible spatial projections participate in equal-weight geometric median coupling and 15 relative pair comparisons. Categorical Engine loads are diagnostics, never averaged. Temporal representations have no compatible spatial metric and are excluded. T7 selects actual retained centres; unavailable history stays unavailable. T8 decomposes present state, never future observations. The history retains genesis plus 255 recent entries and reports removals.

Integration is damped semi-implicit Euler, dt in [1e-6,0.1] simulation seconds, position in dimensionless local units, velocity in units per simulation second. Rates use declared positive intervals; acceleration is null until two intervals exist. Tip radius >2 rejects the entire transition. The geometric median has bounded iteration count and fails closed on nonconvergence. No numerical stability or physical fidelity claim extends beyond executed tests.

Geometry hashes and temporal receipt hashes are separate. Receipts are labelled SIMULATION_HASH_CHAIN, verification unknown. There are no fabricated wall-clock timestamps. A hash detects representation changes; privileged replacement of an entire database is not independently detectable without an external trusted head. SQL triggers are an application safeguard, not protection against database administrator rewrite.

## Protocol and durability

Command schema scandoc-command/1 requires exactly schema, event_id, expected_tick, source_tentacle, event_type, payload. Source 0 is operator; sources 1–8 are tip capabilities. FACE_ACTIVATE takes position and normal; FACE_QUALIFY/COMMIT, SIMULATION_FIRE, PAUSE/RESUME take empty objects; STEP takes dt. DECLARED_INPUT has distinct per-role strict fields in core.js. Unknown keys/operations, stale ticks, nonfinite numbers and additional axes fail closed. JSON duplicate keys use normal JSON.parse last-key semantics; do not use duplicate-key payloads.

GET /api/mdl/state, /topology, /events?after=N and /oath?claim=PHYSICAL_INVARIANCE all require bearer authentication. POST /api/mdl/command accepts JSON <=16 KiB. Responses never grant independent verification. Polling and cursor recovery do not fire again. Exact command retry returns the existing event; altered event-ID reuse fails. Event journal defaults to a 5,000-event budget and refuses further writes at capacity; operator-managed archival/rotation is not implemented.

SQLite WAL transactions serialize writers; restart replays all commands and verifies each computed event and state hash. Use one supervised service with persistent storage. No serverless ephemeral disk assumption, automatic checkpoint authority, cross-domain bridge, media storage or cloud provisioning is introduced. This new protocol does not silently change scandoc-controls/3 or scandoc-session/2, which require a separate compatibility adapter before use.
