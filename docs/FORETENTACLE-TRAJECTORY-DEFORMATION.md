# Foretentacle trajectory-caused melting — research contract

The Foretentacle's selfie image is an ephemeral **substrate**, not a melt command. Visible deformation must be computed exclusively from accepted post-separation trajectory geometry. The Oath Face is the recursive self-reference expression; other Sphere instruments retain their own prescribed geometric renderers.

## Module boundary
`deriveDeformation(trajectory, geometry)` is a **pure** mapping in `web/foretentacle-deformation.js`. It accepts finite displacement and previous-displacement vectors, strictly increasing logical ticks, a fixed shared origin, a positive recursion scale, explicit separation and attachment flags, and `liveGate: "CLOSED"`. It returns bounded fragmentation/coherence and trajectory-derived torsion/curvature. There is **no** clock-driven melting, randomness, pixel access, camera permissions, or live firing.

## Limits
This is a **proposed deformation adapter**, not recovered original selfie-melt code, a camera renderer, a physical curvature estimator, or cryptographic attestation. In particular, the current function uses a normalized cross-product proxy for curvature; it is not a rigorous differential-geometric curvature calculation. Existing `StructuralMeltingConsumer` must validate actual state transitions and accepted points before a caller sets `meltingAttached`; flags alone are not proof. No UI is wired to this module yet. Foretentacle alone will use user-facing camera once a renderer is explicitly integrated. The eight other Sphere pages continue using the environment camera and must not inherit Foretentacle's melt logic.

Native gate remains CLOSED. Do not merge or deploy to production without approval.
