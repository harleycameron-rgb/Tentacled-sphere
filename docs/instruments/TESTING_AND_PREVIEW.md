# Local, offline, mobile and private-preview checks

## Run locally

From the repository root:

```sh
python3 scripts/build_web.py --check
PORT=8084 python3 scripts/dev_server.py
```

Open `/instruments/seven-stage.html` or `/instruments/octopus.html` on that local server. Neither page needs the Python API to run. The optional existing-app panel still uses its original API and transparently reports an unavailable API; it never fabricates substitute engine geometry.

## Automated checks

```sh
python3 -B -m unittest discover -s tests
node --test tests/web_*.test.js
python3 scripts/build_web.py --check
python3 scripts/build_web.py --output public
```

For browser acceptance, use an installed Playwright (tested with 1.62.1), system Chromium, and the local server:

```sh
node tests/instruments_browser.cjs
```

`SCANDOC_INSTRUMENTS_URL` selects another localhost origin; `SCANDOC_CHROMIUM` selects a Chromium executable other than `/usr/bin/chromium`. Playwright is a development-only tool, not a browser runtime dependency. A typical isolated test installation can use `npm install --prefix /tmp/scandoc-browser-check --no-save playwright@1.62.1`, with its node_modules added to NODE_PATH for the test process. Keep the runtime's proxy and CA trust; never disable TLS verification to make a network test pass.

## Offline / real-device procedure

1. Load either instrument on HTTPS or localhost and choose **Enable offline files**. Await the ready message, then disable networking and reload both pages.
2. Check every stage/mode, touch and drag, sliders, keyboard navigation, pause/reset, manual action and optional automatic cycling. Existing API-dependent app panels are outside the standalone-offline promise.
3. Use system reduced motion and the in-page toggle. Automatic canvas motion should stop, while numerical time and explicit actions remain available. Orientation denial must retain manual control.
4. On iPhone Safari, Android Chrome and Mac Safari/Chrome, test orientation permission, suspend/background/restore, audio mute/stop, screen rotation, text zoom, fullscreen/expand fallback and offline cache eviction. iOS may evict cached assets. Audible output and hardware sensor behavior require physical checks.
5. Verify no console exception, no horizontal overflow, no personal-data request and no verified-receipt claim. Engine CLOSED and centre unwritten must remain visible throughout local validation.

`file://` may load classic-script visual controls, but does not guarantee Web Crypto or service-worker support. Use HTTPS or localhost for full acceptance. No fonts, CDNs, libraries or accounts are required by the instruments.

## Private preview instructions — not executed by this PR

Keep this feature branch unmerged. Use an isolated preview project with Vercel Authentication (or another authenticated staging host), without attaching the production domain or changing DNS. Inspect its team/project before linking. Deploy the existing static build output to that preview host; backend integration is optional and is not a prerequisite for the two instruments. Preserve the current services configuration when deploying the full application.

A static-only preview can be assembled outside the source checkout from `public/`; its legacy API-dependent panels will correctly report an unavailable API unless an actual same-origin backend is supplied. Do not add invented API data. Keep the preview private and verify access protection before sharing its URL. A new Vercel project's first deployment may be assigned Production by the platform; do not use that as a reason to publish to an existing production project. This task requests instructions, not a deployment or production promotion.

Existing `.github/workflows/deploy.yml` deploys only on a push to main. This PR changes neither workflows nor Vercel/DNS configuration, and does not merge, promote or deploy. Normal PR test checks may run.
