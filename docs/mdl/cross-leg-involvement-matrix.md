# MDL — Cross-Leg Involvement Matrix Amendment
Status: PROPOSED / NOT MEASURED / REVIEW REQUIRED
Amends: docs/mdl/canonical-six-interface-squash.md
Owner direction: legacy functional interfaces participate in the six current legs by *ratios of involvement*, not exclusive assignment.

## Canonical axes
Ordered legs: Tap, Surface, Gain, Habitat, Engine, Business.
Ordered functional modules: InvariantTap, Invariant Surface, Evidence Gate, modulARTopology, Credit Game, Study Environment.
The six legs are geometric launch commitments. Modules are functions. Do not identify a module with a leg or introduce extra spatial axes.
Tentacles 7 and 8 remain post-launch temporal arms; no forward of now.

## Matrix contract
Define W[module_id][leg_id] in [0,1] with sum over the six legs = 1 for each module.
W expresses *relative functional involvement*, NOT access rights, execution authority, evidence confidence, topology equivalence, or a measured invariant.
Allow a module to participate in multiple legs, and multiple modules to participate in one leg.
The matrix is an annotation/selection input; the Zero-Data Linkage Coupler Seal remains CLOSED.
All weights require provenance: source (owner proposal / measured observation), revision, timestamp, calculation method, and evidence status.
If no measurements exist, set weights to null/UNSPECIFIED rather than silently defaulting to invented values. UI mock values must be clearly labelled illustrative and excluded from engine acceptance.
Keep legacy module IDs and original composite graph as historical references.

## Required descriptor (illustrative schema, not execution evidence)
```json
{
  "schema": "scandoc-involvement-matrix/1",
  "status": "PROPOSED",
  "legs": ["Tap","Surface","Gain","Habitat","Engine","Business"],
  "modules": ["InvariantTap","Invariant Surface","Evidence Gate","modulARTopology","Credit Game","Study Environment"],
  "weights": null,
  "weight_basis": "UNSPECIFIED",
  "seal_state": "CLOSED",
  "native_burn_gate": "CLOSED"
}
```

## Compatibility and tests
- Do not implement exclusive legacy-to-leg rewrites from the original migration table; treat those as candidate dominant associations only.
- Validate finite numeric weights, 0 <= w <= 1, and row sum 1 within an explicitly declared tolerance; reject NaN, Infinity, negative values, missing/extra leg IDs.
- Preserve explicit UNRESOLVED for missing weights, rather than replacing with 0.
- Ensure weight changes do not alter six-face commitments, origin [1024,1024,0], axis count, geometry_hash, temporal_receipt or native gate state.
- Verify authorization from independent port contracts; never infer permission from a positive weight.
- Distinguish reference vs observed participation, revisioned measurements, and any proposed adaptive weighting. No automatic adaptation before tests and owner approval.
- Preserve counter-trajectory and unknown residue in cross-coupler comparisons.
- Do not squash source evidence, receipts, historical corrections or functional modules.

## Deliverable
Implement a separate, versioned matrix descriptor and read-only validator in existing project conventions only after source inspection; add tests and report observed commands/results. No deployment, merge, native burn or live cross-coupler activation without approval.
