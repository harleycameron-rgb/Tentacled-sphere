# Surface numerical gameplay coupling

## Reused source and boundaries

`instruments/surface-game-core.js` adapts the existing development worktree's `octopus/src/games/surface.js` and its common helpers to the feature branch's classic-script/offline distribution. Surface source SHA-256: `9167920691e3f9d32000b92ee57fb352c41407cea5c3fd824e9429afcc0e806a`. Its `create`, `update`, target, budget, damping, collision, persistence objective and scoring equations are reused. Imports/exports are wrapped for existing browser/Node interfaces; state/control validation and the common trajectory coupler are added. The earlier six-game worktree is untouched. This does not replace the legacy Surface API app or turn all eight adapters into one gameplay mechanic.

The new independently playable page is `/instruments/surface-game.html`, linked from the hub and legacy Surface panel. It includes three progressively stricter levels, seeded replayable challenge, tutorial, touch/keyboard controls, signed single/double splats, recovery brake, scoring, level unlocks, best scores, pause/restart, local game/progress saves, optional Web Audio, reduced motion, collapsible controls, fullscreen/fallback and offline caching. Corrupted restores leave current state usable. Audio closes on pause, blur and lifecycle interruption. This page requests no sensor permissions; Skylite is the optional sensor source.

## Numerical mechanics

Six angular sectors sample a dimensionless radial field around a unit-sphere reference. State is displacement u[i], velocity v[i], RMS target residual, impulse budget, collision count and drift integral. This six-sector display is a coarse gameplay discretisation, not a validated geodesic mesh or physical Earth model. The Earth/paraboloid reference remains in Skylite.

Each manual or coupled splat adds signed velocity and consumes the existing budget. Decay uses exp(-(2+4*tension)*dt), with neighbour velocity diffusion, then displacement integration at fixed 1/60 s. Obstacle sectors 2/5 clamp displacement at 0.32 and reflect velocity by -0.4; others bound at 0.6. Success requires residual < 0.04+0.025/difficulty and speed < 0.06 continuously for 1+0.5*difficulty seconds. Timeout at 65 simulated seconds fails; restart recovers. Drift length is accumulated simulated speed*dt. No physical units or validated pulse-burn dynamics are claimed.

## Shared input contract

1. Start Skylite, connect its local link and explicitly fire a local simulation.
2. Open Surface game on the same origin; select Connect sphere trajectory.
3. Explicitly check Allow simulated trajectory impulses, then Start the game.
4. Rotate beta to produce angular velocity; yaw selects a sector. Watch actual velocity/displacement, residual and budget change. Inspect the bound event ID and topology hash.

The identical `scandoc-controls/3` adapter validates the source; no second control protocol is invented. The Surface-specific expression maps yaw to the nearest of six sectors and signed beta angular velocity to inward/outward impulse. A 0.15 rad/s dead zone avoids jitter. Strength clamps to [0.1,1] after multiplying |angular velocity| by 0.15*(0.5+energy); cadence is at most four splats per simulated second. Queued manual actions have priority over trajectory impulses. Cooldown/age continue advancing when manual input takes priority. State must have available budget and remain active. Source pause/reset, 0.5 s without a received frame, game pause or disconnect stops coupled impulses. Reconnect and re-enable coupling explicitly after game pause/restore.

All quantities remain SIMULATED; the source event identity/topology hash is retained. The gate stays CLOSED, no sphere centre is written, and no new Sentinel event or verified receipt is minted by this consumer. Native six-commitment qualification and other apps' gameplay coupling are not implemented by this change.

## Tests and readiness

Run `node --test tests/web_*.test.js` and `node tests/surface_game_browser.cjs` with the local server on port 8084. Numerical tests solve all three levels plus seeded challenge through actual controls, and check repeated impulses, decay, collisions, recovery, timeout failure, saves/continuation, input bounds and actual coupled budget/field changes. Browser tests exercise standalone actions, pause/reload/restore/corruption/restart, the real common transport from Skylite into game state, source pause, disconnect/manual recovery, touch layout, reduced motion and offline operation.

Physical iPhone Safari, Android, Mac browsers, audible output and hardware sensor accuracy remain unverified. Automated iPhone coverage is Chromium emulation. Optional local storage/cache may be denied or evicted. This is the first numerical gameplay consumer of the shared adapter; it is not a declaration that all six M2 games, launch gates or temporal milestones have passed.

Actual results: all 48 web tests passed, including the four Surface state/coupling tests. All four Surface browser scenarios passed; a browser pilot uses only normal controls to win all three levels and challenge, then checks saved unlocks after reload. The existing 19 browser scenarios and 40 Python tests also passed. No merge, deployment or DNS changes were made.
