# Authenticated MDL simulation foundation

Node 24+, standard library only. Native gate always CLOSED. See ../docs/mdl for audit, architecture and readiness.

Run tests: `npm test` in this directory. HTTP tests require permission to bind localhost. No production secrets are used by tests.

For local development set SCANDOC_OPERATOR_TOKEN to a newly generated private token of at least 32 characters and SCANDOC_DB_PATH to an explicit writable SQLite file outside the source tree, then run `npm start`. Default bind is 127.0.0.1:8090. Use an Authorization: Bearer header; never place operator tokens in HTML, URLs or committed files. The exported credentials() helper derives restricted per-tip tokens; operator provisions them privately.

Private hosting preparation (not executed): provide a persistent volume, HTTPS reverse proxy and a single supervised Node process; set SCANDOC_HOST, SCANDOC_ALLOW_REMOTE=1 and exact HTTPS SCANDOC_ORIGIN. Provision/revoke tokens securely, implement rate limiting and account-based authorization, test backups and recovery, and review browser session integration before public release. SQLite files on ephemeral Vercel Functions disks are not durable cloud hosting. No deployment configuration is changed by this package.

The supplied HTTP service has no browser credential UX, no automatic simulation scheduler, no full HTML game clients and no external verifier. An authorized source explicitly issues STEP commands. Existing v0.1 demo remains separate; do not publish it as this service.
