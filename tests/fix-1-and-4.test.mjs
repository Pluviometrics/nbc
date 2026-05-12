// Tests for FUNCTIONALITY_PARITY_AUDIT.md fixes #1 (traffic-control +
// project-initiation toggles) and #4 (topup column in per-package CSV).
//
// Strategy: extract the relevant snippets from index.html using a
// brace-balanced extractor, then evaluate them in a fresh `vm` context
// with light stubs. This avoids the cost of loading the 3 MB SPA in
// jsdom while still exercising the actual source text.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_PATH = path.resolve(__dirname, '..', 'index.html');

const src = fs.readFileSync(INDEX_PATH, 'utf8');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) fail(`${msg} — expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function assertClose(actual, expected, eps, msg) {
  if (!(Math.abs(actual - expected) <= eps)) fail(`${msg} — expected ${expected} ±${eps} got ${actual}`);
}

function extractFunction(source, name) {
  const re = new RegExp(`function\\s+${name}\\s*\\(`);
  const m = re.exec(source);
  if (!m) return null;
  const openBrace = source.indexOf('{', m.index + m[0].length);
  if (openBrace < 0) return null;
  let depth = 0;
  let inStr = false, strCh = '';
  let inLineComment = false, inBlockComment = false;
  let inTemplate = false;
  for (let j = openBrace; j < source.length; j++) {
    const c = source[j];
    const next = source[j + 1];
    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') { inBlockComment = false; j++; }
      continue;
    }
    if (inStr) {
      if (c === '\\') { j++; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (inTemplate) {
      if (c === '\\') { j++; continue; }
      if (c === '`') inTemplate = false;
      continue;
    }
    if (c === '/' && next === '/') { inLineComment = true; j++; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; j++; continue; }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c === '`') { inTemplate = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(m.index, j + 1);
    }
  }
  return null;
}

// ─── Sanity: the audit-required code lines exist in index.html ───────────

