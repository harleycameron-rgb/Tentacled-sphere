# Canonical launch contract alignment (read-only)

Current `web/app.js` declares Tap, Surface, SpiritLevel, Gain, Habitat, Time, Space, Lineage, and its Fire Sentinel handler requires a complete eight-app acknowledgement basket. This is not the owner-defined launch gate.

Canonical six launch commitments: Tap/Surface, Gain/Habitat, Engine/Business. Two arms, Time Axis and Foretentacle, are post-launch, not quorum participants. Shared origin [1024,1024,0], no fourth axis at burn, distinct geometry hash and temporal receipt.

The new `tests/canonical-launch-contract.js` is an inert diagnostic checker. It intentionally returns BLOCKED even if the structural declarations appear complete, because signatures, pair sealing, native authority, source provenance and event transitions are not verified. It must not be imported as an ignition authorizer.

Do not silently relabel SpiritLevel, Time, Space or Lineage as Engine/Business/Foretentacle. A complete implementation requires explicit app bindings and authenticated contract tests. Existing gameplay files are unchanged in this PR.
