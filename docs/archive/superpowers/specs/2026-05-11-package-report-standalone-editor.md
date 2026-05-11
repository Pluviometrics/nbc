# Standalone `package_report.html` — full editor with lock save and ZIP re-export

**Date:** 2026-05-11
**Repo:** `nbc.pluviometrics.com.au` (`D:\repos\pluviometrics\nbc`)
**Status:** Design — awaiting user review

## Goal

Replace the current standalone `package_report.html` (built by `buildReliningPackageReportHtml`, lines 7399–8218 of `index.html`) with a single self-contained file that mirrors the live tool's **Pipe Relining** main view and **Edit Packages** sub-tab, supports full editing, and can:

1. Save out a `locks.json` that the live tool's `loadReliningLocksFile` accepts (round-trip back to source).
2. Re-export a contractor-ready Work Order Pack ZIP that matches the live tool's `downloadReliningPackagesZip` output.

The standalone is read-and-edit only. Anything that requires the source data (asset register, panel rates) — generation, top-up, attaching new C6 add-ons, recosting — stays in the live tool.

## Out of scope

- Future Works Plan tab
- CCTV Packaging tab
- Multi-user / real-time collaboration
- Re-running rate match or top-up logic
- Adding new C6 add-ons (the editor can move existing add-ons but cannot promote previously-unpackaged C6 pipes)

## Non-goals worth being explicit about

- The standalone does not need to support generating fresh packages. It is an editor for an already-generated set.
- Per-pipe rates do not change on edit. Package totals (cost, length, pipe count, max span, centroid, condition counts) do.

## Architecture

A single self-contained HTML file containing:

- **Embedded JSON snapshot** of the generated state, expanded to carry every column the live tool's CSV/ZIP writer reads and every field the renderers need.
- **Inlined libraries** — Leaflet, JSZip, XLSX. Inlined rather than CDN-loaded so the standalone works fully offline (including ZIP re-export). File size will land around 3–5 MB. The user has confirmed file size is not a concern.
- **Inlined runtime** — ports of the live tool's render functions (cards, table, map with selection highlighting, edit panel, popups), plus reduced versions of `applyReliningManualMoves`, `prioritiseAndRenumberReliningPackages`, `downloadReliningPackagesZip`, and a new `saveReliningLocksFile` helper.

Renderers are **copied** from the live tool, not shared. Live-tool renderers depend on globals (`reliningPackagesMap`, `selectedReliningPackageId`, `lastPackagingGeneration`, `reliningManualMoves`). Porting them inline as module-scoped equivalents avoids destabilising the live tool. Cost: ~600–800 additional lines inside `buildReliningPackageReportHtml`. Acceptable.

## Layout

```
┌─ header ───────────────────────────────────────────────────┐
│ Title · "Generated <ISO timestamp>" · status chip          │
│ [Save Lock File]   [Export Work Order Pack (ZIP)]          │
│ ☐ Include lock file in ZIP                                 │
└────────────────────────────────────────────────────────────┘
┌─ sub-tab bar ──────────────────────────────────────────────┐
│ [Pipe Relining]  [Edit Packages]                           │
└────────────────────────────────────────────────────────────┘

Pipe Relining tab
  ├── KPI tiles (Total Packages · Total Pipes · Total Length · Estimated Cost)
  ├── Options strip (read-only display of the run's options)
  ├── Overall reasoning narrative (existing bullets)
  ├── Package cards grid (with colour swatch, click → select on map)
  ├── Generated Packages table (sortable, click row → select on map)
  └── Package Map
      ├── Leaflet, NSW SIX Maps aerial + CARTO streets
      ├── Per-package palette (live tool's 16 colours)
      ├── Selection highlight: selected blue, dimmed purple, C6 add-ons orange (the scheme committed earlier)
      ├── C6 add-on toggle (when applicable)
      ├── "Show all other C6" toggle (only if c6Pool snapshot is included)
      └── Fit / Refresh / Clear Selection buttons

Edit Packages tab
  ├── Header explanation: "Package IDs renumber by priority after every edit
  │    to match the live tool. The pipe you moved stays in the same package,
  │    but its ID may change."
  ├── One row per pipe with "Move to package" dropdown including:
  │     • each existing package id
  │     • "+ Create new package"
  ├── "Reset all moves" button
  └── Persists edits to localStorage keyed by report generated_at
```

## Embedded data shape

The current snapshot (`reportPackages`, `reportPipes` at lines 7410–7493) is missing fields the ZIP CSV writer needs and fields the renderers need.

### Per pipe — additions

| Field | Why |
|---|---|
| `ratePerM` | CSV column `rate_per_m` |
| `is_c6_addon` | Map render distinguishes C6 add-ons; ZIP CSV unaffected but renderer needs it |
| `criticality_1dp`, `condition_score`, `pipe_priority_score` | Required by `prioritiseAndRenumberReliningPackages` (re-runs after every edit) |
| `xMid`, `yMid` | Map fallback when lat/lon missing |
| `raw.SW_Condition`, `raw.Observed_Condition`, `raw.SW_Material`, `raw.Formatted_Address`, `raw.Pipe_Start_Address`, `raw.SW_Upstream Node`, `raw.SW_Downstream Node` | CSV columns the ZIP writer pulls directly from `raw.*` |

### Per package — additions

| Field | Why |
|---|---|
| `c6_addon_count` | Tile / card display |
| `package_*` priority fields (`package_priority_score`, `package_high_crit_count`, etc.) | Re-prioritisation on edit |
| `coordinate_sources` | Already present, leave |

