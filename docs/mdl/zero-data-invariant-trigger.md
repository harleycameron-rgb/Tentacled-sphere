# MDL — Zero-Data core-boundary trigger, invariant-only

Owner correction (2026-11-10): The trigger is NOT a display-frame button and is NOT labelled or operable in the cockpit. Sentinel anchors one end of the one-way provenance line. Window visibility cannot change lineage and does not grant source-write authority.

The UI trigger added during earlier development was removed from the shared app template and every generated display page. Incoming `sphere:feed` and `sphere:feed-clear` no longer automatically schedule `ignite()`. App-local observation and preview may update without firing.

A non-executable reservation exists in `api/zero_data_core_trigger.py`. It does NOT pretend that an independently verified Zero-Data runtime core was found. No public endpoint, button, message handler or firing adapter is connected to this reservation.

**Only demonstrated true-invariance qualification could justify any later firing mechanism.** The project has not specified or verified an executable predicate for this. It is therefore unsafe to implement a fabricated `isInvariant` flag or silently translate UI acknowledgement counts, SHA hashes, static drawings, ratios or Root Scour traversals into firing authority.

Status: UNRESOLVED_NO_EXECUTION; native gate CLOSED.
A future change requires a proven invariant domain, reference and observed descriptors, independence of observer, trusted provenance and an independently tested bounded transition contract. Such a change would be a separately reviewed topology/authority revision, not a cockpit overwrite.

The existing `Apply centre / ignite` and `Fire Sentinel` controls in the simulation remain independently present and are NOT connected to the reserved Zero-Data trigger. This PR does not certify or enable native execution.
