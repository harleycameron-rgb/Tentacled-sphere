# SCANDOC Cloud Beast — bounded simulation v0.1

Eight geometric tip interfaces, a common core computed from the six spatial legs, deterministic logical ticks, hash-separated geometry and temporal receipts, and an interactive browser renderer. The native gate is CLOSED. **This is a research simulation, not a verified invariant engine.**

## Run

Requires Node.js 20+. No dependencies.

```sh
npm test
npm start
```

Open http://localhost:3000. Buttons step, run, stop, and export current state. A second browser tab receives the same event stream via Server-Sent Events.

## Endpoints

- `GET /api/state`: current in-memory state
- `GET /api/events`: SSE stream, including latest state for late subscribers
- `POST /api/step`: advances one logical tick. `{"fire":true}` is rejected while the native gate is CLOSED. Optional `{ "tip": 1, "value": "..." }` records a local input on the selected tip.

## Invariant boundary

- Six launch legs are Tap, Surface, Gain, Habitat, Engine, Business. Two temporal arms are Time Axis and Foretentacle.
- Core is a **coordinate-wise median of six spatial outputs**, a preliminary robust centre, **not** a geometric median and **not** a validated six-pair commitment.
- SHA-256 hashes are demo integrity identifiers, **not authenticated cryptographic receipts**. `origin_receipt` remains null; Sentinel remains UNVERIFIED.
- All dynamics are deterministic simulated motion. No independent agent, real-world sensor, recursive learning, Oath certification, persistence, or true 3D engine is claimed.
- The native burn gate is always CLOSED. No production integration or domain updates are included.

## Production hardening required

Implement authenticated I/O, authorization per tip, persistent append-only event storage, idempotency keys, rate limiting, bounded queue, replay from genesis, strict validation and schema migration, formal six-pair commitment checks, actual geometric median in a defined shared metric, anti-drift invariants, failure envelopes, audit logs, and secure deployment topology. An in-memory Node process is not a durable cloud state service; serverless instances may diverge. Keep the native gate CLOSED until independent tests pass.
