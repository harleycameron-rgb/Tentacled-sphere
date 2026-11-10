# MDL — Human Frame / Observation Glass

Status: cockpit display boundary, not a verified security mechanism.

## Geometric meaning
The glass is a read-only projection of a Sentinel-anchored lineage. Human visibility has limited range and resolution: telescopes extend astronomical observations; microscopes extend small-scale observations. Inferences from one sample (e.g. a tree-ring cross-section or image interpretation) must not be promoted automatically into invariants for unsampled subjects.

`Sentinel -> observer glass` is a one-way lineage projection. Observer selection, apparent likeness and confidence of interpretation cannot change the source, its provenance endpoint, or the canonical six-face geometry. The projection may be incomplete, uncertain or misleading. Preserve that uncertainty.

## Implemented cockpit display changes
- A glass frame surrounds the shared spherical SVG and the embedded app projections.
- The SVG does not expose pointer operations.
- The integrated iframe container is inert and does not accept pointer interaction. Its standalone app page remains available for separate **local simulation** controls.
- No actual-input firing button is visible in the display frame.
- Incoming sensor feeds no longer call `ignite()` automatically; they can update their own local previews.
- The existing simulation control card is **outside** the observation glass and retains its previous, explicitly simulated functionality. This commit does not reclassify those actions as observations or authorize them to change protected Zero.

## Critical scope limitation
HTML `inert` and CSS pointer-event restrictions are **UI presentation boundaries only**. They are not isolation, proof that a page cannot execute JavaScript, or enforcement against malicious clients. The underlying iframe can still receive programmatic snapshots, and the model cannot assert a cryptographic Sentinel lineage from this display alone. Native core and Zero-Data reservations remain separate, closed and unconnected.

The DaemonGate downstream parallel sandbox pulse is a modeling pathway for candidate invariant plots and residue, not a native firing path. This glass neither disables that research pathway nor claims an executable connector exists.

## Evidence and acceptance
Confirm generated pages remain identical to their template; inspect browser interactions on iPhone; test keyboard/pointer access and check whether standalone app control surfaces are distinct. Verify the source-to-sandbox/modeling adapter separately. Do not treat visual framing as a verified safety barrier.
