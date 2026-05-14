# Deployment notes

## Current deployment path

- Live URL: https://nbc.pluviometrics.com.au
- GitHub repository: `Pluviometrics/nbc`
- GitHub Pages workflow: `.github/workflows/deploy.yml`
- Deployment branch: `main`

Every push to `main` deploys. The workflow installs Node 20, runs lint as non-blocking, runs the build stamp script, uploads the repository root as the Pages artifact, and publishes through GitHub Pages. There is no separate release branch — `main` is the deployed branch, so it must stay deployable at all times.

## Safe release flow

Do reviewed work on a feature branch, then:

```bash
git checkout main
git pull --ff-only origin main
git merge --ff-only <reviewed-branch>
npm run validate
npm run lint
npm run test:smoke
npm run build
git status --short
git commit -am "build: stamp release"   # only if prebuild changed index.html
git push origin main
```

The push to `main` triggers the deploy. CI also runs `npm run build`, so the committed stamp is optional — commit it only to keep the working tree's `index.html` in sync with what is deployed.

Never push unreviewed or untested work to `main`: it goes live immediately.

## Rollback

```bash
git checkout main
git revert <bad-commit>
git push origin main
```

GitHub Actions will redeploy the reverted state.
