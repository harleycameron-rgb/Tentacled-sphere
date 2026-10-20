# Tentacled Sphere

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

`vercel.json` defines two independently built services in one Vercel project:

- `app`: Python, rooted at `.`, with the explicit `api/index.py` entrypoint.
  Only `/api/tentacled-sphere` is routed to this service, without stripping or
  changing the path expected by the handler.
- `web`: static browser pages, rooted at `.`, built with
  `python3 scripts/build_web.py --output public`. Only `public` is published;
  short app rewrites belong to this service. The final public catch-all routes
  to `web`, including `/`, `/apps/*.html`, and `/web/*`.

Build settings are service-scoped. The top-level rewrites select the API first
and the static service last. Browser requests already use the public same-origin
`/api/tentacled-sphere` URL. Neither service makes server-to-server requests, so
there are no internal service bindings or binding environment variables to set.
A static browser bundle cannot consume a runtime function binding.

`tools/browser-audit-image` is deliberately not a service: it is a separately
approved, one-shot sandbox diagnostic, not an HTTP server. Its Dockerfile also
requires an explicitly resolved `BASE_IMAGE`. Adding it as a container service
would not provide a callable backend. Its existing external diagnostic target
is not an internal dependency of this application.

Use `vercel dev` to test both services and shared public routing together.
The existing `python scripts/dev_server.py` command remains a single-process
alternative, not a test of Vercel service isolation or bindings. Service names
`app` and `web`, both public route selections, omission of the audit image,
and the absence of internal bindings require project-owner confirmation.

GitHub Actions runs
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