assert(
  /trafficControl:\s*document\.getElementById\(['"]pkgTrafficControl['"]\)\?\.checked\s*!==\s*false/.test(src),
  'getReliningPackagingOptions must read #pkgTrafficControl'
);
assert(
  /projectInitiation:\s*document\.getElementById\(['"]pkgInitiation['"]\)\?\.checked\s*!==\s*false/.test(src),
  'getReliningPackagingOptions must read #pkgInitiation'
);
assert(
  /id=["']pkgTrafficControl["']\s+checked\b/.test(src),
  '#pkgTrafficControl checkbox must exist in HTML and default checked'
);
assert(
  /id=["']pkgInitiation["']\s+checked\b/.test(src),
  '#pkgInitiation checkbox must exist in HTML and default checked'
);
assert(
  /if\s*\(options\.trafficControl\s*!==\s*false\)\s*pipeCost\s*\+=\s*2000;/.test(src),
  'cost calc must add 2000 when trafficControl !== false'
);
assert(
  /if\s*\(options\.projectInitiation\s*!==\s*false\)\s*pipeCost\s*\*=\s*1\.15;/.test(src),
  'cost calc must multiply by 1.15 when projectInitiation !== false'
);

// ─── Build a small pure mirror of the cost-calc block for tests A and B ──
// The block is short and unique; we verify the same arithmetic the
// production code performs.
function calcPipeCost(rate, lengthM, options) {
  let pipeCost = Number.isFinite(rate) && Number.isFinite(lengthM) ? rate * lengthM : null;
  if (Number.isFinite(pipeCost)) {
    if (options.trafficControl !== false) pipeCost += 2000;
    if (options.projectInitiation !== false) pipeCost *= 1.15;
  }
  return pipeCost;
}

// ─── Test A: both flags on → (baseRate × length + 2000) × 1.15 ───────────
{
  const baseRate = 500;
  const lengthM = 30;
  const expected = (baseRate * lengthM + 2000) * 1.15;
  const got = calcPipeCost(baseRate, lengthM, { trafficControl: true, projectInitiation: true });
  assertClose(got, expected, 1e-9, 'Test A: pipeCost with both adjustments on');
  console.log(`PASS A — pipeCost (both on) = ${got.toFixed(2)} (expected ${expected.toFixed(2)})`);
}

// ─── Test B: both flags off → baseRate × length ──────────────────────────
{
  const baseRate = 500;
  const lengthM = 30;
  const expected = baseRate * lengthM;
  const got = calcPipeCost(baseRate, lengthM, { trafficControl: false, projectInitiation: false });
  assertClose(got, expected, 1e-9, 'Test B: pipeCost with both adjustments off');
  console.log(`PASS B — pipeCost (both off) = ${got.toFixed(2)} (expected ${expected.toFixed(2)})`);
}

// ─── Test C: CSV writer emits topup column with correct per-row values ───

const exportFnSrc = extractFunction(src, 'exportReliningPackagesCsv');
assert(exportFnSrc, 'exportReliningPackagesCsv must be present in index.html');
assert(/['"]topup['"]/.test(exportFnSrc), 'exportReliningPackagesCsv must include a topup header');

// Sandbox stubs:
//  - lastPackagingGeneration: synthetic package with one normal + one topup
//  - csvCellSafe: minimal CSV cell escaper
//  - confirmReliningGeneratedSettingsCurrent: always true
//  - origPriDownload: capture the emitted CSV string
//  - alert / document: noop / minimal
let captured = null;
const sandbox = {
  console,
  alert: () => {},
  document: {
    // Some downstream helpers might query the DOM; never reached in our path
    // but provide a stub to avoid ReferenceError if eval order shifts.
    getElementById: () => null
  },
  lastPackagingGeneration: {
    packages: [
      {
        package_id: 'RLN_001',
        original_package_id: 'RLN_001',
        primary_suburb: 'DEE WHY',
        suburb: 'DEE WHY',
        suburbs: ['DEE WHY'],
        total_length_m: 60,
        total_cost: 60000,
        max_span_m: 300,
        distance_warning: '',
        coordinate_sources: 'XY',
        assets: [
          {
            assetId: 'A-NORMAL',
            asset_id_text: 'A-NORMAL',
            suburb: 'DEE WHY',
            conditionLabel: '8',
            diameterMm: 375,
            lengthM: 30,
            ratePerM: 500,
            pipeCost: 15000,
            lat: -33.75,
            lon: 151.29,
            coordinateSource: 'XY',
            costStatus: 'Costed',
            costReason: '',
            package_center_distance_m: 0,
            topup: false
          },
          {
            assetId: 'A-TOPUP',
            asset_id_text: 'A-TOPUP',
            suburb: 'DEE WHY',
            conditionLabel: '7',
            diameterMm: 375,
            lengthM: 30,
            ratePerM: 480,
            pipeCost: 14400,
            lat: -33.751,
            lon: 151.291,
            coordinateSource: 'XY',
            costStatus: 'Costed',
            costReason: '',
            package_center_distance_m: 50,
            topup: true
          }
        ]
      }
    ]
  },
  confirmReliningGeneratedSettingsCurrent: () => true,
  csvCellSafe(v) {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  },
  origPriDownload(name, content) {
    captured = { name, content };
  }
};
vm.createContext(sandbox);
vm.runInContext(exportFnSrc + '\nexportReliningPackagesCsv();', sandbox);

assert(captured, 'CSV writer must invoke origPriDownload');
const lines = captured.content.split('\n');
const headerLine = lines[0];
const headers = headerLine.split(',');
assert(headers.includes('topup'), `CSV header must include 'topup' column. Got: ${headerLine}`);
const topupCol = headers.indexOf('topup');
assertEqual(lines.length, 3, 'CSV must have 1 header + 2 data rows');

const row1 = lines[1].split(',');
const row2 = lines[2].split(',');
// Row order matches the order of pkg.assets — normal first, topup second.
assertEqual(row1[topupCol], 'false', 'normal pipe row topup column must be "false"');
assertEqual(row2[topupCol], 'true', 'top-up pipe row topup column must be "true"');
console.log(`PASS C — CSV emits topup column with values [${row1[topupCol]}, ${row2[topupCol]}]`);

console.log('\nAll tests passed.');
process.exit(0);
