# Reusable browser audit environment

Prepared source only. No image build, registry push or browser acceptance is claimed. Earlier attempts stopped at environment setup; zero app checks ran.

## Requirements
The six tentacle apps are Tap, Surface, SpiritLevel, Gain, Habitat and Time. The separation trajectory is recorded, not generated. Space/Lineage values require that recorded trajectory to be plotted and concern the melting median face/camera melt. The existing eight-arm diagnostic is not the complete owner architecture. All supporting repositories remain relevant.

## Build before creating another timed VM
The official Playwright image and both npm packages use version 1.64.0 intentionally. build-local.sh resolves the image tag to a digest and refuses an unresolved digest. The image is linux/amd64. npm generates a lockfile inside the image; a pre-resolved dependency lock and base digest are not claimed in this source draft.

Run bash build-local.sh only in an authorized Docker build environment. Dockerfile has no default BASE_IMAGE. It copies only the package and two scripts, disables browser downloading and npm lifecycle scripts, and launches an offline browser smoke test as pwuser during build. The launcher repeats the smoke test with networking disabled. A launch failure blocks publication; it is not twelve failed application tests.

The source package was syntax-checked, but the container has not been built or run here. Resolving action SHAs is not an audit of every action implementation.

## Credentials and execution
No access token, recovery key, private repository or .env file belongs in this image. Supply an approved AUDIT_ENTRY_URL only at runtime. audit.cjs accepts only the fixed diagnostic origin, redacts its access token, permits only same-origin GET/HEAD, blocks media/sensor/audio activation and does not click firing controls. Screenshots are off unless AUDIT_SCREENSHOT=1. Reports default to /tmp/waxtablet-audit; export the redacted report before disposing of ephemeral compute. This is a diagnostic harness, not a security guarantee against hostile pages.

Vercel ignores image CMD/ENTRYPOINT; the command must be started explicitly after sandbox creation. This image removes runtime browser/library installation, not the need for separate action approvals. Do not create the next sandbox until the image is Ready and its immutable VCR digest is recorded.

## Manual workflow and publication prerequisites
The offline build/smoke job runs on pushes changing these files on audit/browser-image-20261019 only. Committing this package therefore starts a GitHub Actions build and can consume CI quota or incur charges. It does not deploy a Vercel website or create a Vercel sandbox. Image publication remains separately manual and false by default; the publication job is disabled for push events. No merge or live audit is performed. Manual dispatch availability still depends on GitHub workflow rules and must not be assumed on an unmerged branch.

Before publish=true: establish narrowly scoped Vercel OIDC trust for the exact reviewed GitHub repository/workflow, authorize VCR writes only to the diagnostic project, and configure required reviewers on the browser-image-publication GitHub environment. These prerequisites are unverified, not created by this package. The login action accepts a team ID, uses a short-lived token, and defaults to logout/revocation. Do not enable publishing until prerequisites are independently checked.

The proposed destination vcr.vercel.com/waxtablet/waxtablet-integration-audit/browser-audit:pw1.64.0 is not claimed to exist. Wait for VCR Ready after publication and pin its digest. No registry credentials are retrieved or invented by this source.

Official references:
https://playwright.dev/docs/docker
https://vercel.com/docs/sandbox/concepts/images
https://vercel.com/docs/container-registry/getting-started
https://vercel.com/changelog/vcr-login-github-action
