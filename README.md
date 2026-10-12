# Tentacled‑Sphere

A self-contained geometry actuator for Scandoc-Zero and Cloudburner17.
Produces eight tentacles, each representing a launch-program geometry.
Deployable on Vercel as `/api/tentacled-sphere`, with no runtime dependencies.

## Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `seed` | float | 1.0 | Starting value for the geometry sequence |
| `delta` | float | 0.1137 | Increment between tentacle activations |

Query parameters override the `SEED` and `DELTA` environment variables.
Inputs must be finite numbers; invalid inputs or overflowing sequences return
HTTP 400 with a JSON `error`.

## API endpoint

```text
GET /api/tentacled-sphere?seed=1.0&delta=0.1137
```

Returns `seed`, `delta`, eight `tentacles`, and aggregate `curvature` metrics.
Each tentacle contains a zero-based `index`, its sequence `value`, a three-element
`vector` (`x`, `y`, `z`), and its `curvature`. Aggregate metrics are `min`, `max`,
and `mean`.

### Geometry model

The supplied specification does not define launch-program formulas, so this
implementation uses a deterministic unit-sphere model:

- Tentacle `i` uses the angle `seed + i * delta` in radians.
- Its latitude height is `z = 1 - 2 * (i + 0.5) / 8`.
- Its latitude-circle radius is `r = sqrt(1 - z²)`.
- Its vector is `(r * cos(angle), r * sin(angle), z)`.
- Its curvature is the latitude circle's curvature, `1 / r`, not the
  curvature of a curve interpolating all eight vectors.

All vectors have unit length. Negative and zero increments are supported.
Curvature depends on latitude, not on the starting angle or increment.
This model is a standalone baseline; compatibility with external harness
geometry contracts has not been verified.

## Local run

Use Python 3.11 or later:

```bash
python api/index.py
```

The local server listens at `http://127.0.0.1:8000/api/tentacled-sphere`.
Set `PORT` to change the local port.

```bash
curl 'http://127.0.0.1:8000/api/tentacled-sphere?seed=1.0&delta=0.1137'
python -m unittest discover -s tests
```

## Deployment

1. Connect this repository to Vercel.
2. Vercel builds the Python function using `vercel.json`.
3. Set optional `SEED` and `DELTA` environment variables in Vercel.
4. The endpoint is available at
   `https://<your-project>.vercel.app/api/tentacled-sphere`
   (for a project named `tentacled-sphere`, use
   `https://tentacled-sphere.vercel.app/api/tentacled-sphere`).

For the GitHub Actions auto-deploy pipeline, add `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as **GitHub repository Actions secrets**.
Pushes to `main` run the tests and deploy to production only if they pass.
Pull requests run tests without receiving deployment credentials.
You can use Vercel's Git integration instead of the Actions deployment; enabling
both may produce duplicate deployments.

## Integration notes

- No other repositories or third-party Python packages are required.
- The endpoint is stateless: it does not store inputs, log requests, access
  external services, or require caller data beyond the two numeric parameters.
- Scandoc-Zero and Cloudburner17 can consume the JSON vectors; validate their
  expected geometry and schema before integrating.