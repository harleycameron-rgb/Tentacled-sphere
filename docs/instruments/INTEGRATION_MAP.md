# SCANDOC interactive instruments: audited integration map

Audit date: 2026-11-07. These source pins were read through the connected GitHub interface before modifying the instrument branch. No AGENTS.md was found in the five recursive inventories. This branch is based on the existing Tentacled-sphere main source; earlier local Octopus M1/M2 work is preserved separately and is not silently added to this PR.

| Repository / audited source | Actual interface inspected | Reuse / connection in this PR |
| --- | --- | --- |
| Tentacled-sphere `94f0a25c01582c567497ae1055d78897ec5e91c4` | `api/index.py`, `api/trajectory_contract.py`, shared browser template, geometry/protocol/audio modules, Python and Node suites | Reuses finite normalization, `transformVector`, canonical JSON and `TentacledAudio`. Adds opt-in local adapters without changing API vectors or existing snapshot/acknowledgement contracts. |
| cloudburner17 `50b923086374b9d82673426a4631ca9a5cd6731c` | `CONTRACT.md`, `docs/API.md`, `src/tentacled_sphere.js`; prior inspected `spherical_topology.js` and `sphere_shift_gate.js` | Node-native lifecycle/geometry diagnostics require the native harness and independently retained heads. No browser-native engine binding is claimed or executed. The local Surface contract is explicitly not a redefinition of its burn lifecycle. |
| invariantENG.V.1.0. `dad9578cff1d7d341b17741b25b786c7b8267fbd` | Specification and source modules `Potato`, `VideoAudio`, `Engine`, `Residue`; five existing tests inspected previously | Python pure functions, with `Engine` checking geometry/audio lengths. No browser engine endpoint was found; passing that check would not qualify visual state. Runtime binding remains absent. The actual repository name has a trailing period. |
| sentinel_dot `99923c406b5ee71630e93dde4a6be3293647f8a4` | README, `src/sentinel_dot/log.py`, `signing.py`, logging/signing/anchor test inventory | Actual append-only Python log with strict integer-only parameter schema, optional HMAC/Ed25519/ML-DSA and external-head verification. No signer/key is installed in the instruments. Browser state messages are not Sentinel log entries or signatures. |
| scandoc-provenance `9e74b13427c448315d666a4679df84064a740c7e` | README, `src/bookprov/hashing.py`, `caduceus/receipt.py`, schema and test inventories | Python sorted-key UTF-8 canonical bytes and dual-digest receipt chain with source pointers and unresolved links. Browser local hashes are a separate representation format; no provenance ingestion, physical verification or external attestation is implied. |

Only the Tentacled-sphere files are changed. Test suites in the other four repositories were inspected, not executed for this PR; they are not dependencies of the standalone instruments. Their marketing descriptions do not establish tested physical capabilities.

## Existing eight applications

| API arm index | Existing HTML page | State adapter |
| --- | --- | --- |
| 0 | `/apps/tap.html` | `app=tap` |
| 1 | `/apps/surface.html` | `app=surface` |
| 2 | `/apps/spiritlevel.html` | `app=spiritlevel` |
| 3 | `/apps/gain.html` | `app=gain` |
| 4 | `/apps/habitat.html` | `app=habitat` |
| 5 | `/apps/time.html` | `app=time` |
| 6 | `/apps/space.html` | `app=space` |
| 7 | `/apps/lineage.html` | `app=lineage` |

Each keeps its existing geometry, orientation, audio and same-origin acknowledgement behavior. `web/app.js` emits a local CustomEvent after accepted geometry changes. `instruments/legacy.js` observes that event and, only after opt-in, sends it through a same-origin BroadcastChannel. Incoming cockpit controls update a separate simulated preview panel and return that simulated vector to the cockpit. They do not mutate the accepted API arm, sensor stream, shared snapshot, receipts or committed state.

The cockpit can embed any one existing page using **Open selected existing app panel**. That user gesture initiates a same-origin, exact-parent handshake to enable its adapter. Other local tabs can opt in manually. Unsupported BroadcastChannel means linking is unavailable; each instrument continues independently. Visibility changes disconnect the link; reconnect explicitly. There is no cross-origin or server transport.

## Identities must remain separate

- Seven selectable interaction stages: Tap, Surface, Gain, Habitat, Engine, Business, Sphere.
- Eight selectable cockpit views: Sphere, Tentacles, Velocity Splat, Orrery, Cube, Drift / Flow, Time Axis, Unified View.
- Six launch legs: tap, surface, gain, habitat, engine, business.
- Eight legacy app identifiers above: not aliases of launch legs or verified temporal arms. In particular, no fictitious legacy Engine/Business HTML pages are assumed.
- Two postlaunch time-axis arms remain an architectural declaration. The visual Time Axis consumes only actual past samples of the local simulation and cannot launch an arm or generate a future observation.

The declared Sentinel → Cube → Sphere topology is shown as a conceptual architecture. `centreReference=[1024,1024,0]` is not a centre write. The engine gate remains CLOSED even after six local representation commitments.
