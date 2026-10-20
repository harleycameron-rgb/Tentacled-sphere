# Tentacled Sphere

## Invariant public-source integration stage

Open **`/invariant`** for the new local shell. Its six enabled interfaces are
`/invariant/tap`, `/invariant/surface`, `/invariant/evidence-gate`,
`/invariant/modular-topology`, `/invariant/credit-game`, and
`/invariant/study-environment`. Direct links, reloads, browser back/forward and
the Sphere/shared-state return path work locally and in the static output.
The existing `/`, `/apps/*`, short legacy routes and Python API below remain
the separately labelled eight-arm diagnostic model, not interface membership.

Base verified before edits:
`copilot/implement-unified-invariant-application` at
`4a50ce852e823f49b2abb91a05db4bcf4e69dad1`.
Both that commit and coordinate commit
`fb2ce4fd03a4134bf0025e6865c1607f10cc11c6` remain in the ancestry.
Implementation branch: `copilot/copilotimplement-six-interface-integration`;
draft PR #13 targets the implementation branch, not main. Its initial
`5ad94811c9b11d9a2cfd978eb27c7bfa6ee6e228` commit changed no files.
The final implementation head is reported in the PR/commit history rather
than embedded in its own content.

### Imported functionality and boundaries

Public source pins:

- `harleycameron-rgb/invarianttap.app`:
  `f3a3f39134c05c01c836ad228eef031e855d3303`.
- `harleycameron-rgb/scandoc-zero-previews`:
  `a9c913e1dfcea780e494d13054b30e1104736073`.

The minimal complete vendored trees, original per-file SHA-256 hashes,
upstream notices and explicit source modifications are recorded under
`vendor/`. Source and assets are served locally, never fetched from deployment
URLs at runtime. GitHub commit lookup verified both pins; the API archive
endpoint returned HTTP 403, while GitHub's public archive host succeeded.
No private source import or deployment was attempted.

| Interface | Implemented behavior and actual local edge |
| --- | --- |
| Tap | Original moiré canvas, floating/collapsible controls, permission UI, motion/compass and sound. Receives explicit Surface-derived status feedback; no compatible measured Tap output binding is claimed. |
| Surface | Original pad classifications, bounded traces, sixteen-step rhythm, audio and optional tilt. Its inspected adapter exports bounded derived rhythm summaries, not contact paths, tilt history or media. Explicit bridges feed Tap status, Study inspection or Evidence inspection. |
| Evidence Gate | Original Manifest and Display workspaces, plus reusable content-binding/synthetic verification in the shell. Retains declared-only, sample-supported and sample-counterexample states. Instrument-result inspection retains its own provenance and does not become synthetic-fixture verification or authorization. |
| Modular Topology | Explicit adapter/capability registry, compatibility checks, retained dependency requirements and permitted/rejected local transitions. `engine.input`, authorization and launch remain blocked. |
| Credit Game | Actual staged `communicate-rules-preview-2` sandbox, liability reservation, staged replacement, settlement/revocation and admission-bound simulated fault review. Noncash accounting is isolated from geometry, evidence and session-path budgets; credit does not determine truth or contributor worth. |
| Study Environment | Actual knowledge-only `science()` questions, notes, synthetic transforms, sample scope and counterexamples. Session-derived results remain separately inspectable with original provenance; no credit prerequisite or private paired-renewal controls. |

The shared session is bounded to 64 immutable, session-bound records in memory.
Versioned adapters declare frame, units and local/unverified scope; commitments
bind predecessor dependencies, not trusted identity. Missing/stale dependencies,
unsupported schemas, raw fields and unsupported transitions are rejected.
No local result is an authenticated paired planar-v2 execution. Credit and
knowledge source workspaces are memory-only sandboxes: leaving and reopening
them resets their private workspace state, while the shell session persists
across internal navigation. Reloading the shell resets that session too.

Source frames are destroyed on navigation/deactivation. Hiding or leaving a
view stops active resources; returning after hiding requires an explicit reopen
gesture and never silently resumes sensors. Tap's upstream worker registration
is disabled in the vendored scope; the shell installs no worker. No unrelated
origin caches or worker registrations are removed.

### Stage acceptance matrix

