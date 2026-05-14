# NBC Stormwater Tools — Runbook

**Repo:** https://github.com/Pluviometrics/nbc
**Deploy URL:** https://nbc.pluviometrics.com.au

## Local development

Open a terminal in `D:\repos\pluviometrics\nbc\` and run:

- Windows: `dev-serve.cmd`
- Bash:    `./dev-serve.sh`

Then open http://localhost:5173. Always serve over HTTP — `file://` breaks `fetch`, `localStorage` quotas, and ES module imports in some browsers.

## Pre-deploy

Before pushing to `main`, run:

```
npm run build
```

This executes `scripts/prebuild.mjs`, which stamps `__BUILD_SHA__` and `__BUILD_TIME__` placeholders in `index.html` with the current git short-sha and ISO timestamp. Inspect via View Source → search `build-sha`.

## Deploy procedure

`main` is the deployment branch — every push to `main` deploys via GitHub Actions:

1. Merge reviewed, tested work into `main` from a feature branch.
2. `npm run validate && npm run lint && npm run test:smoke`
3. `npm run build`
4. `git commit -am "build: stamp release"` (only if prebuild changed `index.html`)
5. `git push origin main`
6. GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes to GitHub Pages.

CI also runs `npm run build`, so the committed stamp in step 4 is optional — it only keeps the working tree's `index.html` in sync with what is deployed.

**One-time GitHub setting:** Repo Settings → Pages → Source = "GitHub Actions". The workflow triggers only on `main` pushes.

## Rollback

```
git checkout main
git revert <bad-sha>
git push origin main
```

GitHub Actions re-runs and redeploys the reverted state.

## Hot-fix

```
git checkout main && git pull --ff-only origin main
git checkout -b hotfix/<short-name>
# fix, test
git checkout main
git merge --ff-only hotfix/<short-name>
npm run build && git commit -am "build: hotfix" || true
git push origin main
```

## External services & failure modes

| Service | URL / host | Failure signal | Workaround |
|---|---|---|---|
| NSW SIX Maps tiles | `maps.six.nsw.gov.au` | tile error toast, blank aerial | switch to Streets layer in Layers menu |
| Render API | `nsw-rainfall-analyser-api.onrender.com` | "warming up" toast, ~30s cold-start | wait; retries auto |
| TechnologyOne CiA links | per-asset deep links | 404 from CiA | T1 outage; report to ICT |

## Input file schemas

See [`docs/inputs.md`](docs/inputs.md) for the full asset register CSV and panel rates XLSX column reference, accepted aliases, and gotchas.

## `PACKAGER_VERSION` semver bump policy

The `PACKAGER_VERSION` constant in `index.html` controls package compatibility checks.

- **Bump minor** when engine logic changes: cost calc, top-up rules, proximity grouping, criticality scoring.
- **No bump** for UI tweaks, label changes, styling, or doc fixes.
- **Bump major** only on breaking schema changes to saved package format.

## Pre-commit hook (manual install)

```
ln -s ../../.husky/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

On Windows without symlinks: copy `.husky/pre-commit` → `.git/hooks/pre-commit`.

## Common debugging

- **"Blank page" reported by user:** ask them to View Source and search `build-sha` — this confirms the deployed SHA. If it doesn't match the tip of `main`, the deploy failed silently. Check Actions tab.
- **"Stale data" reported:** `localStorage` cache; ask user to hard-refresh (Ctrl+Shift+R) or clear site data via DevTools → Application.
- **"Map tiles missing":** SIX Maps token expiry or rate limit — switch layer; check console for 401/429.

## Bus factor

| Area | Owner | Handover doc |
|---|---|---|
| Engine logic (cost, top-up, criticality) | Mark O'Callaghan | `index.html` inline comments + `docs/archive/superpowers/specs/` |
| Asset CSV format | NBC ICT (Intramaps export) | `docs/inputs.md` |
| Render API | Pluviometrics | https://github.com/Pluviometrics/nsw-rainfall-analyser-api |
| Deploy pipeline | This file | `.github/workflows/deploy.yml` |
