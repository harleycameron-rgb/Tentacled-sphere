# Outward-looking tentacle geometry and shared trajectory core

Status: architecture clarification, 10 November 2026. This document records intended
behaviour; it does not claim that the current apps or InvariantTap connector implement it.

## Role of InvariantTap

InvariantTap is intended to underpin the outward-looking part of the tentacle apps.
The apps express geometries around Earth. Each has its own characteristic relationship
to that geometry, including concentric structure, spin, sexual expression, surface,
core and other app-specific characteristics. These are characteristics of expression,
not a replacement list of launch legs and not eight interchangeable animations.

The current connector exposes synthetic audio, orbit and business tests. Successful
connector tests do not establish shared-core integration, camera tracking, physical
geometry or native engine execution.

## Earth-relative assembly

Before trajectory creation, the six launch legs remain in the Earth-anchored assembly
frame. App-local spin or another intentional expression must remain distinguishable
from a change to the shared reference frame. The renderer must keep the assembly
visible without adding cumulative Earth-spin drift that stretches it off screen.

The established six legs and pairings remain:

| Pair | Leg | Established relationship |
| --- | --- | --- |
| Tap / Surface | Tap | Concave sky |
| Tap / Surface | Surface | Convex ground |
| Gain / Habitat | Gain | East, morning sun |
| Gain / Habitat | Habitat | West, sunset |
| Engine / Business | Engine | North pole axis |
| Engine / Business | Business | South pole axis |

The six commitments lock in opposing pairs before writing the centre at
SHARED_ORIGIN [1024, 1024, 0]. A fourth axis is forbidden at burn.
This design reference frame is not a claim of physical geostationary orbit.

## One formation, distinct expressions

When trajectory is created, all participating apps share the newly formed core.
The core and trajectory event identity come from the common formation; an app
must not independently invent another core or start a separate trajectory merely
because its page opens.

Each app retains its own geometry, constraints and interaction around that core.
A common core therefore does not require identical images, vectors, animation
or sound from every app. Local presentation state must not silently overwrite
the shared core.

The six-to-eight transition introduces the two temporal arms after launch:
Tentacle 7 links to Sentinel genesis provenance; Tentacle 8 is the forward-facing
Foretentacle, truncated at "no forward of now". The deliberate departure from the
Earth-anchored frame belongs to this trajectory stage and must not appear early
during six-leg assembly. All eight then refer to the same formed core.

Geometry identity and temporal receipts remain separate. A content hash alone
does not authenticate an issuer or prove execution.

## Required implementation behaviour

1. A trajectory creation event establishes one shared core identity and state for
   the participating apps, with its separation and Sentinel provenance references.
2. Each app consumes that common state through its own declared geometrical
   constraints. App-local expression is separate from shared-core updates.
3. Opening an app after formation attaches it to the existing event/core; it does
   not refire or create another origin.
4. Pause and resume preserve the event/core identity. A deliberate reset ends that
   formation explicitly so stale updates cannot revive it.
5. Updates carry event identity and ordering information. Receivers reject stale,
   conflicting or different-event updates rather than mixing formations.
6. Temporal arms cannot participate in the six-leg burn gate. Their activation
   follows separation and trajectory creation.
7. Missing shared state is shown as unavailable; app-local animation is not
   presented as evidence of a shared trajectory.

These are acceptance requirements, not a new wire schema or a verified transport.
The exact mapping of the expressive characteristics above to individual apps,
and their numerical operators, remains to be recovered or specified. Do not
infer that mapping from legacy app names or remap the six launch legs.

## Review and verification targets

- During assembly, Earth-relative geometry stays bounded and temporal arms remain
  inactive; intentional local spin does not rotate the entire reference frame.
- After one trajectory event, all eight consumers report the same core/event
  identity while retaining their distinct expressions.
- A late receiver attaches to that same core without a second creation event.
- Pause/resume retains identity; reset invalidates old updates.
- Reordered, conflicting and cross-event updates are rejected.
- Geometry commitments and temporal receipts can be inspected separately.

The existing [trajectory research contract](TRAJECTORY_CONTRACT.md) is an opt-in
software model and explicitly lacks production integration. Existing camera and
instrument PRs must be assessed against this clarification; this document does
not declare them complete. Native gate CLOSED, sphereWrites=false and UNVERIFIED
receipt status remain in force.
