# Readiness report — interactive instruments

Date: 2026-11-07. Feature branch: `feat/scandoc-interactive-instruments`.

## Implemented

- Two independent HTML instruments, with seven selectable Seven-Stage interactions and eight selectable Octopus cockpit views. Numerical models support deformation, signed velocity impulses and decay/collision, radial redistribution, orbital changes, vortex positioning, six-edge routing and convergence/recovery. Touch/drag, keyboard, energy/speed/complexity/distortion, pulse/stage action, pause, reset, fullscreen fallback and opt-in automatic cycling are functional.
- Canonical, versioned finite state adapter between the cockpit and all eight actual legacy HTML applications. Existing API geometry and acknowledgement behavior are preserved. Cockpit changes appear only in a separate clearly labelled simulation panel. Eight real pages, not renamed stage presets, remain available.
- Explicit local Surface event/commit/validate/activate sequence, actual SHA-256 geometry hashing, separate logical temporal references, immutable committed records and read-only stream snapshots. Mesh copies retain one event identity. Six distinct local event commitments are required for representation validation. Reset invalidates pending hashing.
- Standalone offline asset worker scoped to `/instruments/`, optional same-origin BroadcastChannel linking, locally synthesized audio and optional permission-gated orientation. Stop/visibility handlers release audio/sensor/link resources. Reduced motion suppresses automatic canvas changes while retaining numerical state and explicit controls.
- Updated template generator copies the new local assets. Production services, DNS and workflow definitions are unchanged.

## Simulated

All visual dynamics, energy, drift, orbits, conceptual topology and local activation are simulations. Orrery labels Earth as the spherical reference. Projected Surface markings are a gate symbol under construction, not a forecast or a physical burn. Above-horizon zero-mass language is explicitly conceptual; the triangle is the double-ramified read-only stream. No future observation is generated.

A local hash is a representation-integrity check, not a proof of engine execution, verified Sentinel log entry, external notarisation or trusted observation. Local `VALIDATED` refers only to six representation commitments. Even explicit `EXPLICIT_SURFACE_ACTIVATION` has `physicalBurn=false` and `engineVerified=false`.

## Blocked by design / not connected

The engine gate always remains CLOSED. Centre [1024,1024,0] is a reference; `centre=null`, `sphereWrites=false`, and both engine burn and centre-write APIs reject. Trusted native lifecycle qualification, independent signatures/timestamps, backend-to-browser verification and actual postlaunch temporal arms are not connected. Verified-engine transport labels are rejected rather than fabricated. Other repositories' contracts are documented, not silently executed or bypassed.

The Time Axis reads actual retained past simulation samples. No sample before available history, after now or missing from the retained buffer is invented. The optional legacy-app panel still needs its original API; offline standalone instruments do not need it.

## Executed tests

- `python3 -B -m unittest discover -s tests`: **40 passed** (existing Python suite).
- `node --test tests/web_*.test.js`: **22 passed**, including 14 existing tests and 8 new parameterised state/contract tests. The direct eight-test run also passed. Stage/mode loops cover all seven/eight selections, actual numerical actions, pause/reset and progression; other tests cover read-only history, all eight app IDs, propagation/disconnection, nonfinite/false-verification/stale-message rejection, six unique commitments, event identity, canonical hashes and interrupted hardening.
- `node tests/instruments_browser.cjs`: **9 browser acceptance scenarios passed**. This includes both instruments on desktop and emulated iPhone Chromium (four scenarios covering all 15 selections), reduced motion with advancing recorded time and explicit auto progression, the six-event Surface workflow, numerical propagation to all eight actual app adapters without altering their API geometry, both instruments running offline, and permission denial/granted orientation plus audio/sensor cleanup.
- Generated root pages and a separate static output build were checked. A mobile screenshot was visually inspected for readable controls, layout and playfield.
- No external request was seen in the standalone interaction checks. No backend request is required until the user explicitly opens an existing API-dependent app panel.

The first unit run exposed a test setup that failed to re-pause between selections; corrected setup passed. Browser checks initially failed on a closed details panel in the test and then exposed a real status message that overwrote an established app connection during API arrival. The test opens the panel, and the adapter now reports connected state correctly. Focus changes into embedded apps also preserve the opt-in local link while stopping audio/orientation. Final acceptance passed.

Evidence: `evidence/browser.txt` and `evidence/web.txt`. Counts are software execution evidence, not physical validation.

## Unverified / limitations

