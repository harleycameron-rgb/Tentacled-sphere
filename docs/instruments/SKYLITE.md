# Adaptive Skylite shell and eight stubwork adapters

The new entrypoint is `/instruments/skylite.html?app=tap`. The `app` parameter accepts the eight existing IDs: tap, surface, spiritlevel, gain, habitat, time, space and lineage. The same selector is available in the page. Each legacy application's optional instrument panel links to its corresponding Skylite profile. No legacy app, sensor flow, snapshot protocol or backend is replaced.

## What is implemented

A responsive Canvas shell offers pointer/keyboard rotation, explicit local pulse events, pause/reset, fullscreen/expand, reduced motion, sound, offline files, permission-gated orientation/motion and stationary calibration. Manual controls remain usable when permission or hardware is unavailable. The raw requested pose is grey, the attenuated pose cyan; Surface also displays an amber reference paraboloid. Input/output frames are locally inspectable and remain in page memory. The engine gate remains CLOSED.

| Existing app | Declared browser adapter |
| --- | --- |
| Tap | Inward celestial hemisphere and local Sentinel reticle |
| Surface | Earth-reference convex sphere cap and concentric paraboloid; explicit signed principal curvature, sag, normal and scale |
| SpiritLevel | Relative calibrated plane / horizon |
| Gain | Six radial display channels, including bounded attenuated velocity influence when available |
| Habitat | Simulated orbital environment and horizon |
| Time | Actual retained session trace; no samples means unavailable, never fabricated history |
| Space | Three-axis cube and local coordinate frame |
| Lineage | Actual local pulse-event ancestry; unique session/event IDs, not verified burn history |

These are versioned mathematical/browser reference adapters. They are not asserted to be pre-existing upstream engine formulas, Earth observations, astronomical ephemerides or verified engine execution. The reusable viewer is separate from the earlier M2 TAP game's unique Skylite option.

## Input and velocity semantics

Orientation uses browser-reported alpha/beta/gamma converted from degrees to radians, with a calibration reference and wrapped angular differences. Device motion uses only finite `DeviceMotionEvent.acceleration` (gravity-free) samples in m/s². Missing gravity-free acceleration is unavailable; `accelerationIncludingGravity` is not silently substituted.

The user must calibrate while holding the device stationary. The most recent gravity-free acceleration becomes the device-axis bias. Each new timestamped motion sample is processed once: corrected acceleration integrates delta velocity using its own elapsed sample time. Non-increasing timestamps reject; gaps over 0.1 s are not integrated or interpolated. Rendering frames do not integrate held sensor samples repeatedly.

With calibrated orientation, intrinsic Z-X-Y orientation matrices map device vectors into the calibration session frame. Without orientation, the estimator explicitly assumes a fixed device frame. The result is a bias-sensitive, bounded relative delta-velocity estimate, not absolute/GPS velocity or certified inertial navigation. The estimator clamps components to ±20 m/s; acceleration outside ±100 m/s² is rejected. No claim of physical accuracy is made. Real-device calibration, bias drift, sensor cadence and orientation conventions require hardware acceptance.

Reported inputs, unavailable data, estimates and derived display geometry retain separate fields in `scandoc-skylite/frame/1`. The raw acceleration sample is reported-device data; geometry remains `DECLARED_BROWSER_MODEL` and `DERIVED_GEOMETRY`. No interface upgrades those labels to verified engine state.

## Attenuated geometry

The browser integrates at a fixed 1/60 simulated-second step. Orientation and derived velocity display outputs use:

`output_next = output + (gain * input - output) * (1 - exp(-lambda * dt))`

Lambda is 0.2..12 per second and gain 0..2. Raw delta velocity is retained separately from this display filter. The analytical first-order step response and equivalence at 60/120 Hz are unit-tested. Attenuation is a defined numerical operation, not a physical dissipation measurement.

## Explicit Surface curvature

The reference Earth is a mean-radius sphere, R=6,371,008.8 m. It is not an oblate Earth model or geolocation fix. The patch extends to rho=0.08 R. The outward tangent-frame surface sag and signed principal curvatures are:

- Sphere: `z = -rho² / (R + sqrt(R²-rho²))`, `k1=k2=-1/R`.
- Paraboloid: `z=-rho²/(2f)`, `kr=-(1/f)/(1+(rho/f)²)^(3/2)`, `kt=-(1/f)/sqrt(1+(rho/f)²)`.

The focal ratio f/R is adjustable from 0.25..2. The sphere and paraboloid remain separate curves with different curvature away from their common tangent reference. The local sphere normal is explicit. Metres, inverse metres and a **20× vertical display exaggeration** are visible/recorded; exaggerated display curvature must not be mistaken for the physical reference numbers. Neither a stationary planetary point nor a physical initial firing is invented.

## Real stubwork connection and boundaries

**Open and connect selected stubwork** loads the real legacy page and opts into the existing same-origin v1 adapter. Accepted unverified API vectors can orient the Skylite reference frame. **Send derived view** sends only a SIMULATED view envelope; it cannot mutate original API geometry, commits or acknowledgements. The current legacy adapter supports yaw/tilt and its documented controls; it does not carry raw accelerometer data, roll or verified receipts. Linking across the two production domains requires a separate authenticated cross-origin design; BroadcastChannel alone cannot do it.

