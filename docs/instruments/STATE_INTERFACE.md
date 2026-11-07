# State and Surface event interface v1

`instruments/state.js` provides the browser global `ScandocState` and the equivalent CommonJS test exports. It reuses `TentacledProtocol.canonicalJSON` for finite, sorted-key serialization. Transport schema: `scandoc-instruments/state/1`.

```js
{
  schema: 'scandoc-instruments/state/1',
  producer: 'a-local-session-id', sequence: 1, tick: 1,
  app: 'tap', kind: 'SIMULATED', vector: [1, 0, 0],
  controls: {energy: 0.5, speed: 0.5, paused: false},
  geometry_hash: null, temporal_receipt: null,
  liveGate: 'CLOSED', sphereWrites: false, receiptTrust: 'UNVERIFIED'
}
```

Allowed app IDs are the eight audited legacy IDs. `kind` is `SIMULATED` or `API_GEOMETRY_UNVERIFIED`; API geometry is not engine qualification. `ENGINE_VERIFIED` and `receiptTrust=VERIFIED` are rejected rather than trusting a client-controlled label. Adding genuine verified engine state requires a separate trusted verifier, upstream evidence and an explicitly versioned contract; this PR does not contain one.

The vector must have three finite, nonzero components with a finite norm. Known controls are bounded energy/complexity/distortion 0..1, speed 0..2, yaw ±π, tilt ±π/2, and boolean paused. Unknown keys, nonfinite values, unknown versions, non-increasing producer sequences/ticks, gate-open claims, centre-write claims and supplied transport receipts are rejected. Producer IDs namespace ordering; they do not authenticate a person or service.

`StateBus` stores private state and offers deep-frozen detached snapshots. Subscribers cannot mutate stored state or another subscriber's view. `connect()` explicitly opts into BroadcastChannel `scandoc-instruments-v1`; `disconnect()` stops transport and `close()` rejects further publication. This is local-tab data exchange, not an authenticated channel and never a qualification path. Consumers must keep these trust labels.

## Local Surface operation

`SurfaceContract` enforces:

1. `CONCEPTUAL` → explicit `begin()` → `GATE_FORMING`.
2. Explicit `event(geometry, tick)` records a simulated local Surface Tap with a unique event ID. Touch deformation and pulse controls do not record or commit it automatically.
3. Explicit `harden(leg, eventId)` computes a real Web Crypto SHA-256 of canonical geometry. Six unique launch legs require six distinct recorded event IDs and strictly increasing commitment ticks. Duplicate legs/events, nonfinite curves, concurrent or interrupted operations reject. The UI freezes the current numerical curve after successful hardening.
4. Explicit `validate()` checks exactly six completed local commitments and enters `VALIDATED`. This validates local representations only.
5. Explicit `activate(true)` enters `EXPLICIT_SURFACE_ACTIVATION` with `kind=LOCAL_VISUAL_ACTIVATION`, `physicalBurn=false`, `engineVerified=false`.

`engineBurn()` and `writeCentre()` always reject: the verified upstream gate is not connected. Every snapshot retains `liveGate=CLOSED`, `sphereWrites=false`, `centre=null`; the centre reference remains separate. Local visual activation is not execution of Cloudburner17's native burn lifecycle.

A commitment keeps `geometry_hash` separate from `temporal_receipt={schema,tick,eventId}`. The temporal reference is an actual local logical-event reference, not a trusted timestamp or cryptographic attestation. `trust=LOCAL_HASH_ONLY`, `engineVerified=false`. Hash equality proves content consistency only. No fake verified receipt is generated.

`mesh(eventId,n)` creates n representation references to the same event ID; it never appends events or increases the commitment quorum. Snapshots and recorded history are detached and frozen. Reset invalidates pending hashing. The Time Axis uses only retained past simulation samples; absent or trimmed samples return unavailable, never inferred future states.

Coordinate frame: local unit sphere, dimensionless simulated units, fixed dt=1/60 simulated seconds. Surface velocity impulses integrate displacement and decay exponentially; bounds reflect velocity with coefficient -0.35. Flow uses a damped rotational field. Drift length accumulates sum(||velocity||*dt). These are explicit software dynamics, not physical observations or a model of mass reduction.
