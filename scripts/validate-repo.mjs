import { existsSync, readFileSync } from 'fs';
import { join, normalize } from 'path';

const root = process.cwd();
const failures = [];
const warnings = [];
const optionalRuntimeFiles = new Set([
  '../package_report.html',
  './locks.json'
]);

const requiredEntrypoints = [
  'index.html',
  'styles.css',
  'CNAME',
  '_headers',
  '.nojekyll',
  '.github/workflows/deploy.yml',
  'vendor/leaflet-1.9.4.min.js',
  'vendor/leaflet-1.9.4.min.css',
  'vendor/jszip-3.10.1.min.js',
  'vendor/xlsx-0.20.2.full.min.js',
  'vendor/exceljs-4.4.0.min.js',
  'vendor/chart-4.4.1.umd.min.js',
  'vendor/hammer-2.0.8.min.js',
  'vendor/chartjs-plugin-zoom-2.2.0.umd.min.js',
  'templates/NBC Rainfall Calculator.xlsm',
  'bom_ifd_cache.js',
  'bom_northern_beaches_all_gauges.js',
  'nsw_lga_boundaries.js'
];

for (const file of requiredEntrypoints) {
  if (!existsSync(join(root, file))) failures.push(`missing required entrypoint/asset: ${file}`);
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
const localAssetPattern = /\b(?:src|href)=["']([^"']+)["']/g;
for (const match of html.matchAll(localAssetPattern)) {
  const ref = match[1];
  if (isExternalOrInline(ref)) continue;
  if (isRuntimeTemplate(ref)) continue;
  const target = normalize(join(root, ref));
  if (!existsSync(target)) {
    if (optionalRuntimeFiles.has(ref)) {
      warnings.push(`optional runtime-generated reference is not committed: ${ref}`);
    } else {
      failures.push(`index.html references missing asset: ${ref}`);
    }
  }
}

const localFetchPattern = /\bfetch\(\s*["']([^"']+)["']/g;
for (const match of html.matchAll(localFetchPattern)) {
  const ref = match[1];
  if (isExternalOrInline(ref)) continue;
  if (isRuntimeTemplate(ref)) continue;
  const target = normalize(join(root, ref));
  if (!existsSync(target)) {
    if (optionalRuntimeFiles.has(ref)) {
      warnings.push(`optional runtime-generated reference is not committed: ${ref}`);
    } else if (ref === './nsw_lga_boundaries.geojson' && html.includes('window.NSW_LGA_BOUNDARIES')) {
      warnings.push('optional fallback fetch ./nsw_lga_boundaries.geojson is not committed; primary nsw_lga_boundaries.js is present');
    } else {
      failures.push(`index.html fetches missing local file: ${ref}`);
    }
  }
}

const activeTextFiles = [
  'README.md',
  'RUNBOOK.md',
  'docs/inputs.md',
  'docs/architecture/REPO_MAP.md',
  'docs/operations/DEVELOPMENT.md',
  'docs/operations/DEPLOYMENT.md',
  'package.json',
  'scripts/prebuild.mjs',
  'scripts/validate-repo.mjs',
  '.github/workflows/deploy.yml'
];

const stalePathPatterns = [
  /C:\\Users\\fonzi\\Weather App Folder/i,
  /D:\\Weather App/i,
  /D:\\Packaging/i
];

for (const file of activeTextFiles) {
  const path = join(root, file);
  if (!existsSync(path)) {
    failures.push(`missing active documentation/tool file: ${file}`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  for (const pattern of stalePathPatterns) {
    if (pattern.test(text)) failures.push(`active file contains stale local path (${pattern}): ${file}`);
  }
}

const deployment = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8');
if (!/branches:\s*\[release\]/.test(deployment)) failures.push('deploy workflow is not pinned to release branch');
if (!/upload-pages-artifact@v3/.test(deployment)) failures.push('deploy workflow is missing GitHub Pages artifact upload');

if (warnings.length) {
  console.warn('Validation warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('Validation failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Repository validation passed.');

function isExternalOrInline(ref) {
  return /^(?:https?:|data:|blob:|mailto:|tel:|#)/i.test(ref);
}

function isRuntimeTemplate(ref) {
  return ref.includes('${') || ref.includes('{{');
}