Physical iPhone Safari, Android Chrome, Mac Safari/Chrome, audible output and real orientation hardware have not been tested. The iPhone profile is Chromium emulation. Offline caches may be evicted; file:// does not guarantee worker or Web Crypto support. Legacy BroadcastChannel linking across file origins is unsupported; use one secure same-origin host. Local same-origin transport is not authenticated and cannot open a trusted gate. There are no imported receipts, server calls or secret keys that would justify a verified-engine claim.

Tests in cloudburner17, invariantENG, sentinel_dot and scandoc-provenance were inspected, not run for this change. No private preview deployment, merge, production publish or DNS mutation was performed by this task. The earlier Octopus M2 preview is a separate deployment and does not include these new instruments.

Ready for feature-PR software review and private-device acceptance. Trusted engine activation remains blocked. See INTEGRATION_MAP.md, STATE_INTERFACE.md and TESTING_AND_PREVIEW.md for source pins, boundaries and reproducible procedures.

## Adaptive Skylite addition

The reusable shell at `/instruments/skylite.html?app=<existing-id>` now has eight geometry adapters, manual/optional browser sensor input, stationary calibration, sample-time relative delta-velocity estimation and explicit numerical attenuation. Surface displays separate Earth-sphere/paraboloid curvatures and the vertical display exaggeration. Raw reported input, derived estimates and simulated display geometry are labelled separately. The actual legacy view adapter remains opt-in and closed-gate. Infrared is unavailable without a hardware interface.

Additional verification: 14 Skylite unit tests; full web suite 36 passed; 6 Skylite browser scenarios passed, covering all eight profiles on desktop/emulated iPhone, mocked sensor calibration/cleanup, reduced motion, legacy linking and offline routes. Physical sensor accuracy and Safari hardware behavior remain unverified. See SKYLITE.md for frame conventions, filter equations, limitations and reproducible tests. The prior nine instrument-browser scenarios were rerun and all passed.

## Shared post-firing adapter

All eight stubs now use the same versioned firing/trajectory/reset contract. The common adapter binds one explicit simulated firing identity, accepts continuous sphere pose and rejects unauthorized or stale frames. Distinct app geometry expresses that shared input. 39 web tests and the eight-stub browser integration scenario passed. No native verified firing, sphere write or cross-domain trajectory source is claimed. See SKYLITE.md.

## Topology-bound firing representation

Every stub includes a visible eight-arm architecture hash and inspectable enclosing descriptor. Shared control v2 binds explicit local simulated Sentinel firing to that descriptor and retains it throughout trajectory reception. Six launch legs and two postlaunch arms stay distinct; existing client-to-MDL-role mapping is explicitly unvalidated. Native firing/launch authority remains blocked. See SKYLITE.md and topology test evidence.

## Connected session persistence

Shared controls v3 adds retained firing across pause, explicit local save/restore, read-only recorded-frame inspection, input-access events and late-receiver checkpoint recovery. Reset ends firing and clears pending/stored checkpoints. Missing samples and recovery discontinuities stay explicit. See SESSIONS.md for current behavior, retention, storage/privacy limits and test commands; it supersedes the earlier pause/refire and memory-only limitations. Native authority and cross-domain bridging remain unconnected.

Executed on this session-persistence revision: **40 Python tests, 44 web tests, 3 new session browser scenarios, 1 eight-stub shared-control scenario, 6 Skylite browser scenarios and 9 original instrument browser scenarios passed**. Source/generated page checks, packaged static output checks and whitespace checks passed. Evidence is in `evidence/session-*.txt`. Sensor inputs remain mocked and iPhone remains Chromium emulation. No physical-device accuracy, full native gameplay coupling or verified engine qualification is claimed.

## First numerical gameplay consumer: Surface

The new Surface game reuses existing tested displacement/impulse mechanics and adds explicit common-adapter gameplay coupling. Three levels/challenge, scoring/progression, recovery, local saves, audio, responsive/reduced-motion controls and offline files are implemented. Its source binding remains a simulated firing/topology reference with gate CLOSED. See SURFACE_GAMEPLAY.md for source hash, equations, coupling limits and remaining platform/native-engine limitations. Other apps' numerical gameplay coupling remains outstanding.

Executed on the Surface consumer revision: **40 Python tests, 48 web tests and 23 browser scenarios passed** (4 Surface, 3 persistent-session, 1 eight-stub shared-control, 6 Skylite, 9 original instruments). Surface browser controls solve all three levels and seeded challenge, and reload retains unlocked progression. Root/generated and standalone static build checks plus whitespace checks passed. Evidence: `evidence/surface-*.txt`. Initial tests exposed a pause-test timing assumption and mobile topology-text overflow; the test captures the paused tick and the long hash now wraps. This is simulation software verification, not native burn-engine or physical-device validation.
