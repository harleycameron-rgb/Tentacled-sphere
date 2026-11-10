# MDL — Zero-Data core-boundary trigger, invariant-only

Owner correction (2026-11-10): The trigger is NOT a display-frame button and is NOT labelled or operable in the cockpit. Sentinel anchors one end of the one-way provenance line. Window visibility cannot change lineage and does not grant source-write authority.

The UI trigger added during earlier development was removed from the shared app template and every generated display page. Incoming `sphere:feed` and `sphere:feed-clear` no longer automatically schedule `ignite()`. App-local observation and preview may update without firing.

A non-executable reservation exists in `api/zero_data_core_trigger.py`. It does NOT pretend that an independently verified Zero-Data runtime core was found. No public endpoint, button, message handler or firing adapter is connected to this reservation.

**Only demonstrated true-invariance qualification could justify any later firing mechanism.** The project has not specified or verified an executable predicate for this. It is therefore unsafe to implement a fabricated `isInvariant` flag or silently translate UI acknowledgement counts, SHA hashes, static drawings, ratios or Root Scour traversals into firing authority.

Status: UNRESOLVED_NO_EXECUTION; native gate CLOSED.
A future change requires a proven invariant domain, reference and observed descriptors, independence of observer, trusted provenance and an independently tested bounded transition contract. Such a change would be a separately reviewed topology/authority revision, not a cockpit overwrite.

The existing `Apply centre / ignite` and `Fire Sentinel` controls in the simulation remain independently present and are NOT connected to the reserved Zero-Data trigger. This PR does not certify or enable native execution.


## Boundary correction — DaemonGate and parallel sandbox pulse (2026-11-10)

Observation cannot activate the protected Zero core, but observation **can provide candidate input for a parallel sandbox model** that plots geometry, proposed invariant relationships, drift and false-invariant residue. This is not a contradiction: the observation stream changes the *observer-side model*, not the source lineage or native core.

Two different triggers must not be conflated:

1. **DaemonGate downstream sandbox pulse** (existing conceptual/research path): input -> bounded sandbox model -> DaemonGate collapse/focus/convergence -> local pulse-state modeling -> cockpit projection. Its purpose is experimental plotting and distinguishing candidates from residue, not native firing. The repositories `repo-orchestratorv2` and `Convergence-defence/invariant-sim` describe related stages, but an integrated live link from this browser to those modules has NOT been verified.
2. **Zero-Data native trigger reservation** (`api/zero_data_core_trigger.py`): a distinct dormant, non-executable contract with no DaemonGate adapter, no input handler, no firing method and native gate CLOSED. It must never replace or remove the sandbox pulse's legitimate observation/modeling path.

Current browser status: `web/app.js` retains `sphere:feed` and `sphere:feed-clear` ingestion and app-local preview, while removing automatic calls to `ignite()` on observation. This avoids new shared simulation revisions being triggered by mere observation; it does not yet implement a DaemonGate sandbox link. UI buttons labelled `Apply centre / ignite` and `Fire Sentinel` remain separate browser simulation actions, not the reserved native trigger.

**Conformance obligations:** source -> observer remains one-way; no observer write to Sentinel lineage; sandbox receives explicitly scoped observations and preserves provenance; model changes must not mutate source state; outputs distinguish candidate invariance from verified invariance; the downstream sandbox pulse and native trigger have separate identities/authority. A successful sandbox pulse or hash/receipt does NOT qualify native firing.

This amendment is a source-grounded boundary clarification, not evidence that the daemon-gated sandbox integration is deployed or that actual invariance has been proven.
