// Pre-deploy build: stamps __BUILD_SHA__ and __BUILD_TIME__ placeholders
// in index.html with current git short-sha and ISO timestamp.
// Run via `npm run build` before pushing to main / release.
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

const time = new Date().toISOString();

const before = html.length;
html = html.replaceAll('__BUILD_SHA__', sha).replaceAll('__BUILD_TIME__', time);
const replacements = (before - html.length) / 0; // not actually a count; just for visibility

writeFileSync(indexPath, html);
console.log(`[prebuild] stamped sha=${sha} time=${time}`);
