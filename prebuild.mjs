// Pre-deploy build: stamps build-sha and build-time meta tags in index.html
// with current git short-sha and local-time ISO 8601 timestamp.
// Idempotent — re-running re-stamps in place. Run via `npm run build`
// before pushing to main / release.
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const indexPath = 'index.html';
let html = readFileSync(indexPath, 'utf8');

let sha = 'unknown';
try {
  sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('[prebuild] git rev-parse failed:', e.message);
}

// Local-time ISO 8601 with offset, e.g. 2026-05-13T09:59:15+10:00.
const time = (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offH = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offM = pad(Math.abs(offsetMin) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${offH}:${offM}`;
})();

// Replace either the __BUILD_*__ placeholder or any previously-stamped value.
html = html
  .replaceAll('__BUILD_SHA__', sha)
  .replaceAll('__BUILD_TIME__', time)
  .replace(/<meta name="build-sha" content="[^"]*">/, `<meta name="build-sha" content="${sha}">`)
  .replace(/<meta name="build-time" content="[^"]*">/, `<meta name="build-time" content="${time}">`);

writeFileSync(indexPath, html);
console.log(`[prebuild] stamped sha=${sha} time=${time}`);
