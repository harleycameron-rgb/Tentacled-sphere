# Tentacled Sphere

The repository provides a geometry API deployed as a Vercel Python function.

## API

Send a `GET` request to `/api/tentacled-sphere` to receive the geometry
actuation result as JSON.

## Deploy

Import this repository into Vercel. The build and route configuration is in
`vercel.json`. To use `scandoc-zero.com` or `www.scandoc-zero.com`, add the
domains in the Vercel project settings and configure the DNS records Vercel
provides; custom domains cannot be assigned in `vercel.json`.