# NBC Stormwater Tools

Static single-page web app for Northern Beaches Council stormwater rainfall, prioritisation, package generation, and reporting workflows.

## Source of truth

- Repository: `Pluviometrics/nbc`
- Canonical local path: `D:\repos\pluviometrics\nbc`
- Live URL: https://nbc.pluviometrics.com.au
- Deployment branch: `main` (pushes to `main` deploy automatically)
- Development: feature branches → reviewed PR → `main`
- Deployment mechanism: GitHub Pages via `.github/workflows/deploy.yml`

The live site is served from root-level static assets. Keep `index.html`, `styles.css`, `vendor/`, `templates/`, `CNAME`, `_headers`, and `.nojekyll` at the repository root unless a deployment migration is planned and tested separately.

## Quick start

```bash
npm install
npm run serve
```

Open http://localhost:5173.

## Validation

```bash
npm run validate
npm run lint
npm run test:smoke
```

The smoke test expects the app to be served from `/`; Playwright starts its own server from `playwright.config.js`.

## Documentation

- [Runbook](RUNBOOK.md)
- [Repository map](docs/architecture/REPO_MAP.md)
- [Development guide](docs/operations/DEVELOPMENT.md)
- [Deployment notes](docs/operations/DEPLOYMENT.md)
- [Input file schemas](docs/inputs.md)
