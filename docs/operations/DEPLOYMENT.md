# Deployment notes

## Current deployment path

- Live URL: https://nbc.pluviometrics.com.au
- GitHub repository: `Pluviometrics/nbc`
- GitHub Pages workflow: `.github/workflows/deploy.yml`
- Deployment branch: `release`
- Source branch for reviewed work: `main`

The workflow runs on pushes to `release`, installs Node 20, runs lint as non-blocking, runs the build stamp script, uploads the repository root as the Pages artifact, and publishes through GitHub Pages.

## Safe release flow

```bash
git checkout main
git pull --ff-only origin main
git merge --ff-only <reviewed-branch>
npm run validate
npm run lint
npm run test:smoke

git checkout release
git pull --ff-only origin release
git merge --ff-only main
npm run build
git status --short
git commit -am "build: stamp release"
git push origin release
```

Only push `release` when deployment is intended. Do not use cleanup branches as deployment branches.

## Rollback

```bash
git checkout release
git revert <bad-release-commit>
git push origin release
```

GitHub Actions will redeploy the reverted state.
