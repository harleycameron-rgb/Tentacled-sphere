ARG BASE_IMAGE
FROM ${BASE_IMAGE}
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright AUDIT_OUTPUT_DIR=/tmp/waxtablet-audit HOME=/home/pwuser
WORKDIR /opt/waxtablet-audit
COPY package.json ./
RUN npm install --omit=optional --ignore-scripts --no-audit --no-fund && node -e "if(require('playwright/package.json').version!=='1.64.0')process.exit(1)"
COPY audit.cjs smoke.cjs ./
RUN node --check audit.cjs && node --check smoke.cjs
USER pwuser
RUN node smoke.cjs
CMD ["node", "/opt/waxtablet-audit/audit.cjs"]