| Capability | Stage status |
| --- | --- |
| Pinned public source import | Implemented locally, with original hashes and notices |
| Real instrument operation | Public Tap/Surface source retained; browser interaction tested, not physical-device calibration |
| Local data-flow binding | Surface-derived summaries → explicit Tap feedback / Study inspection / Evidence inspection; reverse measured Tap binding unavailable |
| Authorization capability | **Unavailable**: content integrity and local route policy are not authenticated dispatch |
| Launch readiness | **Blocked**, `liveGate=CLOSED`, simulation trust `UNVERIFIED` |

`waxtablet-AGI-environmental-convergent.V.1.0` and `scandoc-provenance`
capabilities remain unavailable pending separately reviewed imports. No APIs
were reconstructed from guesses and no new access was requested. Missing
independent observations and unsupported result schemas remain unresolved.
Eight-version capacity includes two explicitly unavailable, unnamed fourth-axis
versions; time is the fourth axis, not a launch app. Legacy time/space/lineage
files do not identify that missing pair. Six SHA-256 contribution fields have
1536 output bits, not independent approvals or a 1536-bit security guarantee.

The existing read-only geocentric coordinate adapter is loaded unchanged.
Its UEN ordering, shear/scale-versus-rotation distinction, polar availability
and exact-north-pole underflow behavior remain separate from measured state.
Geographic and celestial poles are distinct; no undefined direction fires
Sentinel. Existing launch acknowledgement, source/origin, transcript,
revision and separation/trajectory gates are unchanged.

Additional local verification (no new test dependencies):

```bash
python scripts/build_web.py
python scripts/build_web.py --check
python scripts/build_web.py --output /tmp/invariant-public
python -m unittest discover -s tests
node --test tests/web_*.test.js
RUN_BROWSER=1 python -m unittest discover -s tests -p test_invariant_browser.py
```

The last command uses installed Chromium/chromedriver through WebDriver,
not DOM mocks, and is opt-in. It does not certify live sensor permissions,
physical compass/motion calibration, audible hardware output, unavailable
backend admission/execution/disclosure or production hosting. No merge,
release, purchase or deployment is part of this stage.

Executed browser checks cover all six direct routes and reloads, actual trusted
pointer input through the Surface adapter/session into Tap feedback, back/forward
and Sphere return navigation, synthetic Evidence recomputation, unsupported
authority/schema rejection, knowledge access without credit, no registered
workers, explicit reopening after deactivation, and actual Surface audio/node/
tilt cleanup on removal. A delayed-real-SHA-256 regression also checks that
navigation during admission invalidates superseded feedback. The source
Surface return link also uses an active-frame-validated navigation message
without relaxing sandbox navigation permissions. All seven Chromium
tests passed. Node core tests use computational checks and some DOM mocks;
those are separate from these browser executions.

The full Python discovery run completed 31 tests successfully (25 passed,
six opt-in browser cases skipped). The final return-link regression was then
added and passed with the other six browser cases above. This includes
the existing API, generated-page and coordinate-decoration checks. The Node
suite retains all 19 coordinate tests and all 12 coordinate-adapter tests,
alongside the source, session, evidence, credit and knowledge checks.

Read-only integration review identified an asynchronous stale-feedback race;
it was fixed and the reviewer confirmed the fix. Final automated parallel
review/CodeQL validation timed out repeatedly and opened its circuit breaker:
it is **not** reported as a successful final automated security scan. GitHub
Actions for this draft requires approval and has not executed jobs. Secret
scanning reported no secrets. Physical-device and unavailable-backend checks
remain unexecuted; local tests do not replace them.

## Legacy geometry / API compatibility

The repository contains a stateless Python geometry endpoint and a browser-local
interface for eight independently addressable apps: Tap, Surface, SpiritLevel,
Gain, Habitat, Time, Space, and Lineage. The browser connects to the API; it
does not replace an unavailable API with generated geometry. The original
Scandoc-Zero and Cloudburner17 research context is retained, but compatibility
with external harnesses and symbolic interpretations is not implied.

## Python API baseline

```text
GET /api/tentacled-sphere?seed=1.0&delta=0.1137
```

