# Persistent connected local simulations

This supersedes the earlier disconnect-on-pause, late-receiver-refire and memory-only limitations. The native engine gate is still CLOSED. Controls use `scandoc-controls/3`; all apps must run this version on the same origin. No cross-domain bridge is implemented.

## Use

Start Skylite and **Fire local simulation**. Firing and trajectory recording work independently of backend services and without connecting another app. Optional touch/device inputs can evolve afterward. Open the selected stub and connect, or explicitly connect the local link in other stub pages. A late receiver requests the already-recorded firing and latest frame; this never creates a new firing. Each app retains its own expression of the same event identity.

Pause retains firing, emits a paused frame, stops sensor/audio resources and suspends transport. Start resumes with manual fallback; permission is never restored automatically. Receiver lifecycle interruptions close transport; reconnect explicitly. A missed reset/new firing can recover from the source's recorded checkpoint, with a recovery discontinuity and missing transport frames reported. It does not invent missing transitions. Only one source should own a session; BroadcastChannel is local, unauthenticated transport, not an engine authority.

**Save simulation** saves locally; automatic checkpoints run every five seconds and on pause/pagehide. **Restore saved simulation** is explicit and requires the runtime to be paused. It checks the saved checksum, schema, topology, firing binding, input states and frame ordering before replacing state. It restores paused, with sensors off. Connect and Start to resume. Reset ends firing and removes the saved session, including invalidating pending writes. Browser termination may lose events after the last completed checkpoint; asynchronous pagehide writes are not guaranteed. Storage denial/quota failure is visible and leaves memory-only operation.

## What is recorded

The immutable firing identity/topology binding stays separate from mutable input-access events, shared controls, relative pose and angular velocity. Input access explicitly records MANUAL, REQUESTING, AVAILABLE, DENIED_OR_UNAVAILABLE and INTERRUPTED. Lack of fresh device samples falls back to manual after the watchdog detects it (three-second threshold checked at five-second intervals). Native permission revocation is inferred from missing samples; browsers do not expose a universal revocation callback. Calibration and sensor permission are not persisted as authorization. Raw camera/audio or personal data is not stored or transmitted.

The source journal holds up to 3,600 actual frames (about one minute at 60 trajectory frames/s, less with additional input events). The original firing and latest retained tail are kept; removed frames are counted as missing. Storage schema `scandoc-session/2` stores topology once, plus actual frames and a canonical SHA-256 checksum. This detects accidental changes; anyone able to rewrite local storage can recompute it. It is not a verified receipt. Geometry hash and temporal receipt remain separate null fields. History before firing and removed/interrupted samples are unavailable.

The recorded-frame slider inspects detached, frozen prior frames. It neither sends controls nor changes the current simulation. It cannot select future or missing frames. This is a read-only local replay inspector; it is not deterministic reconstruction of all upstream engine state or the full M5 temporal game.

## Verification

Run against the local server:

```
node --test tests/web_*.test.js
node tests/session_browser.cjs
node tests/shared_controls_browser.cjs
node tests/skylite_browser.cjs
node tests/instruments_browser.cjs
python3 scripts/build_web.py --check
```

Session tests cover checksum/corruption/storage denial, bounded missing history, immutable replay, monotonic continuation, late reconnection, missed reset recovery, explicit save/reload/restore/resume, reset/write interruption, permission denial and a granted-but-silent sensor stream. Chromium browser sensor events are mocks; physical iPhone/Android/Mac and storage eviction/device performance remain unverified. No deployment or DNS changes are needed to run these tests.
