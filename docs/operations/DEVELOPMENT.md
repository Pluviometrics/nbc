# Development guide

## Prerequisites

- Node.js 20 or newer.
- npm.

## Install

```bash
npm install
```

## Run locally

```bash
npm run serve
```

Open http://localhost:5173.

Use HTTP for local testing. Opening `index.html` with `file://` can break browser APIs, map tiles, storage behavior, and local asset fetches.

## Validate changes

```bash
npm run validate
npm run lint
npm run test:smoke
```

`npm run validate` checks required deployment files, root public assets, active documentation, stale local path references, and obvious missing static references.

## Branch safety

Do not work directly on `main` for cleanup or feature work. Create a branch, test locally, open a pull request, and merge only after review.

`main` is the deployment branch — every push to it goes live. Only merge reviewed, validated work into `main`. See [DEPLOYMENT.md](DEPLOYMENT.md) for the release flow.

## Structure rules

- Keep live root public paths stable.
- Use `scripts/` for repo tooling.
- Use `tests/` for automated tests.
- Use `docs/archive/` for historical notes that mention old local folders or superseded implementation plans.
- Do not commit generated downloads, local caches, package ZIPs, temporary Office lock files, or `node_modules/`.
