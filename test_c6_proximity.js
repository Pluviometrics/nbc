/**
 * Verification test for attachC6AddOns proximity guard (Fix #1).
 *
 * Extracts the relevant logic directly so it can run in plain Node.js
 * without loading the full index.html.
 */

'use strict';

// ── Inline helpers extracted from index.html ────────────────────────────────

function haversineDistanceM(a, b) {
  const toRad = deg => deg * Math.PI / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

// Minimal stub of buildReliningPackageObject — just merges assets back
function buildReliningPackageObject(pkgId, assets, options, basePkg) {
  return { ...basePkg, package_id: pkgId, assets };
}

// Extracted attachC6AddOns (matches the patched version in index.html)
function attachC6AddOns(packages, c6Pool, options = {}) {
  // Stub: no manual moves in test
  const excluded = new Set();
  const includedMap = {};

  if (!Array.isArray(c6Pool) || c6Pool.length === 0) return packages;

  const pitToPackages = new Map();
  packages.forEach((pkg, pkgIdx) => {
    (pkg.assets || []).forEach(asset => {
      [asset.usPit, asset.dsPit].forEach(pit => {
        if (!pit) return;
        if (!pitToPackages.has(pit)) pitToPackages.set(pit, new Set());
        pitToPackages.get(pit).add(pkgIdx);
      });
    });
  });

  const pkgDiameters = packages.map(pkg => {
    const set = new Set();
    (pkg.assets || []).forEach(a => {
      const d = Number(a.diameterMm);
      if (Number.isFinite(d)) set.add(d);
    });
    return set;
  });

  const additions = packages.map(() => []);
  const used = new Set();

  // Auto-attach pass (with proximity guard)
  c6Pool.forEach(c6 => {
    if (used.has(c6.assetId)) return;
    if (excluded.has(c6.assetId)) return;
    const dia = Number(c6.diameterMm);
    if (!Number.isFinite(dia)) return;
    const candidates = new Set();
    [c6.usPit, c6.dsPit].forEach(pit => {
      if (!pit) return;
      const set = pitToPackages.get(pit);
      if (set) set.forEach(idx => candidates.add(idx));
    });
    for (const pkgIdx of candidates) {
      // ── PROXIMITY GUARD (the fix) ────────────────────────────────────────
      const radiusM = Number(options.proximityM);
      if (Number.isFinite(radiusM) && radiusM > 0) {
        const pkg = packages[pkgIdx];
        const items = (pkg.assets || []).filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lon));
        if (items.length && Number.isFinite(c6.lat) && Number.isFinite(c6.lon)) {
          const cLat = items.reduce((s, i) => s + i.lat, 0) / items.length;
          const cLon = items.reduce((s, i) => s + i.lon, 0) / items.length;
          if (haversineDistanceM({ lat: cLat, lon: cLon }, { lat: c6.lat, lon: c6.lon }) > radiusM) {
            continue;
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────
      if (pkgDiameters[pkgIdx].has(dia)) {
        const sharesPit = (a) =>
          (c6.usPit && (a.usPit === c6.usPit || a.dsPit === c6.usPit)) ||
          (c6.dsPit && (a.usPit === c6.dsPit || a.dsPit === c6.dsPit));
        const pkgAssets = packages[pkgIdx].assets || [];
        const anchorAsset = pkgAssets.find(a => Number(a.diameterMm) === dia && sharesPit(a))
                         || pkgAssets.find(sharesPit);
        additions[pkgIdx].push({ ...c6, is_c6_addon: true, c6_anchor_asset_id: anchorAsset?.assetId || null });
        used.add(c6.assetId);
        break;
      }
    }
  });

  // Manual include pass (no proximity guard — intentional user action)
  Object.entries(includedMap).forEach(([assetId, anchorId]) => {
    if (used.has(assetId)) return;
    if (excluded.has(assetId)) return;
    const c6 = c6Pool.find(c => c.assetId === assetId);
    if (!c6) return;
    const pkgIdx = packages.findIndex(p => p.anchor_id === anchorId);
    if (pkgIdx === -1) return;
    const anchorAsset = (packages[pkgIdx].assets || []).find(a =>
      (c6.usPit && (a.usPit === c6.usPit || a.dsPit === c6.usPit)) ||
      (c6.dsPit && (a.usPit === c6.dsPit || a.dsPit === c6.dsPit))
    );
    additions[pkgIdx].push({ ...c6, is_c6_addon: true, c6_manual_include: true, c6_anchor_asset_id: anchorAsset?.assetId || null });
    used.add(assetId);
  });

  return packages.map((pkg, idx) => {
    if (additions[idx].length === 0) return pkg;
    const combinedItems = [...(pkg.assets || []), ...additions[idx]];
    return buildReliningPackageObject(pkg.package_id, combinedItems, options, pkg);
  });
}

// ── Test fixtures ────────────────────────────────────────────────────────────

// Newport cluster: lat -33.65, lon 151.30
const NEWPORT_LAT = -33.65;
const NEWPORT_LON = 151.30;
const CLONTARF_LAT = -33.81;
const CLONTARF_LON = 151.26;

const packages = [
  {
    package_id: 'RLN_001',
    anchor_id: 'anc-001',
    assets: [
      { assetId: 'PIPE-A1', usPit: 'PIT-100', dsPit: 'PIT-101', diameterMm: 300, lat: NEWPORT_LAT, lon: NEWPORT_LON },
      { assetId: 'PIPE-A2', usPit: 'PIT-101', dsPit: 'PIT-102', diameterMm: 300, lat: NEWPORT_LAT - 0.001, lon: NEWPORT_LON + 0.001 }
    ]
  }
];

// C6 close to Newport — shares pit PIT-100, same diameter — should attach
const c6Close = {
  assetId: 'C6-CLOSE',
  usPit: 'PIT-100',
  dsPit: 'PIT-999',
  diameterMm: 300,
  lat: NEWPORT_LAT + 0.001,   // ~150 m away
  lon: NEWPORT_LON + 0.001
};

// C6 at Clontarf — shares pit PIT-101 (coincidence), same diameter — far, should NOT attach
const c6Far = {
  assetId: 'C6-FAR',
  usPit: 'PIT-101',
  dsPit: 'PIT-888',
  diameterMm: 300,
  lat: CLONTARF_LAT,
  lon: CLONTARF_LON
};

// ── Helper ───────────────────────────────────────────────────────────────────

function getC6AssetIds(resultPkgs) {
  return (resultPkgs[0].assets || [])
    .filter(a => a.is_c6_addon)
    .map(a => a.assetId);
}

// ── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

// ── Test 1: proximityM = 3000 ────────────────────────────────────────────────

console.log('\nTest 1: proximityM = 3000 m');
const dist = haversineDistanceM({ lat: NEWPORT_LAT, lon: NEWPORT_LON }, { lat: CLONTARF_LAT, lon: CLONTARF_LON });
console.log(`  Newport → Clontarf distance: ${Math.round(dist)} m (expect > 3000)`);

const result3k = attachC6AddOns(
  JSON.parse(JSON.stringify(packages)),  // deep clone
  [c6Close, c6Far],
  { proximityM: 3000 }
);
const attached3k = getC6AssetIds(result3k);
console.log(`  Attached C6 asset IDs: [${attached3k.join(', ')}]`);

assert(dist > 3000, `Clontarf is more than 3000 m from Newport (${Math.round(dist)} m)`);
assert(attached3k.includes('C6-CLOSE'), 'Close C6 (Newport) was attached');
assert(!attached3k.includes('C6-FAR'),  'Far C6 (Clontarf) was NOT attached');

// ── Test 2: proximityM = null — no guard, both should attach ─────────────────

console.log('\nTest 2: proximityM = null (no proximity guard)');
const resultNull = attachC6AddOns(
  JSON.parse(JSON.stringify(packages)),
  [c6Close, c6Far],
  { proximityM: null }
);
const attachedNull = getC6AssetIds(resultNull);
console.log(`  Attached C6 asset IDs: [${attachedNull.join(', ')}]`);

assert(attachedNull.includes('C6-CLOSE'), 'Close C6 was attached (no guard)');
assert(attachedNull.includes('C6-FAR'),   'Far C6 was ALSO attached (no guard)');

// ── Test 3: proximityM = 0 — treated same as null (disabled) ────────────────

console.log('\nTest 3: proximityM = 0 (disabled)');
const result0 = attachC6AddOns(
  JSON.parse(JSON.stringify(packages)),
  [c6Close, c6Far],
  { proximityM: 0 }
);
const attached0 = getC6AssetIds(result0);
console.log(`  Attached C6 asset IDs: [${attached0.join(', ')}]`);

assert(attached0.includes('C6-CLOSE'), 'Close C6 was attached (proximityM=0, no guard)');
assert(attached0.includes('C6-FAR'),   'Far C6 was ALSO attached (proximityM=0, no guard)');

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Result: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