`seed` defaults to `1.0`; `delta` defaults to `0.1137`. Query parameters
override the optional `SEED` and `DELTA` environment defaults. Values and the
generated sequence must remain finite; invalid input returns HTTP 400 and a
JSON `error`. The response contains eight indexed `tentacles`, each with a
sequence value, three-element vector, and curvature, plus aggregate curvature
statistics.

The unchanged API model is:

- `angle_i = seed + i * delta`
- `z_i = 1 - 2 * (i + 0.5) / 8`
- `r_i = sqrt(1 - z_i*z_i)`
- `vector_i = [r_i*cos(angle_i), r_i*sin(angle_i), z_i]`
- `curvature_i = 1 / r_i`, the latitude-circle curvature, not the curvature
  of a curve interpolating the eight arms.

All eight API vectors have unit length. The stable arm order for API indices
0–7 is `tap, surface, spiritlevel, gain, habitat, time, space, lineage`.

## Browser apps and geometry models

The integrated homepage is `/`. The standalone pages are available at
`/apps/tap.html`, `/apps/surface.html`, `/apps/spiritlevel.html`,
`/apps/gain.html`, `/apps/habitat.html`, `/apps/time.html`, `/apps/space.html`,
and `/apps/lineage.html`. Short routes `/tap[/]`, `/surface[/]`,
`/spiritlevel[/]`, `/gain[/]`, `/habitat[/]`, `/time[/]`, `/space[/]`, and
`/lineage[/]` rewrite to those pages. Each page is generated from
`web/app-template.html`; edit the shared template rather than hand-editing its
generated copies. `python scripts/build_web.py` regenerates the pages.

The API model remains the default. The separate selectable cube–octahedron
model has eight cube arms in the same app order, with sign vectors
`+++`, `++-`, `+-+`, `+--`, `-++`, `-+-`, `--+`, `---`, each normalized by
`sqrt(3)`. Its six fixed reference ports are ordered `+X, -X, +Y, -Y, +Z, -Z`.
Those are geometric references, not six connected runtime services. The
incidence matrix has three incidences per arm, four per port, and 24 total.
The cube and octahedron each have 12 edges; their expected spherical edge
angles are `acos(1/3)` (about 70.5288°) and 90°. Exact paired midpoint and
orthogonal-crossing checks apply only to this exact dual model.

The integrated view provides shared yaw, tilt, radius, and centre controls.
The prepared coupling origin `[1024, 1024, 0]` is retained. Device orientation
can override only the active app's arm; a valid finite, nonzero vector is
normalized for radial placement. Missing or invalid values are not replaced
with zero. Time also offers an optional local-clock vector, explicitly labeled
synthetic. Device readings are orientation inputs only; they do not measure
intent, ancestry, personality, or other symbolic concepts. No app-specific
geometry formulas were present in the inspected baseline.

### Sentinel modes

- **Shared rigid rotation** rotates every arm and every port together. It
  preserves pairwise distances and, for the cube model, the exact dual
  relationship within floating-point tolerance. Coherent movement does not
  change relative arm geometry.
- **Arm-only harmonic shift** rotates arm `i` by
  `count * amplitude * (1 + 0.5*sin(i*2*pi/8))`, with default amplitude
  `0.1137` radians. On the cube model, octahedral ports remain fixed; therefore
  this changes relative arm geometry and breaks exact duality. The UI reports
  the measured midpoint and orthogonality departures instead of claiming
  otherwise.

Each displayed state is derived from its declared baseline and pulse settings,
not repeatedly rounded coordinates. View rotation is separate and is not
recorded as a geometry state change. Reduced-motion preferences are honored.

## Sensors, camera, sound, and receipts

Sensor permission is requested only from the app's explicit button gesture.
Pause removes sensor listeners, clears the app feed, stops clock timers, stops
sound and camera tracks, and restores that arm to the API baseline. Optional
camera access is video-only (no microphone), preview-only, and stopped on
pause, cancellation, page hiding, or deactivation. Browser permission and
hardware behavior vary; automated mocks do not establish live-device results.

Every app has local Web Audio controls for waveform, volume, tone, live sound,
pulse, kick, snare, hi-hat, wobble, chord, and stop-all. Audio contexts are
unlocked by the user's gesture and closed when stopped or deactivated. These
software checks do not certify audible output on physical hardware.

