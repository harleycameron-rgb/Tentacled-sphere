# Unified MDL audit — 2026-11-08

Baseline: main a7a481b5debc31b166ae6b51c638a44f3b0e217c. PR #18 is already merged; its v0.1 is a baseline, not acceptance evidence. No AGENTS.md was found in this checkout. Work is isolated on feature/scandoc-mdl-unified-v1. Existing dirty worktrees were preserved.

| Inspected files | Reuse and boundary |
|---|---|
| apps/{tap,surface,spiritlevel,gain,habitat,time,space,lineage}.html | Existing generated applications preserved. Names do not establish qualified Cube or Sphere role implementations. |
| web/app-template.html, scripts/build_web.py | Existing static generation path preserved; generated-file check executed. |
| web/app.js | Existing controls, application state, camera lifecycle and protocol handling retained. No silent connection to the new service. |
| web/geometry.js | Existing geometry normalization and cube/octahedral rendering retained. Server metric uses an explicitly separate local simulation frame. |
| web/audio.js, web/style.css | Existing audio and responsive presentation retained. No replacement or new media capture. |
| web/protocol.js | Existing canonical finite payload and acknowledgement contracts retained; new MDL schema does not masquerade as this protocol. |
| api/index.py, api/trajectory_contract.py | Existing stateless Python API and research trajectory logic retained. Not an authoritative genesis service. |
| scandoc-cloud-beast/src/{core,server}.js | Legacy v0.1 uses in-memory state, coordinate-wise median and unauthenticated HTTP. Preserved for compatibility; do not expose that demo as the authoritative runtime. |
| scandoc-cloud-beast/public/index.html | Existing demonstration, not eight independently playable interfaces. |
| tests/web_*.test.js, tests/test_*.py, scandoc-cloud-beast/test/*.test.js | Existing regression suites executed alongside new foundation tests. |
| vercel.json, .github/workflows/* | Existing hosting and production configuration untouched. New service is not routed or deployed. |

## Name mapping, pending application integration

Tap, Surface, Gain and Habitat are candidate lineage mappings to their identically named roles. Existing Time is a candidate retrospective interface, subject to post-separation and actual-history constraints. SpiritLevel, Space and Lineage have no approved replacement mapping to Engine, Business or Foretentacle. They remain intact. Engine, Business and Foretentacle require actual application implementation, not renaming aliases. The six Cube preparation HTMLs must be distinct from eight moving Sphere HTMLs.

The new registry defines those responsibilities without claiming that corresponding HTML applications are connected. `html_commitment` is explicitly null: no HTML artifact qualification is fabricated. Other branches/local prior experiments were not silently merged into main.
