# Standalone `package_report.html` Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `buildReliningPackageReportHtml` so the standalone `package_report.html` is a full editor of generated relining packages, exporting either a `locks.json` for round-trip back to the live tool or a complete contractor-ready Work Order Pack ZIP.

**Architecture:** Single self-contained HTML file with embedded JSON snapshot, embedded library scripts (Leaflet, JSZip, XLSX), and an inlined runtime that ports the live tool's render layer + edit layer + ZIP-build path. Renderers are copied (not shared) so changes here don't destabilise the live tool.

**Tech Stack:** Vanilla JS (no build step), Leaflet 1.9.4, JSZip 3.10.1, SheetJS xlsx 0.20.2 (community build). Code lives entirely inside `D:\repos\pluviometrics\nbc\index.html`.

**Spec reference:** `docs/superpowers/specs/2026-05-11-package-report-standalone-editor.md`

**Verification model:** No unit-test framework exists in this repo. Each task ends with a **browser smoke test** — generate packages in the live tool, open the produced `package_report.html`, confirm specific behaviours. The user runs `python -m http.server` from `D:\repos\pluviometrics\nbc` and opens `http://localhost:8000` to test (file:// origins block some Leaflet tile loading).

**Frequent commits:** Each task ends with a commit. The user has approved pushing to `Pluviometrics/nbc:main` for relining work historically — but for THIS plan, keep commits local until all tasks pass; push only at the end of Task 11 after end-to-end verification.

---

## File Structure

This plan modifies one file:

| File | Change |
|---|---|
| `D:\repos\pluviometrics\nbc\index.html` | All edits inside the single function `buildReliningPackageReportHtml` (currently lines 7399–8218). Three new top-level constants near it for the embedded library blobs. |

No new files are created in source. The standalone HTML it produces is a runtime artifact that ships in the relining ZIP at `package_report.html`.

---

## Task 1: Expand the embedded JSON snapshot

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — `buildReliningPackageReportHtml` snapshot builder (lines 7410–7493)

The current snapshot is missing fields the renderers and ZIP writer need. Add them without breaking the existing render.

- [ ] **Step 1: Read the current snapshot builder**

Read `D:\repos\pluviometrics\nbc\index.html` lines 7399–7495 to confirm the current `reportPackages` and `reportPipes` shapes.

- [ ] **Step 2: Add per-pipe fields to `reportPipes`**

Replace the per-pipe object literal (currently lines 7466–7480) with:

```js
const reportPipes = packages.flatMap(pkg => (pkg.assets || []).map(item => {
    const raw = item.raw || {};
    return {
      asset_id: item.assetId || '',
      package_id: pkg.package_id,
      suburb: String(item.suburb || pkg.suburb || '').toUpperCase(),
      diameter_mm: Math.round(Number(item.diameterMm) || 0) || null,
      material: raw['SW_Material'] || raw['Material'] || raw['Pipe Material'] || '',
      condition: item.conditionLabel || item.condition || raw['SW_Condition'] || '',
      length_m: Number(item.lengthM) || 0,
      pipe_cost: Number(item.pipeCost) || 0,
      rate_per_m: Number(item.ratePerM) || 0,
      address: String(raw['Formatted_Address'] || raw['Address'] || raw['Pipe_Start_Address'] || raw['Street_Address'] || '').trim(),
      upstream: raw['SW_Upstream Node'] || raw['SW_Upstream_Node'] || raw['Upstream Node'] || '',
      downstream: raw['SW_Downstream Node'] || raw['SW_Downstream_Node'] || raw['Downstream Node'] || '',
      lat: Number.isFinite(item.lat) ? item.lat : null,
      lon: Number.isFinite(item.lon) ? item.lon : null,
      x_mid: Number.isFinite(item.xMid) ? item.xMid : null,
      y_mid: Number.isFinite(item.yMid) ? item.yMid : null,
      is_c6_addon: !!item.is_c6_addon,
      criticality_1dp: Number(item.criticality_1dp) || 0,
      condition_score: Number(item.condition_score) || 0,
      pipe_priority_score: Number(item.pipe_priority_score) || 0,
      raw: {
        SW_Condition: raw['SW_Condition'] ?? '',
        Observed_Condition: raw['Observed_Condition'] ?? raw['Observed Condition'] ?? '',
        SW_Material: raw['SW_Material'] ?? '',
        Formatted_Address: raw['Formatted_Address'] ?? '',
        Pipe_Start_Address: raw['Pipe_Start_Address'] ?? '',
        Street_Address: raw['Street_Address'] ?? '',
        Address: raw['Address'] ?? '',
        SW_Upstream_Node: raw['SW_Upstream Node'] ?? raw['SW_Upstream_Node'] ?? '',
        SW_Downstream_Node: raw['SW_Downstream Node'] ?? raw['SW_Downstream_Node'] ?? ''
      }
    };
  }));
```

- [ ] **Step 3: Add per-package fields to `reportPackages`**

Replace the package object literal returned at lines 7443–7462 with:

```js
    return {
      id: pkg.package_id,
      original_package_id: pkg.original_package_id || pkg.package_id,
      suburbs: pkg.suburbs || (pkg.suburb ? [pkg.suburb] : []),
      diameters_mm: pkg.diameters_mm || pkg.diameters || [],
      pipe_count: assets.length,
      total_length_m: Number(pkg.total_length_m || 0),
      total_cost: Number(pkg.total_cost || 0),
      max_span_m: Number(pkg.max_span_m || 0),
      distance_warning: pkg.distance_warning || '',
      coordinate_sources: pkg.coordinate_sources || '',
      condition_6_count: pkg.condition_6_count || 0,
      condition_7_count: pkg.condition_7_count || 0,
      condition_8_count: pkg.condition_8_count || 0,
      c6_addon_count: pkg.c6_addon_count || 0,
      asset_ids: (pkg.asset_ids && pkg.asset_ids.length ? pkg.asset_ids : assets.map(a => a.assetId)).filter(Boolean),
      centroid,
      max_from_centroid_m: Math.round(max_from_centroid_m),
      package_priority_score: Number(pkg.package_priority_score) || 0,
      package_total_pipe_priority: Number(pkg.package_total_pipe_priority) || 0,
      package_high_crit_count: Number(pkg.package_high_crit_count) || 0,
      package_large_diam_count: Number(pkg.package_large_diam_count) || 0,
      package_xlarge_diam_count: Number(pkg.package_xlarge_diam_count) || 0,
      package_worst_condition: Number(pkg.package_worst_condition) || 0,
      package_total_length: Number(pkg.package_total_length) || 0,
      package_pipe_count: Number(pkg.package_pipe_count) || assets.length,
      conditionMix,
      diameterMix,
      materialMix,
      dedicated_map_url: `./package_maps/${safeId}_map.html`
    };
```

- [ ] **Step 4: Add base provenance to top-level `reportData`**

Replace the `reportData` declaration (currently lines 7482–7493) with:

```js
const reportData = {
    generated_at: new Date().toISOString(),
    options: options,
    summary: {
      package_count: reportPackages.length,
      pipe_count: reportPipes.length,
      total_length_m: Number(summary?.total_length_m || 0),
      total_cost: Number(summary?.total_cost || 0)
    },
    packages: reportPackages,
    pipes: reportPipes,
    provenance: {
      source: 'NBC Relining Tool',
      generated_at: new Date().toISOString(),
      package_count: reportPackages.length,
      pipe_count: reportPipes.length
    }
  };
```

- [ ] **Step 5: Browser smoke test**

In the live tool: generate any small set of packages, click **Export Work Order Pack (ZIP)**, extract the ZIP, open `package_report.html` in Chrome.

Open DevTools console and run:
```js
JSON.parse(document.getElementById('report-data').textContent).pipes[0]
```
Expected: object containing all the new fields (`rate_per_m`, `is_c6_addon`, `criticality_1dp`, `raw.SW_Condition`, etc.).

```js
JSON.parse(document.getElementById('report-data').textContent).packages[0]
```
Expected: object containing `package_priority_score`, `c6_addon_count`, `condition_6_count`.

Visually confirm the existing report panels (KPI tiles, options strip, cards, table) still render correctly — no regression.

- [ ] **Step 6: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: expand snapshot with rate_per_m, raw cols, priority fields, c6 flags"
```

---

## Task 2: Inline Leaflet, JSZip, XLSX into the report

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — three new top-level constants at the top of `buildReliningPackageReportHtml` (~line 7400) and three `<script>` blocks in the HTML wrapper

- [ ] **Step 1: Download library blobs**

In `D:\repos\pluviometrics\nbc\` create a temporary directory `_libs/`:
```bash
mkdir -p "D:/repos/pluviometrics/nbc/_libs"
curl -sSL "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" -o "D:/repos/pluviometrics/nbc/_libs/leaflet.min.js"
curl -sSL "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" -o "D:/repos/pluviometrics/nbc/_libs/leaflet.min.css"
curl -sSL "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" -o "D:/repos/pluviometrics/nbc/_libs/jszip.min.js"
curl -sSL "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js" -o "D:/repos/pluviometrics/nbc/_libs/xlsx.full.min.js"
```

Verify files downloaded:
```bash
ls -la "D:/repos/pluviometrics/nbc/_libs/"
```
Expected: `leaflet.min.js` (~150KB), `leaflet.min.css` (~14KB), `jszip.min.js` (~95KB), `xlsx.full.min.js` (~900KB).

- [ ] **Step 2: Embed each as a JS string constant inside `buildReliningPackageReportHtml`**

This is the only awkward step. We need each library file's content as a JS string literal. Because the files contain backticks, dollar-braces, and other tokens, the safest embedding is base64.

At the top of `buildReliningPackageReportHtml` (just inside the function, before any other logic), add:

```js
  // Embedded library blobs — base64-encoded so we don't have to escape arbitrary JS.
  // Versions: Leaflet 1.9.4, JSZip 3.10.1, SheetJS xlsx 0.20.2.
  const LEAFLET_CSS_B64 = '<<PASTE_BASE64_OF_leaflet.min.css>>';
  const LEAFLET_JS_B64  = '<<PASTE_BASE64_OF_leaflet.min.js>>';
  const JSZIP_JS_B64    = '<<PASTE_BASE64_OF_jszip.min.js>>';
  const XLSX_JS_B64     = '<<PASTE_BASE64_OF_xlsx.full.min.js>>';
```

To generate the base64, run from PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\repos\pluviometrics\nbc\_libs\leaflet.min.css"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\repos\pluviometrics\nbc\_libs\leaflet.min.js"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\repos\pluviometrics\nbc\_libs\jszip.min.js"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\repos\pluviometrics\nbc\_libs\xlsx.full.min.js"))
```

Paste the resulting strings into the four constants, replacing `<<PASTE_BASE64_OF_*>>`.

- [ ] **Step 3: Add the inline `<script>` and `<style>` blocks to the HTML wrapper**

Locate the HTML template string at the bottom of `buildReliningPackageReportHtml` (search for `<!DOCTYPE html>`). Inside `<head>`, after any existing `<style>` block, add:

```js
  <style id="leaflet-css">${atob('placeholder-replaced-at-runtime')}</style>
```

Then in the runtime IIFE (`runtimeJs`) at the very top, add:

```js
  // Inflate inlined libraries (base64 → text → eval/insert)
  function injectStyle(b64, id) {
    if (document.getElementById(id)) return;
    const css = atob(b64);
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
  function injectScript(b64) {
    const code = atob(b64);
    // Use Function() rather than eval so the libraries get their own scope but
    // can still attach to window (Leaflet sets window.L, JSZip sets window.JSZip, XLSX sets window.XLSX).
    new Function(code)();
  }
  injectStyle('${LEAFLET_CSS_B64}', 'leaflet-css');
  injectScript('${LEAFLET_JS_B64}');
  injectScript('${JSZIP_JS_B64}');
  injectScript('${XLSX_JS_B64}');
```

(Note: The four base64 constants need to be interpolated into the runtime string at build time, not referenced as variables — so use `${LEAFLET_CSS_B64}` etc. inside the template string for `runtimeJs`.)

- [ ] **Step 4: Browser smoke test**

Re-export the ZIP from the live tool, open the new `package_report.html` in Chrome.

In DevTools console:
```js
typeof L === 'function' && typeof L.map === 'function'
```
Expected: `true`

```js
typeof JSZip === 'function'
```
Expected: `true`

```js
typeof XLSX === 'object' && typeof XLSX.utils === 'object'
```
Expected: `true`

Disconnect from the internet (or use Chrome's Network tab → "Offline"), reload the page. All three should still be defined.

- [ ] **Step 5: Clean up `_libs/` and add to `.gitignore`**

```bash
rm -rf "D:/repos/pluviometrics/nbc/_libs"
```

Append to `.gitignore`:
```
_libs/
```

- [ ] **Step 6: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html .gitignore
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: inline Leaflet 1.9.4, JSZip 3.10.1, xlsx 0.20.2 (offline-capable)"
```

---

## Task 3: Add sub-tab structure (Pipe Relining / Edit Packages)

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — HTML wrapper string and CSS block inside `buildReliningPackageReportHtml`

- [ ] **Step 1: Add sub-tab CSS**

Inside the report's `<style>` block (near other styles in the HTML wrapper), add:

```css
.subtab-bar { display:flex; gap:4px; border-bottom:2px solid #e5e7eb; margin-bottom:16px; }
.subtab { padding:9px 18px; border:none; background:transparent; font-size:13px; font-weight:700; color:#6B7280; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; }
.subtab.active { color:#1A2B3C; border-bottom-color:#00847F; }
.subtab:hover:not(.active) { color:#1A2B3C; }
.subpage { display:none; }
.subpage.active { display:block; }
```

- [ ] **Step 2: Wrap existing content in the Pipe Relining sub-page and add empty Edit sub-page**

Find the existing report body in the HTML wrapper (after the header / generatedMeta). Wrap everything from the meta strip through to the existing per-package detail sections in:

```html
<div class="subtab-bar">
  <button type="button" class="subtab active" data-subtab="main" onclick="switchReportSubtab('main')">Pipe Relining</button>
  <button type="button" class="subtab" data-subtab="edit" onclick="switchReportSubtab('edit')">Edit Packages</button>
</div>

<div id="report-subpage-main" class="subpage active">
  <!-- existing report content moves in here -->
</div>

<div id="report-subpage-edit" class="subpage">
  <div style="padding:24px;color:#6B7280;font-size:13px;text-align:center">Edit panel will render here once Task 5 is complete.</div>
</div>
```

- [ ] **Step 3: Add `switchReportSubtab` to runtime**

In `runtimeJs`, add:

```js
window.switchReportSubtab = function(name) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.toggle('active', b.dataset.subtab === name));
  document.querySelectorAll('.subpage').forEach(p => p.classList.toggle('active', p.id === 'report-subpage-' + name));
  // Map needs a resize kick when its container becomes visible.
  if (name === 'main' && window._reportMap) setTimeout(() => window._reportMap.invalidateSize(), 50);
};
```

- [ ] **Step 4: Browser smoke test**

Re-export ZIP, open `package_report.html`. Click "Edit Packages" tab — content area should switch. Click "Pipe Relining" — original content returns.

- [ ] **Step 5: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: add Pipe Relining / Edit Packages sub-tab structure"
```

---

## Task 4: Port the package map renderer

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — HTML wrapper and `runtimeJs` inside `buildReliningPackageReportHtml`

This task ports `renderReliningPackagesMap` (lines 9658–9826) and its colour helpers (`getReliningPackageMapStyle`, `getReliningPackageColor`, `RELINING_PACKAGE_COLORS`, plus the SELECT/DIM/C6 constants) into the standalone runtime, with the same blue/purple/orange selection scheme committed in `ff4bbc7`.

- [ ] **Step 1: Read the live tool's map renderer**

Read `D:\repos\pluviometrics\nbc\index.html` lines 9417–9826 to understand the renderer being ported. Note the C6 toggle visibility logic at `updateReliningC6ToggleVisibility` (line 9641).

- [ ] **Step 2: Add map container to the HTML wrapper**

Inside `#report-subpage-main`, after the existing packages table, add:

```html
<div class="pkg-panel" style="margin-top:14px">
  <div class="lbl" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1A2B3C;margin-bottom:10px">Package Map</div>
  <div style="position:relative">
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:8px">
      <button class="export-btn" type="button" onclick="fitReportMap()">Fit Packages</button>
      <button class="export-btn" type="button" onclick="clearReportSelection()">Clear Selection</button>
      <label class="export-btn" id="reportC6AddOnsToggle" style="display:none;cursor:pointer;align-items:center;gap:6px"><input type="checkbox" id="reportShowC6AddOns" checked onchange="renderReportPackagesMap({fit:false})" style="margin:0"> Show package C6 add-ons</label>
    </div>
    <div id="reportPackagesMap" style="height:520px;border:1px solid #e5e7eb;border-radius:8px"></div>
  </div>
</div>
```

- [ ] **Step 3: Add the colour palette + map state to runtime**

In `runtimeJs`, add:

```js
const RELINING_PACKAGE_COLORS = ['#007C89','#C44536','#6A994E','#F18F01','#5B5F97','#2D9CDB','#8E5572','#3A7D44','#D95D39','#7B2CBF','#2A9D8F','#E76F51','#4D908E','#B56576','#577590','#BC6C25'];
const RELINING_SELECT_COLOR = '#1E63D9';
const RELINING_DIM_COLOR = '#7B2CBF';
const RELINING_C6_SELECT_COLOR = '#F18F01';
const RELINING_SELECT_OPACITY = 1.0;
const RELINING_DIM_OPACITY = 0.25;
const RELINING_C6_SELECT_OPACITY = 0.5;

let reportMap = null;
let reportMapLayer = null;
let selectedReportPackageId = null;

function ensureReportMap() {
  if (reportMap) { setTimeout(() => reportMap.invalidateSize(), 50); return; }
  reportMap = L.map('reportPackagesMap').setView([-33.75, 151.25], 11);
  const sixAerial = L.tileLayer('https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Spatial Services, NSW Department of Customer Service', maxZoom: 21 });
  const cartoStreets = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, © CARTO', subdomains: 'abcd', maxZoom: 19 });
  sixAerial.addTo(reportMap);
  L.control.layers({ 'Aerial (NSW SIX Maps)': sixAerial, 'Streets (CARTO)': cartoStreets }, null, { position: 'topright', collapsed: true }).addTo(reportMap);
  reportMapLayer = L.layerGroup().addTo(reportMap);
  window._reportMap = reportMap;
}

function getReportPackageColor(pkg, index) {
  const parsed = String(pkg && pkg.id || '').match(/(\d+)$/);
  const i = parsed ? Number(parsed[1]) - 1 : (index || 0);
  return RELINING_PACKAGE_COLORS[Math.abs(i) % RELINING_PACKAGE_COLORS.length];
}

function reportPipeWeight(d) {
  const v = Number(d);
  if (!v || isNaN(v) || v <= 0) return 2;
  return Math.max(2, Math.min(12, v / 50));
}
```

- [ ] **Step 4: Add the renderer**

In `runtimeJs`, add:

```js
function renderReportPackagesMap(opts) {
  opts = opts || {};
  ensureReportMap();
  if (!reportMap || !reportMapLayer) return;
  reportMapLayer.clearLayers();
  if (!packages.length) return;
  const hasSelection = !!selectedReportPackageId;
  const showC6 = document.getElementById('reportShowC6AddOns')?.checked !== false;
  const ordered = hasSelection
    ? packages.filter(p => p.id !== selectedReportPackageId).concat(packages.filter(p => p.id === selectedReportPackageId))
    : packages;
  ordered.forEach((pkg) => {
    const baseIdx = packages.findIndex(p => p.id === pkg.id);
    const isSelected = hasSelection && pkg.id === selectedReportPackageId;
    const isDimmed = hasSelection && !isSelected;
    const baseColor = getReportPackageColor(pkg, baseIdx);
    const pkgPipes = pipes.filter(p => p.package_id === pkg.id);
    pkgPipes.forEach(item => {
      if (item.is_c6_addon && !showC6) return;
      let lineColor = baseColor;
      let lineOpacity;
      if (hasSelection) {
        if (isSelected) {
          if (item.is_c6_addon) { lineColor = RELINING_C6_SELECT_COLOR; lineOpacity = RELINING_C6_SELECT_OPACITY; }
          else { lineColor = RELINING_SELECT_COLOR; lineOpacity = RELINING_SELECT_OPACITY; }
        } else { lineColor = RELINING_DIM_COLOR; lineOpacity = RELINING_DIM_OPACITY; }
      } else {
        lineOpacity = item.is_c6_addon ? 0.7 : 0.92;
      }
      const dashArray = item.is_c6_addon ? '6 5' : undefined;
      const w = reportPipeWeight(item.diameter_mm);
      if (Number.isFinite(item.lat) && Number.isFinite(item.lon)) {
        L.circleMarker([item.lat, item.lon], {
          radius: isSelected ? 9 : 5,
          color: isSelected ? '#111827' : '#fff',
          weight: isSelected ? 3 : 1.5,
          fillColor: lineColor,
          fillOpacity: lineOpacity,
          opacity: hasSelection && !isSelected ? lineOpacity : 1
        }).bindPopup(buildReportPipePopup(item, pkg)).addTo(reportMapLayer);
      }
    });
  });
  if (!hasSelection && opts.fit !== false) fitReportMap();
}

function buildReportPipePopup(item, pkg) {
  return '<div style="font-family:Segoe UI,system-ui,sans-serif;font-size:11px;min-width:180px">' +
    '<div style="font-weight:800;color:#1A2B3C;margin-bottom:4px">' + esc(item.asset_id) + '</div>' +
    '<div><strong>Package:</strong> ' + esc(pkg.id) + '</div>' +
    '<div><strong>Diameter:</strong> Ø' + esc(item.diameter_mm || '') + 'mm</div>' +
    '<div><strong>Length:</strong> ' + Number(item.length_m || 0).toFixed(1) + ' m</div>' +
    '<div><strong>Cost:</strong> ' + fmtCurrency(item.pipe_cost) + '</div>' +
    '<div><strong>Address:</strong> ' + esc(item.address) + '</div>' +
    (item.is_c6_addon ? '<div style="color:#F18F01;margin-top:4px"><strong>C6 add-on</strong></div>' : '') +
  '</div>';
}

function fitReportMap() {
  ensureReportMap();
  if (!reportMap || !reportMapLayer) return;
  const layers = reportMapLayer.getLayers();
  if (!layers.length) return;
  reportMap.fitBounds(L.featureGroup(layers).getBounds().pad(0.15));
}

function clearReportSelection() {
  selectedReportPackageId = null;
  renderReportPackagesMap({ fit: true });
  renderReportPackagesTable();
  renderReportPackageCards();
}

function selectReportPackage(id) {
  selectedReportPackageId = id;
  renderReportPackagesMap({ fit: false });
  renderReportPackagesTable();
  renderReportPackageCards();
}
```

- [ ] **Step 5: Wire C6 toggle visibility**

In `runtimeJs`, add and call after first render:

```js
function updateReportC6ToggleVisibility() {
  const hasC6 = packages.some(p => Number(p.c6_addon_count) > 0);
  const el = document.getElementById('reportC6AddOnsToggle');
  if (el) el.style.display = hasC6 ? 'inline-flex' : 'none';
}
```

- [ ] **Step 6: Wire row/card click → select package**

After the existing `packageCards` rendering, add a click handler in `runtimeJs`:

```js
document.getElementById('packageCards').addEventListener('click', (e) => {
  const card = e.target.closest('[data-package-id]');
  if (!card) return;
  selectReportPackage(card.dataset.packageId);
});
document.getElementById('packagesTable').addEventListener('click', (e) => {
  const row = e.target.closest('tr.package-row');
  if (!row) return;
  selectReportPackage(row.dataset.packageId);
});
```

Also add the initial call after data load:
```js
updateReportC6ToggleVisibility();
renderReportPackagesMap({ fit: true });
```

- [ ] **Step 7: Refactor table render into a function so we can re-render on selection**

The existing table rendering is a one-shot block. Wrap it in `function renderReportPackagesTable() { ... }` and add a `class="package-row"` plus `selected` styling for `data-package-id === selectedReportPackageId`. Same for `renderReportPackageCards`.

Add this CSS to the report's style block:

```css
.package-row.selected { background:#FEF3C7 !important; }
.pkg-card.selected { border:2px solid #1E63D9 !important; box-shadow:0 0 0 2px rgba(30,99,217,.15); }
```

- [ ] **Step 8: Browser smoke test**

Generate packages with at least 5 packages and Cond 6/7/8 mode (so add-ons appear), re-export ZIP, open `package_report.html`.

Verify:
- Map shows pipes, each package in its palette colour
- Click a package row → that package turns blue, others turn purple, add-ons turn orange (matches live tool)
- "Clear Selection" returns to default rainbow
- "Show package C6 add-ons" toggle hides/shows orange dashed pipes
- "Fit Packages" zooms to bounds
- Click a pipe → popup shows its data including C6 flag

- [ ] **Step 9: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: port package map with selection highlighting and C6 toggle"
```

---

## Task 5: Add localStorage-backed manual moves layer

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — `runtimeJs`

- [ ] **Step 1: Add manual moves state and persistence helpers**

In `runtimeJs`, add (near the top, before render functions):

```js
const REPORT_MOVES_KEY = 'nbc-report-moves:' + (data.generated_at || 'unknown');
let reportManualMoves = loadReportMoves();

function loadReportMoves() {
  try {
    const raw = localStorage.getItem(REPORT_MOVES_KEY);
    if (!raw) return emptyMoves();
    const parsed = JSON.parse(raw);
    return {
      assignments: parsed.assignments || {},
      anchorOrigins: parsed.anchorOrigins || {},
      locks: { pipes: parsed.locks?.pipes || {}, packages: parsed.locks?.packages || {} },
      moveOrigins: parsed.moveOrigins || {}
    };
  } catch (e) { return emptyMoves(); }
}

function emptyMoves() {
  return { assignments: {}, anchorOrigins: {}, locks: { pipes: {}, packages: {} }, moveOrigins: {} };
}

function saveReportMoves() {
  try { localStorage.setItem(REPORT_MOVES_KEY, JSON.stringify(reportManualMoves)); }
  catch (e) { console.warn('[Report] Failed to persist moves:', e); }
}

function resetReportMoves() {
  if (!confirm('Clear all manual edits and return to the original generated state?')) return;
  reportManualMoves = emptyMoves();
  saveReportMoves();
  applyMovesAndRender();
}
```

- [ ] **Step 2: Snapshot the original pipe-to-package mapping**

Just below the `data` parse, add:

```js
const originalAssignments = {};
pipes.forEach(p => { originalAssignments[p.asset_id] = p.package_id; });
```

- [ ] **Step 3: Implement `applyMovesAndRender`**

```js
function applyMovesAndRender() {
  // 1. Reset every pipe to its original package
  pipes.forEach(p => { p.package_id = originalAssignments[p.asset_id]; });
  // 2. Apply manual assignments on top
  Object.entries(reportManualMoves.assignments || {}).forEach(([assetId, targetPkgId]) => {
    const pipe = pipes.find(p => p.asset_id === assetId);
    if (pipe) pipe.package_id = targetPkgId;
  });
  // 3. Rebuild package objects from current pipe assignments
  rebuildPackagesFromPipes();
  // 4. Re-prioritise + renumber
  prioritiseAndRenumberReportPackages();
  // 5. Re-render everything
  renderReportPackageCards();
  renderReportPackagesTable();
  renderReportEditPanel();
  renderReportPackagesMap({ fit: false });
  renderReportMetaStrip();
  updateReportC6ToggleVisibility();
}
```

- [ ] **Step 4: Implement `rebuildPackagesFromPipes` and `prioritiseAndRenumberReportPackages`**

Port the live tool's logic. In `runtimeJs`, add:

```js
function rebuildPackagesFromPipes() {
  const byPkg = new Map();
  pipes.forEach(p => {
    if (!byPkg.has(p.package_id)) byPkg.set(p.package_id, []);
    byPkg.get(p.package_id).push(p);
  });
  packages.length = 0;
  byPkg.forEach((items, pkgId) => {
    const lengths = items.map(i => Number(i.length_m) || 0);
    const costs = items.map(i => Number(i.pipe_cost) || 0);
    const diameters = [...new Set(items.map(i => Number(i.diameter_mm)).filter(Number.isFinite))].sort((a,b)=>a-b);
    const suburbs = [...new Set(items.map(i => i.suburb).filter(Boolean))];
    const coords = items.filter(i => Number.isFinite(i.lat) && Number.isFinite(i.lon));
    const centroid = coords.length ? [coords.reduce((s,c)=>s+c.lat,0)/coords.length, coords.reduce((s,c)=>s+c.lon,0)/coords.length] : null;
    let maxSpan = 0;
    for (let i = 0; i < coords.length; i++) for (let j = i+1; j < coords.length; j++) {
      const d = haversineM(coords[i].lat, coords[i].lon, coords[j].lat, coords[j].lon);
      if (d > maxSpan) maxSpan = d;
    }
    packages.push({
      id: pkgId,
      original_package_id: pkgId,
      suburbs,
      diameters_mm: diameters,
      pipe_count: items.length,
      total_length_m: lengths.reduce((a,b)=>a+b,0),
      total_cost: costs.reduce((a,b)=>a+b,0),
      max_span_m: maxSpan,
      condition_6_count: items.filter(i => i.is_c6_addon || Number(i.condition_score) === 6).length,
      condition_7_count: items.filter(i => Number(i.condition_score) === 7).length,
      condition_8_count: items.filter(i => Number(i.condition_score) === 8).length,
      c6_addon_count: items.filter(i => i.is_c6_addon).length,
      asset_ids: items.map(i => i.asset_id),
      centroid
    });
  });
}

function prioritiseAndRenumberReportPackages() {
  packages.forEach(pkg => {
    const items = pipes.filter(p => p.package_id === pkg.id);
    pkg.package_total_pipe_priority = items.reduce((s,i)=>s+(Number(i.pipe_priority_score)||0), 0);
    pkg.package_max_pipe_priority   = items.reduce((m,i)=>Math.max(m, Number(i.pipe_priority_score)||0), 0);
    pkg.package_high_crit_count     = items.filter(i => !i.is_c6_addon && Number(i.criticality_1dp) >= 4.0).length;
    pkg.package_large_diam_count    = items.filter(i => !i.is_c6_addon && Number(i.diameter_mm) >= 525).length;
    pkg.package_xlarge_diam_count   = items.filter(i => !i.is_c6_addon && Number(i.diameter_mm) >= 900).length;
    pkg.package_worst_condition     = items.reduce((m,i)=>Math.max(m, Number(i.condition_score)||0), 0);
    pkg.package_priority_score = pkg.package_total_pipe_priority
      + 1 * pkg.package_max_pipe_priority
      + 5 * pkg.package_high_crit_count
      + 3 * pkg.package_large_diam_count
      + 4 * pkg.package_xlarge_diam_count
      + 2 * pkg.package_worst_condition;
  });
  packages.sort((a, b) => {
    for (const k of ['package_priority_score','package_total_pipe_priority','package_high_crit_count','package_large_diam_count','package_worst_condition','total_length_m','pipe_count']) {
      const d = (Number(b[k])||0) - (Number(a[k])||0);
      if (d !== 0) return d;
    }
    return String(a.id).localeCompare(String(b.id));
  });
  packages.forEach((pkg, i) => {
    const newId = 'RLN_' + String(i+1).padStart(3, '0');
    if (pkg.id !== newId) {
      pipes.forEach(p => { if (p.package_id === pkg.id) p.package_id = newId; });
      pkg.id = newId;
    }
  });
  pkgIndex = {};
  packages.forEach((p, i) => { pkgIndex[p.id] = i; });
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

- [ ] **Step 5: Browser smoke test**

Re-export ZIP, open `package_report.html`. In DevTools console:
```js
applyMovesAndRender()
```
Expected: panels re-render without changes (no manual moves yet).

```js
reportManualMoves.assignments[pipes[0].asset_id] = packages[1].id; saveReportMoves(); applyMovesAndRender();
```
Expected: pipe count of package 0 decreases by 1, pipe count of package 1 increases by 1, IDs may renumber.

Refresh the page. Confirm the move persists (pipes[0] is still in the moved-to package).

```js
resetReportMoves()
```
Click OK in confirm dialog. Confirm pipe is back in original package.

- [ ] **Step 6: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: add localStorage-backed manual moves with prioritise+renumber"
```

---

## Task 6: Render the Edit Packages panel

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — `runtimeJs` and the `#report-subpage-edit` placeholder

- [ ] **Step 1: Replace the placeholder with the panel structure**

In the HTML wrapper, change `#report-subpage-edit` from the placeholder to:

```html
<div id="report-subpage-edit" class="subpage">
  <div class="pkg-panel">
    <div class="lbl">Edit Packages</div>
    <div style="font-size:12px;color:#6B7280;margin-top:6px;line-height:1.5">
      Move pipes between packages. Manual moves persist in this browser (per-report).
      Use <em>+ Create new package</em> in any pipe's <strong>Move to package</strong> dropdown.
      <strong style="color:#1A2B3C">Note:</strong> Package IDs renumber by priority after every edit, matching the live tool. The pipe you moved stays in its new package; only the ID label may change.
    </div>
    <div style="margin-top:10px"><button class="export-btn" type="button" onclick="resetReportMoves()">Reset all moves</button></div>
  </div>
  <div id="reportEditArea" style="margin-top:12px"></div>
</div>
```

- [ ] **Step 2: Implement `renderReportEditPanel`**

In `runtimeJs`:

```js
function renderReportEditPanel() {
  const area = document.getElementById('reportEditArea');
  if (!area) return;
  if (!packages.length) { area.innerHTML = '<div class="pkg-empty">No packages.</div>'; return; }
  const optsHtml = packages.map(p => '<option value="' + esc(p.id) + '">' + esc(p.id) + '</option>').join('');
  const newOpt = '<option value="__new__">+ Create new package</option>';
  const rows = pipes.slice().sort((a,b) => String(a.package_id).localeCompare(String(b.package_id)) || String(a.asset_id).localeCompare(String(b.asset_id))).map(p => {
    const manuallyMoved = reportManualMoves.assignments[p.asset_id] != null && reportManualMoves.assignments[p.asset_id] !== originalAssignments[p.asset_id];
    return '<tr' + (manuallyMoved ? ' style="background:#FEF3C7"' : '') + '>' +
      '<td style="padding:6px 8px;font-family:monospace;font-size:11px"><strong>' + esc(p.package_id) + '</strong></td>' +
      '<td style="padding:6px 8px;font-family:monospace;font-size:11px">' + esc(p.asset_id) + '</td>' +
      '<td style="padding:6px 8px;font-size:11px">Ø' + esc(p.diameter_mm || '') + 'mm</td>' +
      '<td style="padding:6px 8px;font-size:11px">' + esc(p.suburb) + '</td>' +
      '<td style="padding:6px 8px;font-size:11px">' + Number(p.length_m || 0).toFixed(1) + ' m</td>' +
      '<td style="padding:6px 8px;font-size:11px">' + fmtCurrency(p.pipe_cost) + '</td>' +
      '<td style="padding:6px 8px">' +
        '<select onchange="onMovePipe(\'' + esc(p.asset_id) + '\', this.value)" title="IDs may renumber after move">' +
        '<option value="" disabled selected>Move to…</option>' +
        optsHtml + newOpt +
        '</select>' +
      '</td>' +
    '</tr>';
  }).join('');
  area.innerHTML =
    '<table style="width:100%;border-collapse:collapse;font-family:Segoe UI,system-ui,sans-serif">' +
      '<thead><tr style="background:#f3f4f6;text-align:left">' +
        '<th style="padding:8px;font-size:11px">Package</th>' +
        '<th style="padding:8px;font-size:11px">Asset</th>' +
        '<th style="padding:8px;font-size:11px">Dia</th>' +
        '<th style="padding:8px;font-size:11px">Suburb</th>' +
        '<th style="padding:8px;font-size:11px">Length</th>' +
        '<th style="padding:8px;font-size:11px">Cost</th>' +
        '<th style="padding:8px;font-size:11px">Move to package</th>' +
      '</tr></thead><tbody>' + rows + '</tbody>' +
    '</table>';
}

window.onMovePipe = function(assetId, target) {
  if (!target) return;
  let targetId = target;
  if (target === '__new__') {
    const maxNum = packages.reduce((m, p) => Math.max(m, Number(String(p.id).match(/(\d+)$/)?.[1] || 0)), 0);
    targetId = 'RLN_' + String(maxNum + 1).padStart(3, '0');
  }
  reportManualMoves.assignments[assetId] = targetId;
  saveReportMoves();
  applyMovesAndRender();
};
```

- [ ] **Step 3: Wire initial render**

In the runtime initialisation block (after `applyMovesAndRender` is defined), call:
```js
applyMovesAndRender();
```
This replaces individual one-shot calls to `renderReportPackageCards`, `renderReportPackagesTable`, `renderReportPackagesMap`, etc.

- [ ] **Step 4: Browser smoke test**

Re-export ZIP, open `package_report.html`. Click "Edit Packages" tab.

Verify:
- Table lists every pipe with package, asset, dia, suburb, length, cost
- Each row has a "Move to…" dropdown including all package ids and "+ Create new package"
- Pick a package from the dropdown → row gets yellow tint, panel re-renders, IDs may shuffle
- Switch to Pipe Relining tab → cards/table/map reflect the move
- Click "+ Create new package" → pipe goes to a new RLN_NNN
- Refresh → moves persist
- "Reset all moves" → confirm dialog → returns to original

- [ ] **Step 5: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: add Edit Packages panel with per-pipe move dropdowns"
```

---

## Task 7: Save Lock File button

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — header HTML and `runtimeJs`

- [ ] **Step 1: Add the button to the header**

In the HTML wrapper's header strip (next to the existing status chip), add:

```html
<button class="export-btn" type="button" onclick="saveReportLockFile()" style="margin-right:6px">Save Lock File</button>
```

- [ ] **Step 2: Add `saveReportLockFile` to runtime**

In `runtimeJs`:

```js
window.saveReportLockFile = function() {
  const blob = new Blob([JSON.stringify(reportManualMoves, null, 2)], { type: 'application/json' });
  const generated = (data.generated_at || '').replace(/[:T]/g,'-').replace(/\..*$/, '') || 'unknown';
  const filename = 'relining_locks_' + generated + '.json';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
};
```

- [ ] **Step 3: Browser smoke test**

Re-export ZIP, open `package_report.html`. Make a manual move in Edit Packages tab. Click "Save Lock File" in header.

Verify:
- File downloads named `relining_locks_<timestamp>.json`
- Open the file in a text editor — contains `{ "assignments": { "<asset_id>": "<target_pkg_id>" }, ... }`

Now in the live tool, click **Load Locks** in the relining header, pick the downloaded file. The live tool should re-run generation and re-apply the move.

- [ ] **Step 4: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: add Save Lock File button (round-trips to live tool)"
```

---

## Task 8: Re-export Work Order Pack ZIP — CSV + summary + file_list

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — header HTML and `runtimeJs`

This is the largest single task. We port the CSV / summary / file_list generation from `downloadReliningPackagesZip` (line 9113). KML, per-package map HTML, and inner package_report.html generation come in Task 9.

- [ ] **Step 1: Add the button + "Edited by" input to the header**

In the HTML wrapper's header:

```html
<input type="text" id="reportEditedBy" placeholder="Edited by (your name)" style="font-size:12px;padding:4px 8px;border:1px solid #DDE3E8;border-radius:6px;width:160px;margin-right:6px">
<label style="font-size:11px;color:#6B7280;margin-right:8px"><input type="checkbox" id="reportIncludeLocks"> Include lock file</label>
<button class="export-btn" type="button" onclick="exportReportZip()" style="background:#00847F;color:#fff">Export Work Order Pack (ZIP)</button>
```

- [ ] **Step 2: Add CSV/summary/file_list builders to runtime**

In `runtimeJs`:

```js
const ZIP_HEADERS = [
  'package_id','Asset','SWP_Pipe Diameter_mm','Spatial Length_m',
  'SW_Condition','Observed_Condition','SW_Upstream Node','SW_Downstream Node',
  'rate_per_m','pipe_cost','Address','Asset Suburb',
  'Max Distance Between Pipes (km)','Google_Street_View'
];

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function csvRow(arr) { return arr.map(csvCell).join(','); }
function fmtCurrencyCents(v) {
  if (!Number.isFinite(v)) return '';
  return '$' + v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function streetViewUrl(addr) {
  const a = String(addr || '').trim();
  return a ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a) : '';
}
function maxSpanText(pkg) {
  return Number.isFinite(pkg.max_span_m) ? (pkg.max_span_m / 1000).toFixed(1) + ' km' : '0.0 km';
}

function buildPackageCsv(pkg) {
  const items = pipes.filter(p => p.package_id === pkg.id);
  const lines = [csvRow(ZIP_HEADERS)];
  let totalLen = 0, totalCost = 0;
  items.forEach(item => {
    const len = Number(item.length_m) || 0;
    const cost = Number(item.pipe_cost) || 0;
    totalLen += len; totalCost += cost;
    const addr = item.raw?.Formatted_Address || item.raw?.Address || item.raw?.Pipe_Start_Address || item.raw?.Street_Address || item.address || '';
    lines.push(csvRow([
      pkg.id, item.asset_id, item.diameter_mm || '', len ? len.toFixed(1) + ' m' : '',
      item.raw?.SW_Condition ?? item.condition ?? '',
      item.raw?.Observed_Condition ?? '',
      item.raw?.SW_Upstream_Node ?? item.upstream ?? '',
      item.raw?.SW_Downstream_Node ?? item.downstream ?? '',
      Number.isFinite(item.rate_per_m) ? item.rate_per_m : '',
      cost ? fmtCurrencyCents(cost) : '',
      addr, String(item.suburb || '').toUpperCase(),
      '', streetViewUrl(addr)
    ]));
  });
  const totalsRow = ZIP_HEADERS.map(() => '');
  totalsRow[ZIP_HEADERS.indexOf('package_id')] = 'Totals';
  totalsRow[ZIP_HEADERS.indexOf('Spatial Length_m')] = totalLen.toFixed(2) + ' m';
  totalsRow[ZIP_HEADERS.indexOf('pipe_cost')] = fmtCurrencyCents(totalCost);
  totalsRow[ZIP_HEADERS.indexOf('Max Distance Between Pipes (km)')] = maxSpanText(pkg);
  lines.push(csvRow(totalsRow));
  return { csv: lines.join('\n'), totalLen, totalCost };
}

function buildProvenanceLines() {
  const editedBy = (document.getElementById('reportEditedBy')?.value || '').trim() || 'unknown';
  const orig = data.provenance || {};
  return [
    'Original generated_at: ' + (orig.generated_at || data.generated_at || ''),
    'Edited in standalone editor on: ' + new Date().toISOString(),
    'Edited by: ' + editedBy,
    'Source: NBC Relining Tool — standalone editor re-export',
    'Package count: ' + packages.length,
    'Pipe count: ' + pipes.length
  ];
}
```

- [ ] **Step 3: Add `exportReportZip` (CSV + txt/xlsx outputs only — KML/maps/inner-html in Task 9)**

In `runtimeJs`:

```js
window.exportReportZip = async function() {
  if (!packages.length) { alert('No packages to export.'); return; }
  if (typeof JSZip === 'undefined') { alert('JSZip not loaded — refresh and try again.'); return; }
  const zip = new JSZip();
  const csvNames = [];
  const summaryRows = [['Package ID','Suburb','Diameters (mm)','Max Distance Between Pipes (km)','Pipes','Cond 7','Cond 8','Length (m)','Cost ($)','Asset IDs']];
  const summaryLines = ['PACKAGE SUMMARY','='.repeat(60),'', ...buildProvenanceLines(), '-'.repeat(60), ''];

  packages.forEach((pkg, idx) => {
    const built = buildPackageCsv(pkg);
    const filename = pkg.id + '_pipes.csv';
    csvNames.push(filename);
    zip.file(filename, '﻿' + built.csv);
    const items = pipes.filter(p => p.package_id === pkg.id);
    const diametersStr = (pkg.diameters_mm || []).join(', ');
    const suburbsStr = (pkg.suburbs || []).join(', ');
    const maxDist = maxSpanText(pkg);
    summaryLines.push('Package:    ' + pkg.id);
    summaryLines.push('Suburb:     ' + suburbsStr);
    summaryLines.push('Diameters:  ' + diametersStr);
    summaryLines.push('Pipes:      ' + items.length);
    summaryLines.push('Cond 7:     ' + Number(pkg.condition_7_count || 0));
    summaryLines.push('Cond 8:     ' + Number(pkg.condition_8_count || 0));
    summaryLines.push('Length:     ' + built.totalLen.toLocaleString('en-AU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'm');
    summaryLines.push('Max Dist:   ' + maxDist);
    summaryLines.push('Cost:       $' + Math.round(built.totalCost).toLocaleString('en-AU'));
    summaryLines.push('-'.repeat(60));
    if (idx < packages.length - 1) summaryLines.push('');
    summaryRows.push([pkg.id, suburbsStr, diametersStr, maxDist, items.length, Number(pkg.condition_7_count||0), Number(pkg.condition_8_count||0), Math.round(built.totalLen*10)/10, Math.round(built.totalCost), items.map(i => i.asset_id).join(', ')]);
  });

  zip.file('package_summary.txt', summaryLines.join('\n'));
  const sortedNames = csvNames.slice().sort();
  zip.file('file_list.txt', ['PACKAGE FILE LIST','='.repeat(60),'', ...buildProvenanceLines(), '-'.repeat(60), '', ...sortedNames].join('\n'));
  zip.file('provenance.txt', buildProvenanceLines().join('\n') + '\n');

  if (typeof XLSX !== 'undefined') {
    const wb1 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet(summaryRows), 'Package Summary');
    zip.file('package_summary.xlsx', XLSX.write(wb1, { type: 'array', bookType: 'xlsx' }));
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet([['Filename'], ...sortedNames.map(n => [n])]), 'File List');
    zip.file('file_list.xlsx', XLSX.write(wb2, { type: 'array', bookType: 'xlsx' }));
  }

  if (document.getElementById('reportIncludeLocks')?.checked) {
    zip.file('locks.json', JSON.stringify(reportManualMoves, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'relining_packages_edited_' + new Date().toISOString().slice(0,10) + '.zip';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
};
```

- [ ] **Step 4: Browser smoke test**

Re-export ZIP from live tool, open standalone, make a move, set "Edited by", click Export Work Order Pack (ZIP).

Verify the downloaded `relining_packages_edited_YYYY-MM-DD.zip` contains:
- One `RLN_NNN_pipes.csv` per package with the 14-column header
- `package_summary.txt`, `package_summary.xlsx`, `file_list.txt`, `file_list.xlsx`, `provenance.txt`
- Provenance mentions "Edited by: <name>" and "Edited in standalone editor on: <date>"
- Open one CSV in Excel: rows present, last row is `Totals` with summed length and cost

Tick "Include lock file" then re-export → ZIP also contains `locks.json`.

- [ ] **Step 5: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: ZIP re-export with per-package CSVs, summary, file list, provenance"
```

---

## Task 9: Re-export — KML, per-package map HTML, fresh package_report.html

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — `runtimeJs` (extend `exportReportZip`)

- [ ] **Step 1: Read the live tool's helpers**

Read `D:\repos\pluviometrics\nbc\index.html`:
- `buildPipeKml` (search for it — used at line 9357)
- `buildSinglePackageMapHtml` (line 8608+)

These functions are pure — they take a package and produce a string. They reference some renderer constants but no globals beyond what we can copy.

- [ ] **Step 2: Port `buildPipeKml` into the runtime**

In `runtimeJs`, add a port (keep the same output structure):

```js
function buildReportPipeKml(pkg, color) {
  const items = pipes.filter(p => p.package_id === pkg.id && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const placemarks = items.map(item => {
    const lonLat = item.lon.toFixed(6) + ',' + item.lat.toFixed(6) + ',0';
    return '<Placemark><name>' + esc(item.asset_id) + '</name>' +
      '<description>Ø' + (item.diameter_mm || '') + 'mm · ' + Number(item.length_m||0).toFixed(1) + 'm · ' + fmtCurrency(item.pipe_cost) + '</description>' +
      '<Point><coordinates>' + lonLat + '</coordinates></Point></Placemark>';
  }).join('');
  const colorAbgr = 'ff' + color.replace('#','').match(/../g).reverse().join('').toLowerCase();
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>' +
    '<name>' + esc(pkg.id) + '</name>' +
    '<Style id="pipeStyle"><IconStyle><color>' + colorAbgr + '</color></IconStyle></Style>' +
    placemarks +
    '</Document></kml>';
}
```

- [ ] **Step 3: Port `buildSinglePackageMapHtml`**

This is a larger lift — read the live tool's version (line 8608), copy verbatim into the runtime as `buildReportSinglePackageMapHtml`, and adjust references:
- `pkg.assets` → `pipes.filter(p => p.package_id === pkg.id)` and adapt field names (`assetId` → `asset_id`, `diameterMm` → `diameter_mm`, `lengthM` → `length_m`, `pipeCost` → `pipe_cost`)
- `options` → pull from `data.options`
- `generatedAt` → use `data.generated_at`
- `packageColor` → use `getReportPackageColor(pkg, packages.findIndex(p => p.id === pkg.id))`

Because of the verbatim copy, paste the live tool's source for `buildSinglePackageMapHtml` into the runtime file, then mechanically rename fields. Result is large (~150 lines added to runtime).

- [ ] **Step 4: Port the standalone report builder itself (recursive)**

This is the trickiest part. The re-exported ZIP includes a fresh `package_report.html`. To build it, the runtime needs the same `buildReliningPackageReportHtml` function that's in `index.html`.

Approach: in the source `index.html`, when emitting the runtime string for the standalone, **also emit the source of `buildReliningPackageReportHtml` itself as a string**. The runtime can then call it with the current edited state.

In `buildReliningPackageReportHtml`, at the end (just before returning the wrapper), add:

```js
const selfSource = buildReliningPackageReportHtml.toString();
```

In the runtime, expose a re-export helper:

```js
const SELF_SOURCE = ${JSON.stringify(selfSource)};
function buildFreshReport() {
  const fn = new Function('return (' + SELF_SOURCE + ')')();
  // Reconstruct the input args from current state
  const liveStylePackages = packages.map(pkg => ({
    package_id: pkg.id,
    suburb: (pkg.suburbs || [])[0] || 'Unknown',
    suburbs: pkg.suburbs || [],
    pipe_count: pkg.pipe_count,
    total_length_m: pkg.total_length_m,
    total_cost: pkg.total_cost,
    diameters_mm: pkg.diameters_mm || [],
    max_span_m: pkg.max_span_m,
    condition_6_count: pkg.condition_6_count,
    condition_7_count: pkg.condition_7_count,
    condition_8_count: pkg.condition_8_count,
    c6_addon_count: pkg.c6_addon_count,
    asset_ids: pkg.asset_ids || [],
    package_priority_score: pkg.package_priority_score,
    package_high_crit_count: pkg.package_high_crit_count,
    package_large_diam_count: pkg.package_large_diam_count,
    package_xlarge_diam_count: pkg.package_xlarge_diam_count,
    package_worst_condition: pkg.package_worst_condition,
    package_total_length: pkg.total_length_m,
    package_pipe_count: pkg.pipe_count,
    lat: pkg.centroid?.[0] ?? null,
    lon: pkg.centroid?.[1] ?? null,
    coordinate_sources: pkg.coordinate_sources || '',
    distance_warning: pkg.distance_warning || '',
    assets: pipes.filter(p => p.package_id === pkg.id).map(item => ({
      assetId: item.asset_id, suburb: item.suburb, diameterMm: item.diameter_mm,
      lengthM: item.length_m, pipeCost: item.pipe_cost, ratePerM: item.rate_per_m,
      lat: item.lat, lon: item.lon, xMid: item.x_mid, yMid: item.y_mid,
      is_c6_addon: item.is_c6_addon, condition: item.condition,
      criticality_1dp: item.criticality_1dp, condition_score: item.condition_score, pipe_priority_score: item.pipe_priority_score,
      raw: item.raw
    }))
  }));
  return fn(liveStylePackages, [], data.options, { total_length_m: packages.reduce((s,p)=>s+(p.total_length_m||0),0), total_cost: packages.reduce((s,p)=>s+(p.total_cost||0),0) });
}
```

- [ ] **Step 5: Wire all three (KML, per-package map, fresh report) into `exportReportZip`**

After the existing `zip.file('provenance.txt', …)` line in `exportReportZip`, add:

```js
const PALETTE = RELINING_PACKAGE_COLORS;
packages.forEach((pkg, i) => {
  const color = PALETTE[i % PALETTE.length];
  const safeId = pkg.id.replace(/[^A-Za-z0-9_-]/g, '_');
  zip.file(pkg.id + '_map.html', buildReportSinglePackageMapHtml(pkg, color));
  zip.file('package_maps/' + safeId + '_pipes.kml', buildReportPipeKml(pkg, color));
});
zip.file('package_report.html', buildFreshReport());
```

- [ ] **Step 6: Browser smoke test**

Re-export, make a move, click Export Work Order Pack (ZIP). Verify the downloaded ZIP now contains:
- All Task 8 outputs
- `RLN_NNN_map.html` per package — open one, confirm it shows that package's pipes on a Leaflet map
- `package_maps/RLN_NNN_pipes.kml` per package — opens in Google Earth
- `package_report.html` — open it, confirm it reflects the edited state (the moved pipe is in the new package)

Open the inner `package_report.html` and verify it ALSO has the editor — i.e., the recursion works.

- [ ] **Step 7: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: ZIP re-export now includes per-pkg map HTML, KML, and fresh package_report.html"
```

---

## Task 10: Add the read-only options strip and reasoning panel updates

**Files:**
- Modify: `D:\repos\pluviometrics\nbc\index.html` — small adjustments

The options strip and reasoning narrative already exist in the standalone (lines 7549–7609). After edits the reasoning shouldn't change (it describes the *original* generation), but the meta strip totals (Pipes, Length, Cost, Packages) DO change.

- [ ] **Step 1: Refactor meta strip rendering into a re-callable function**

Find the existing meta strip code (around line 7538–7547). Wrap it in:

```js
function renderReportMetaStrip() {
  const meta = [
    { label: 'Total Packages', value: fmtNum(packages.length, 0) },
    { label: 'Total Pipes', value: fmtNum(pipes.length, 0) },
    { label: 'Total Length', value: fmtNum(packages.reduce((s,p)=>s+(p.total_length_m||0),0), 1) + ' m' },
    { label: 'Estimated Cost', value: fmtCurrency(packages.reduce((s,p)=>s+(p.total_cost||0),0)) || '$0' }
  ];
  document.getElementById('metaStrip').innerHTML = meta.map(s =>
    '<div class="pkg-meta-item"><div class="pkg-meta-lbl">' + esc(s.label) + '</div><div class="pkg-meta-val">' + esc(s.value) + '</div></div>'
  ).join('');
}
```

`applyMovesAndRender` already calls this (added in Task 5).

- [ ] **Step 2: Browser smoke test**

Re-export, open report, make a move that changes a package's pipe count. Confirm the KPI tiles at top (Total Packages, Total Pipes, Total Length, Estimated Cost) update.

- [ ] **Step 3: Commit**

```bash
git -C "D:/repos/pluviometrics/nbc" add index.html
git -C "D:/repos/pluviometrics/nbc" commit -m "Standalone report: KPI tiles re-render after manual moves"
```

---

## Task 11: End-to-end verification + push

**Files:** none

- [ ] **Step 1: Full smoke test**

In the live tool:
1. Generate packages with Cond 6, 7 and 8 mode, 3000m grouping, value packaging.
2. Export Work Order Pack (ZIP).
3. Extract ZIP, open `package_report.html` in Chrome.

In the standalone:
1. Verify Pipe Relining tab — KPI tiles, options strip, cards, table, package map all render. Selection highlighting (blue/purple/orange) works. C6 toggle works.
2. Switch to Edit Packages tab. Move 2 pipes between different packages. Create 1 new package by moving a pipe to "+ Create new package".
3. Switch back to Pipe Relining tab — confirm cards/table/map reflect the edits. IDs may have renumbered.
4. Save Lock File. Open the JSON in a text editor. Confirm assignments include the 3 moves.
5. In a fresh tab, open the original ZIP's `package_report.html`. Confirm the `localStorage`-persisted moves restore on reload.
6. In the live tool, click Load Locks, pick the saved JSON. Confirm the live tool re-runs and applies the moves.
7. Back in the standalone: Export Work Order Pack (ZIP). Confirm the new ZIP contains all expected files. Open the inner `package_report.html` — confirm it has the moves applied AND its own editor works.

- [ ] **Step 2: Run a verification log**

Open DevTools console in the standalone. Confirm no red errors during the workflow above. Warnings about CORS / Leaflet tiles offline are expected; eval-related CSP warnings are expected (we use `new Function()` to inflate inlined libraries).

- [ ] **Step 3: Push**

```bash
git -C "D:/repos/pluviometrics/nbc" push origin main
```

Expected output: pushes Tasks 1–10 commits to `Pluviometrics/nbc:main`. Within ~1 minute the live `nbc.pluviometrics.com.au` rebuilds.

- [ ] **Step 4: Final user acceptance**

Generate a fresh ZIP from the live `nbc.pluviometrics.com.au` site (not local), verify the standalone report from THAT ZIP works end to end.

---

## Self-Review Notes

- **Spec coverage:** Each spec section maps to at least one task. Architecture → Tasks 1, 2, 4. Layout → Tasks 3, 4, 6. Snapshot → Task 1. Edit semantics → Tasks 5, 6. Save Lock File → Task 7. ZIP re-export → Tasks 8, 9. Code organisation → Tasks 1–10 (all inside `buildReliningPackageReportHtml`).
- **Drift acceptance:** Spec acknowledges drift. Plan honours it — copies live-tool helpers rather than sharing modules.
- **Ambiguity check:** "Edited by" name is captured at export time via the input added in Task 8. ID renumbering behaviour is explained in the Task 6 panel header. ZIP filename is `relining_packages_edited_YYYY-MM-DD.zip`.
- **Risks called out in the spec all have mitigations in the plan:** library bundling (Task 2 base64 + separate constants), snapshot bloat (Task 1 whitelist), renumbering confusion (Task 6 explanation note), per-package map drift (Task 9 manual rename of fields with field-rename rules).
