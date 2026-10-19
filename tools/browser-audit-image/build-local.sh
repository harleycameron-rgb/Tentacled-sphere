#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v docker >/dev/null
command -v node >/dev/null
mkdir -p reports
base_tag='mcr.microsoft.com/playwright:v1.64.0-noble'
digest="$(docker buildx imagetools inspect "$base_tag" | awk '$1=="Digest:" {print $2; exit}')"
if [[ ! "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then echo 'Base digest unresolved; refusing build' >&2; exit 1; fi
base="mcr.microsoft.com/playwright@$digest"
printf '{"tag":"%s","resolvedBase":"%s","platform":"linux/amd64"}\n' "$base_tag" "$base" > reports/base-image.json
docker buildx build --platform linux/amd64 --build-arg "BASE_IMAGE=$base" --load -t waxtablet-browser-audit:pw1.64.0 .
docker run --rm --network none --entrypoint node waxtablet-browser-audit:pw1.64.0 /opt/waxtablet-audit/smoke.cjs > reports/offline-browser-smoke.json
node -e "const f=require('node:fs');const r=JSON.parse(f.readFileSync('reports/offline-browser-smoke.json','utf8'));if(r.status!=='PASS'||r.playwrightVersion!=='1.64.0')process.exit(1)"