Shared snapshots are browser-memory data. Their canonical JSON uses sorted
object keys and SHA-512. The integrated page accepts acknowledgements only from
the matching same-origin app frame and only for the current snapshot hash,
revision, ignition, and position. Identical retries are deduplicated;
completion and complete-run downloads require all eight matching app
acknowledgements. Sentinel change receipts include the before/after snapshots
and hashes, all pairwise arm distances and deltas, preservation checks, and
app acknowledgements. Downloads are initiated by the user. The app does not
store session data in localStorage, IndexedDB, or cookies. Browser hashes check
content consistency; they do not authenticate identity, establish trusted
qualification, prove physical measurements, or publish a Zenodo record.

### Structural Melting simulation contract

Structural Melting is a downstream trajectory consumer and is not included in
the existing eight-app launch acknowledgement basket. The browser simulation
requires the distinct sequence `ASSEMBLY_READY` (all eight matching
acknowledgements), `SEPARATION_COMPLETE`, `TRAJECTORY_PLOTTING`, then
`MELTING_ATTACHED`. Separation and plotting are explicit simulation
declarations; attachment requires both and is bound to the current run,
separation, and trajectory identifiers. Pre-separation timestamps, stale run
identifiers, mismatched trajectory/separation identifiers, and non-monotonic
records are rejected. Stopping plotting detaches the consumer; restarting
requires a new trajectory identifier. Resetting a run clears its downstream
state.

Launch receipts remain separate from post-separation trajectory and Structural
Melting attachment receipts. Simulation receipts (launch, trajectory, and
attachment) carry `liveGate="CLOSED"`, `sphereWrites=false`, and
`receiptTrust="UNVERIFIED"`.
Their SHA-512 hashes record content consistency only, not authenticated proof
of separation, plotting, or attachment. This repository does not define a
separation formula, a trajectory formula or data source, or derived time-axis
endpoint definitions; the simulation does not invent them. The six named
legacy launch towers in `index.py` remain distinct from the browser's eight
app identities, and the legacy temporal samples do not define later time-axis
endpoints.

The Python endpoint is stateless and does not store submitted geometry inputs.
This does not describe Vercel or other hosting access logs: the hosting provider
may process request metadata under its own policies.

## Local checks

Python 3.11+ and Node.js with the built-in test runner are used; no third-party
runtime packages are required.

```bash
python scripts/build_web.py
python scripts/dev_server.py
curl 'http://127.0.0.1:8000/api/tentacled-sphere?seed=1.0&delta=0.1137'
python -m unittest discover -s tests
node --check web/app.js
node --check web/audio.js
node --check web/protocol.js
node --test tests/web_*.test.js
python scripts/build_web.py
python scripts/build_web.py --check
```

The geometry tests exercise all 721 shared rotations from -360° through 360°
and all 401 harmonic amplitudes from -0.2 through 0.2 radians in 0.001 steps.
For cube arms at count one, every nonzero sampled harmonic amplitude changes
25/28 arm-pair distances using a `1e-10` threshold. Tests use numerical
tolerances; these are computational checks, not hardware measurements.

## Deployment

`vercel.json` builds the shared template output into `public`, serves the eight
pages and shared browser assets, and rewrites short app routes. The existing
`/api/tentacled-sphere` path is explicitly preserved. GitHub Actions runs
Python tests, validates generated pages, and runs the Node geometry/protocol/
sound checks before the production deployment step. Deployment uses the
repository's existing Vercel action and requires the `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` Actions secrets. When those values are
not configured, the workflow reports that deployment was skipped rather than
claiming publication. Use one deployment pipeline; enabling a separate Vercel
Git integration can create duplicate production deployments.

## Evidence and limitations

The cube incidence, edge, midpoint, crossing, and pulse claims above are
mathematical properties tested by the local computational suite. API-to-browser
and acknowledgement behavior is implemented in the shared browser code and
checked in automated protocol/build tests; it has not been certified in a
deployed browser or on live iPhone hardware. Permission prompts, sensors,
camera, and audible output still require real-device verification. The
prepared zip/patch named in the task was not present in the inspected
repository/environment, so no package provenance or source commit pin is
claimed. No DOI or Zenodo publication is claimed.