Infrared is **UNAVAILABLE_NO_HARDWARE_INTERFACE**. No IR values are generated and ordinary camera data is not described as infrared. A compatible external sensor interface and its units/calibration contract must be discovered before implementing an IR adapter.

Pulse-module retirement at a completed native gate, total-system counter-flow and the Chaos Lab's false-invariant/secondary-reference channels remain future integration requirements. Local Skylite pulses are actual browser interactions but are not native burns, core Sentinel provenance or Chaos Lab output.

## Executed verification and remaining coverage

`tests/web_skylite.test.js` adds 14 checks covering all eight adapters, first-order attenuation, sample-time integration without render duplication, reference-frame rotation, angle wrapping, explicit curvature, event identities/history, permission denial, gravity-only data rejection, listener cleanup and cancelled permission requests. These use synthetic input samples, not real hardware observations.

`tests/skylite_browser.cjs` exercises all eight profiles on desktop and emulated iPhone Chromium, manual touch/drag and attenuation, calibration through mocked browser events, accurate source labels, explicit unavailable IR, cleanup, reduced motion, actual legacy-app linking and all eight offline query URLs. See the evidence directory for the executed results.

Physical iPhone Safari, Android sensors, Mac browsers, audible sound and velocity accuracy are unverified. No IR hardware or trusted engine qualification is connected. No deployment, DNS modification or merge is included. The viewer runs locally using the existing dev server and is not yet present on either production domain.

Run with the server from TESTING_AND_PREVIEW.md:

```sh
node tests/web_skylite.test.js
node tests/skylite_browser.cjs
```

## One adapter, post-firing sphere reception

Every stub now loads the identical `control-adapter.js` (`scandoc-controls/1`). App identity selects geometric expression only, not a different control protocol. Opt in to the local link in each desired app, connect Skylite and explicitly **Fire local simulation**. That one actual local interaction identity binds subsequent sphere pose frames for all connected stubs. A receiver joining after firing remains idle until a new explicit firing; no historical firing is invented. Another firing resets the previous binding first. Pause/reset sends RESET and stops transmission. Receivers also disconnect on visibility/page lifecycle cleanup.

Frames carry producer, event identity, sequence, increasing logical tick, shared controls, relative Euler Z-X-Y pose (`position`, radians) and angular velocity (`velocity`, rad/s). These are display pose coordinates, not Earth displacement or measured linear velocity. Stale, pre-fire, mismatched-event, wrong-producer, nonfinite or falsely verified frames are rejected. The existing sensor delta-velocity estimates remain separate. State snapshots are detached and frozen. Receivers do not retransmit trajectory frames.

Each existing app expresses accepted pose through its own declared geometric adapter, including recorded local history/event geometry for Time and Lineage. Native API geometry and acknowledgements remain untouched. This is a functional local simulated post-firing control path, not the six-commitment native launch gate or verified sphere engine trajectory. The native gate remains CLOSED, sphere writes disabled, and hashes/receipts absent. Same-origin BroadcastChannel does not bridge different website domains.

Verification: `node --test tests/web_*.test.js` passed 39 tests; `node tests/shared_controls_browser.cjs` passed the eight-actual-stub shared firing, continuous pose and reset scenario. An initial browser run exposed legacy view messages overwriting the shared expression; receptive adapters now prioritize the bound trajectory. Physical device and native engine integration remain unverified.

## Encapsulating topology and Sentinel firing

Control schema `scandoc-controls/2` (channel v2) requires the complete immutable `scandoc-eight-arm-topology/1` descriptor and its canonical SHA-256 representation hash. Every stub displays the hash even before firing. The descriptor records the centre reference without writing it, the six launch legs, three opposing pairs, six-commitment requirement and two postlaunch temporal arms. The eight existing client IDs are listed separately: their mapping onto all MDL roles remains UNVALIDATED. No eight-face launch vector or launch axis 4 is created. This hashes architecture, not measured geometry or native engine state.

Each actual explicit local firing creates `sentinel_firing/1`: event ID, producer, initial logical tick and enclosing topology hash, labelled LOCAL_SIMULATED_FIRING / engineVerified=false. Subsequent trajectory/reset frames retain exactly that firing record. Missing/altered topology, firing identity, firing tick or false verification is rejected before receiver state changes. Geometry hashes and temporal receipts remain separate null fields. Native Sentinel logs and trusted launch qualification are not connected. The topology descriptor/hash is build-pinned; tests recompute SHA-256 from canonical content, and receivers require the exact descriptor/hash rather than accepting arbitrary inbound topology claims.

Executed verification: 40 web tests, including canonical hash recomputation, all eight encapsulated snapshots and altered topology/firing rejection; actual eight-stub browser test checks the topology and firing binding during continuous reception/reset. Test logs: evidence/topology-web.txt and evidence/topology-browser.txt. The first test run found object-key order sensitivity in comparison; canonical comparison fixes transport round-trips.
