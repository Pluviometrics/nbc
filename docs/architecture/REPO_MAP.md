# Repository map

This repository is intentionally a static-site repository. The root is both the source tree and the GitHub Pages artifact.

## Root public assets

| Path | Classification | Notes |
|---|---|---|
| `index.html` | Live app entrypoint | Monolithic app runtime, UI, protected packaging logic, rainfall logic, station/radar logic, and report export logic. Do not split casually. |
| `styles.css` | Live stylesheet | Shared app styling. |
| `bom_ifd_cache.js` | Data asset | Large generated BOM IFD cache consumed by `index.html`. |
| `bom_northern_beaches_all_gauges.js` | Data asset | Large generated BOM gauge dataset consumed by `index.html`. |
| `nsw_lga_boundaries.js` | Data asset | LGA boundary data attached to `window.NSW_LGA_BOUNDARIES`. |
| `vendor/` | Vendored browser libraries | Local browser dependencies required by the static app and CSP. |
| `templates/` | Public downloadable template assets | Contains the rainfall calculator workbook. |
| `CNAME`, `_headers`, `.nojekyll` | Deployment assets | Required by the GitHub Pages/custom-domain deployment path. |

## Supporting folders

| Path | Classification | Notes |
|---|---|---|
| `.github/workflows/` | Deployment config | GitHub Pages deployment from `main`. |
| `.husky/` | Developer tooling | Optional pre-commit hook. |
| `docs/` | Documentation | Active docs plus archived historical planning material. |
| `docs/archive/` | Archive | Historical audits/specs/plans retained for traceability only. Not active source of truth. |
| `scripts/` | Tooling | Build stamp and repository validation scripts. |
| `tests/` | Tests | Playwright smoke tests. |

## Protected logic and assets

The following are behavior-sensitive and should not be changed during structural cleanup unless the change is directly required and separately validated:

- Costing, package grouping, top-up, criticality, prioritisation, radar, rainfall, station, workbook export, CSV export, ZIP export, and standalone report logic in `index.html`.
- Existing NBC and app visual identity in `index.html` and `styles.css`.
- Vendored browser libraries in `vendor/`.
- Large data assets at the repository root.
- `templates/NBC Rainfall Calculator.xlsm`.

## Generated and local-only files

Generated package ZIPs, browser downloads, local caches, `node_modules/`, `_libs/`, and Word lock/temp files are not source. Keep them out of Git.
