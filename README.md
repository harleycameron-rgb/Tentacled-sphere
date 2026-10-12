# Tentacled-sphere

Standalone geometry engine with a Vercel Python API endpoint.

## Run locally

```sh
python api/index.py
```

## Deploy to Vercel

Deploy the repository with Vercel. The `api/index.py` module is exposed as the
`/api` endpoint; a GET request returns the eight geometry results as JSON.