### Top-level — additions

| Field | Why |
|---|---|
| `c6Pool` (asset id list only) | Optional — needed only if "Show all other C6" toggle is included. If pool data isn't available at export time, omit and hide the toggle. |
| `tool_version` / `provenance` block | Mirrors live tool ZIP provenance. Standalone re-exports stamp `Edited in standalone editor — base report generated <orig>`. |

## Edit semantics

Match the live tool exactly:

1. User selects a pipe and picks a destination package in the Edit Packages tab.
2. In-memory state mutates: pipe's `package_id` updates; manual moves dictionary records `{ pipeAssetId → targetPackageId }`.
3. `applyReliningManualMoves` runs (subset that doesn't depend on the asset register — the snapshot already has every pipe).
4. `prioritiseAndRenumberReliningPackages` runs. Package IDs may shuffle.
5. All views re-render: cards, table, map, edit panel.
6. Manual moves persisted to `localStorage` keyed by report `generated_at` so refresh keeps the work.

The "+ Create new package" option mints `RLN_NEW_<n>` ids that get renumbered into the sequence on the next prioritisation pass.

The header explanation text is shown above the Edit Packages list (and as a tooltip on each pipe row's dropdown) so the renumbering behaviour is not surprising.

## Save Lock File button

Emits a `Blob` containing JSON in the exact shape `loadReliningLocksFile` accepts (`assignments`, `anchorOrigins`, `locks.pipes`, `locks.packages`, `moveOrigins`). No external library required.

Filename: `relining_locks_<original-generated-at>.json`.

## Re-export Work Order Pack ZIP

Runs the same logic as the live tool's `downloadReliningPackagesZip` against the in-memory edited state. Outputs:

- `RLN_NNN_pipes.csv` per package with the same 14-column header (validated)
- `package_summary.txt` and `package_summary.xlsx`
- `file_list.txt` and `file_list.xlsx`
- `provenance.txt` (carries forward original provenance and appends an "Edited in standalone editor on <date> by <name>" line)
- `package_report.html` (a fresh standalone report reflecting the edited state)
- `RLN_NNN_map.html` per package
- `package_maps/RLN_NNN_pipes.kml` per package
- `locks.json` (only if user ticks "Include lock file in ZIP")

Filename: `relining_packages_edited_YYYY-MM-DD.zip` so it doesn't collide with the original.

A small "Edited by" text input appears next to the export button so the provenance line has a name.

## Code organisation

All new code lives inside `buildReliningPackageReportHtml`. The function structure becomes:

```
buildReliningPackageReportHtml(packages, packagedAssets, options, summary)
├── buildSnapshot()            ← expand the embedded JSON snapshot
├── inlineLeaflet              ← <script> string with Leaflet bundled
├── inlineJSZip                ← <script> string with JSZip bundled
├── inlineXLSX                 ← <script> string with SheetJS community build
├── runtimeJs                  ← inlined runtime (single IIFE)
│   ├── render layer  (cards, table, map, edit panel, popups, KPI tiles)
│   ├── edit layer    (move pipe, create package, reset moves, localStorage)
│   ├── lock save     (saveReliningLocksFile)
│   └── zip rebuild   (rebuildReportZip)
└── HTML wrapper string
```

Library bundling: download Leaflet 1.9.x, JSZip 3.x, XLSX 0.20.x as minified text and inline them at build-time of the HTML output. To keep the source `index.html` readable, the three library blobs live in three small constants near the top of `buildReliningPackageReportHtml` rather than being base64-stuffed mid-function.

## Things that change in the live tool

Only the `buildReliningPackageReportHtml` function. The snapshot it produces gets richer; nothing about how it is called from `downloadReliningPackagesZip` changes. No behaviour change for users who don't open the report.

The live tool's `loadReliningLocksFile` does not change — it already accepts the locks shape we will emit.

## Risks

| Risk | Mitigation |
|---|---|
| Bundled libraries grow source `index.html` significantly | Store the three library scripts in separate string constants. The repo already has 14k-line index.html; adding three more big strings at the top of one function is acceptable. |
| Snapshot bloat — every raw column blown into JSON | Whitelist only the raw columns the writer/renderers need (listed above). |
| Renumbering on edit confuses users | Header explanation in Edit Packages tab + per-row tooltip. |
| Drift between standalone renderer and live tool renderer | Accept it. Document in the spec that the standalone is a port, and changes to the live tool's render layer must be mirrored manually if visual parity is wanted. |
| Stale ZIP foot-gun (user re-exports from a snapshot rather than generating fresh) | Provenance line stamps "Edited in standalone editor on <date>"; ZIP filename includes `_edited_`. Live tool flow is the canonical generator. |
| Per-package map HTMLs in re-exported ZIP need same builder | `buildSinglePackageMapHtml` is already a pure function — port directly. |

## Deliverables

1. Updated `buildReliningPackageReportHtml` in `index.html`.
2. Manual smoke test: generate packages in the live tool, open the ZIP's `package_report.html`, verify all panels render, edit a pipe, save lock file, load lock file back into live tool, verify edit persists, regenerate, re-export ZIP from standalone, confirm contents match the spec.
3. Commit and push to `Pluviometrics/nbc:main`.

## Future considerations (not in scope)

- Server-backed real-time multi-user collaboration (deferred; reconsider if council ops need it later).
- A "diff vs original" view in the standalone showing what edits the user made.
- Hosting the report on `report.pluviometrics.com.au` so it can be linked rather than file-attached.
