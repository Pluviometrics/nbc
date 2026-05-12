# NBC Web Tool — Capability Inventory

**Audit target:** `nbc/index.html` (current branch, ~50k lines, ~3 MB)

**Audit framing:** This document is a pure current-state inventory of the
relining (and adjacent) packaging features inside `nbc/index.html`. It used
to also compare against a Streamlit prototype on a local drive
(`D:\Packaging\scripts\…`) and an older monolithic `index.html`; those
cross-references have been dropped because they are not reproducible from
this repo. Each row now records only what the current web tool actually
does, and any gap is described as a self-contained "missing" or
"partial" — not as a parity gap against an external tool.

**Audit scope:** read-only verification against the current source.

---

## Summary table

| # | Area | Status |
|---|---|---|
| 1 | Input handling | PARTIAL |
| 2 | Costing logic | PRESENT |
| 3 | Package generation | PRESENT (relining only) |
| 4 | Proximity / clustering | PRESENT |
| 5 | Top-up logic | PRESENT |
| 6 | Priority logic | PRESENT |
| 7 | Manual editing workflow | PRESENT |
| 8 | ZIP / output generation | PRESENT |
| 9 | Forward works compatibility | PRESENT |
| 10 | UI inventory | PARTIAL |

---

## 1. Input handling

| Item | Status | Notes |
|---|---|---|
| Asset CSV upload | PRESENT | `loadReliningAssetsFile` at `index.html:8373`; control `#pkgAssetsFile` at line 924 |
| Rates upload (XLSX) | PRESENT | `loadReliningRatesFile` at line 8418; control `#pkgRatesFile` at line 928; reads `_Tables`-style sheets, filters `SP6 Pipeline Relining` rows |
| Required column mapping | PRESENT | `resolveSuburbColumn` (line 4535), `getReliningDiameterValue` (4642), `getReliningLengthValue` (4659), `getValueByAliases` (17821) — alias chains cover the common asset-register dialects |
| Condition filtering | PRESENT | `#pkgReliningMode` selector (line 941) → `getReliningRowsForMode` (4736) supports Cond 8 only, Cond 7 only, Cond 7+8, and Cond 6/7/8 (with C6 add-ons) |
| Diameter filtering | PARTIAL | Hard-coded floor `MIN_RELINING_DIAMETER_MM = 300` (line 1885) silently drops anything <300 mm; no UI to override. Impact: small-diameter relining candidates are excluded even if a rate exists. Recommended fix: drop the floor and rely on rate-match failure, or expose as a UI input. |
| Suburb / LGA filtering | PARTIAL | Suburb is *resolved* (alias chain + address parsing in `resolveReliningSuburb` at line 4922) but cannot be *filtered on* by the user. Likely OK in practice — included here as an inventory gap, not a defect. |
| Length and cost calculations | PRESENT | `normaliseReliningCandidateRow` line 4936 computes `lengthM`, `ratePerM`, `pipeCost` |

---

## 2. Costing logic

| Item | Status | Notes |
|---|---|---|
| Relining costing | PRESENT | `getReliningRateInfoForRow` line 4677; matches diameter, length band, then median/lowest/vendor across panel rows |
| Reconstruction costing | **MISSING** | No SP7 lookup, no reconstruction rate engine. Only RLN flow exists. Impact: web tool cannot quote reconstruction works. |
| Amplification costing | **MISSING** | No AMP rate engine. |
| SP6 / rate lookup behaviour | PRESENT | `getReliningRateInfoForRow` parses descriptors, length bands, supports `costMode = median \| lowest \| contractor` |
| Provisional traffic-control allowance (+$2,000/pipe) | PRESENT | `#pkgTrafficControl` checkbox (line 1049, default checked) is wired into `getReliningPackagingOptions` (line 4809: `trafficControl: document.getElementById('pkgTrafficControl')?.checked !== false`). Adds +$2,000 in `normaliseReliningCandidateRow` (line 4951) and in `_recostLockedPackages` (line 8583). |
| Project-initiation multiplier (×1.15) | PRESENT | `#pkgInitiation` checkbox (line 1053, default checked) is wired into `getReliningPackagingOptions` (line 4810: `projectInitiation: document.getElementById('pkgInitiation')?.checked !== false`). Multiplies pipeCost by 1.15 in the same two places (lines 4952 and 8584). |
| Cost-mode selector (median / lowest / contractor) | **MISSING (UI)** | Algorithm supports all three modes inside `getReliningRateInfoForRow` (line 4700 onwards), but `getReliningPackagingOptions` hard-codes `costMode: 'median'` and `contractor: null` (lines 4807–4808). No `#pkgCostMode` or contractor dropdown exists. Impact: cannot generate vendor-specific or lowest-price quotes without changing source. |
| Reconstruction breakdown columns | **MISSING** | Not applicable until reconstruction stream exists. |

---

## 3. Package generation

| Item | Status | Notes |
|---|---|---|
| Count-based packaging | PRESENT (relining only) | `splitReliningItemsByCount` line 5298 |
| Value-based packaging | PRESENT (relining only) | `splitReliningItemsByValue` line 5463 → wraps `splitIntoValuePackagesTwoPass` |
| Two-pass value packaging | PRESENT (relining only) | `splitIntoValuePackagesTwoPass` line 5353; resolved-groups pass + adjacent-fill |
| Package numbering rules | PRESENT | `RLN_001`, zero-padded width 3, sequential after priority renumber (line 5773) |
| RLN_ prefix | PRESENT | Hard-coded throughout |
| REC_ prefix | **MISSING** | No reconstruction packaging path exists. |
| AMP_ prefix | **MISSING** | No amplification packaging path exists. |
| Highest-priority package = RLN_001 | PRESENT | `prioritiseAndRenumberReliningPackages` (line 5773) sorts by `package_priority_score` and renumbers from 001; called from `generateReliningPackages` at lines 8701 / 8710 / 8716 |
| Suburb grouping | PRESENT | `groupReliningItemsForPackaging` line 5348; controlled by `#pkgGroupSuburb` |
| Diameter grouping | PRESENT | `getReliningDiamSizeKey` line 5038; size-group-1..4 inputs render at lines 1003–1034 |
| Four selectable pipe-size grouping boxes | PRESENT | Groups 1–4 multi-select pills in HTML; `reliningSizeGroups = [[], [], [], []]` (line 1898); `addReliningSizeToGroup` at line 5079 |
| Compatible diameter rules | PRESENT | `DIAMETER_COMPATIBLE_PAIRS` (line 1887) covers (300/375, 375/450, 450/525, 525/600, 600/750, 750/825, 825/900, 900/1050) |
| All sizes ≥1050 mutually compatible | PRESENT | `diametersCompatible` line 5329 returns `true` when both ≥ `DIAMETER_LARGE_THRESHOLD = 1050` (line 1897) |

---

## 4. Proximity / clustering

| Item | Status | Notes |
|---|---|---|
| Haversine lat/lon distance | PRESENT | `haversineDistanceM` line 15514 |
| Cluster centre / centroid logic | PRESENT | `meanCoordinate` line 15524; centroid recomputed on each trim pass |
| Radius-based package creation | PRESENT | `assignReliningClusters` (5238) → `buildReliningSpatialCluster` (5191); selectable radius via `#pkgGroupingMethod` (line 973), proxy values 250/500/1000/2000/3000 m |
| Centroid-radius trimming | PRESENT | `finaliseReliningCluster` (5168) loops trimming any item past radius and recomputing centroid |
| `enforceReliningPackageRadius` safety sweep | PRESENT | line 5591, called twice in `generateReliningPackages` — after top-up (line 8677) and after the final renumber (line 8702) |
| Top-up proximity rejection | PRESENT | `topupReliningPackages` line 5643; tentative-add + recompute centroid + reject if past radius |
| No pipes outside selected radius unless explicitly allowed | PRESENT | Enforced by trimming and final sweep |
| No LGA-wide package grabbing | PRESENT | `groupReliningItemsForPackaging` (line 5348) gates by suburb or `_cluster` only |

This block is the c81e55b proximity fix and is correctly implemented. **Do not modify.**

---

## 5. Top-up logic

| Item | Status | Notes |
|---|---|---|
| Enabled for relining (value packages) | PRESENT | `topupReliningPackages` line 5643; gated by `options.method !== 'count'` |
| Enabled for amplification | **MISSING** | No AMP path exists. |
| Disabled for reconstruction | PRESENT-by-omission | (Reconstruction packaging path also doesn't exist.) |
| Same-condition top-up | PRESENT | First top-up pass at `generateReliningPackages` line 8665 over `preview.costed` |
| Same-condition-first then lower-condition pool | PRESENT | Lines 8666–8673 — when topup mode is *Same condition first, lower condition if needed*, a second preview is built at the opposite condition and topped up again |
| Same-suburb / compatible-diameter constraints | PRESENT | Enforced inside `topupReliningPackages` (`pkgGroup` check + size-group membership) |
| Cheapest fitting pipes first | PRESENT | Sorted ascending by `pipeCost` inside `topupReliningPackages` |
| `topup` flag preserved in outputs | PRESENT | Flag is set on the in-memory candidate in `topupReliningPackages` (line 5672: `{ ...candidate, topup: true }`) and surfaced as a `topup` column in `exportReliningPackagesCsv` (header at line 8842, value at line 8869, emitting `'true'` for top-ups and `'false'` otherwise). |
| `topup` flag in per-package XLSX | **MISSING** | The per-package XLSX (`buildStyledPackageWorkbook` line 13755) does not include a column for `topup`. Recommended fix optional: add a column to the styled workbook if contractors need to see which pipes were top-ups in the XLSX deliverable. |

---

## 6. Priority logic

| Item | Status | Notes |
|---|---|---|
| `condition_score` uses raw `SW_Condition` | PRESENT | `addPackagePriority` line 5710–5711 reads `SW_Condition` via alias and clamps to ≥0 |
| Pipe priority calculation | PRESENT | `pipe_priority_score = condition_score × diameter_weight × (1 + criticality_1dp) × (isC6 ? 0.25 : 1)` (line 5714) — the C6 dampener is newer than the original audit |
| Package priority calculation | PRESENT | `package_priority_score = total_pipe_priority + 1×max_pipe_priority + 5×high_crit_count + 3×large_diam_count + 4×xlarge_diam_count + 2×worst_condition` (lines 5734–5739) — the `max_pipe_priority` and `xlarge_diam_count` terms are new since the original audit |
| Package sorting by priority | PRESENT | `reliningPackagePriorityCompare` line 5687 |
| RLN_001 assigned to highest-priority package | PRESENT | `prioritiseAndRenumberReliningPackages` line 5773 |
| Equivalent priority engine for REC / AMP | **MISSING** | (Streams don't exist on the web side.) |

This block is consistent with the c81e55b restoration. **Do not modify.**

---

## 7. Manual editing workflow

| Item | Status | Notes |
|---|---|---|
| Ability to view packages | PRESENT | `renderGeneratedPackages` line 7906, table + map |
| Move assets between packages | PRESENT | "Edit Packages" subtab (`reliningSubtabEdit` at line 915, `switchReliningSubtab` at line 6975) provides per-pipe move, manual-locks state in `reliningManualMoves`, and a settings-change warning panel (`#pkgSettingsChangedWarning` at line 7948) |
| Recost packages after edits | PRESENT | `_recostLockedPackages` (line 8569) re-runs `getReliningRateInfoForRow` and re-applies the trafficControl + projectInitiation modifiers against the current rate table |
| Lock / unlock per-pipe and per-package | PRESENT | `isReliningPipeLocked`, `isReliningPackageLocked`, `lockReliningPipe`, `lockReliningPackage` (around line 6293–6360) |
| Export / import session state | PRESENT | `exportNbcStateToFile` line 6871; `importNbcStateFromFile` line 6885; load locks from JSON or ZIP via `loadReliningLocksFile` (line 6716); clear all via `clearAllReliningLocks` (line 6842) |
| Preserve package IDs correctly | PRESENT | `buildReliningPackageObject` line 5533 preserves `original_package_id` and `anchor_id` through edits and recosts |

---

## 8. ZIP / output generation

| Item | Status | Notes |
|---|---|---|
| JSZip import / setup | PRESENT | `JSZip` guard at line 14110; `new JSZip()` at line 14155 |
| Valid ZIP generation | PRESENT | `generateAsync({type:'blob'})` inside `downloadReliningPackagesZip` |
| Async `zip.generateAsync` handling | PRESENT | awaited; followed by ZIP-roundtrip validation that fails closed if any expected entry is missing |
| Per-package XLSX files | PRESENT | One `${pkg.package_id}_pipes.xlsx` per package, built via `buildStyledPackageWorkbook` (line 13755) |
| `package_summary.txt` | PRESENT | Emitted from `downloadReliningPackagesZip` (around line 14258) |
| `file_list.txt` | PRESENT | Emitted alongside `package_summary.txt` |
| `provenance.txt` | PRESENT | Single canonical audit record (also embedded in summary + file_list headers) |
| `package_summary.xlsx` / `file_list.xlsx` | PRESENT | Plain ExcelJS workbooks added alongside the .txt versions |
| `package_report.html` | PRESENT | Standalone shareable read-only HTML report built by `buildReliningPackageReportHtml` (line 8900) |
| Per-package map HTML files | PRESENT | Generated under `package_maps/` inside the ZIP |
| `locks.json` (opt-in) | PRESENT | Only included when `#pkgIncludeLocks` (line 893) is checked |
| `relining_packages.zip` filename | PARTIAL | Download filename is `relining_packages_${date}.zip` (line 14357), not a plain `relining_packages.zip`. Impact: callers that consume the ZIP by literal filename must rename or pattern-match. Recommended fix optional: drop the date suffix. |
| `reconstruction_packages.zip` | **MISSING** | No REC stream. |
| `amplification_packages.zip` | **MISSING** | No AMP stream. |
| `exportReliningPackagesCsv` (ESRI CSV) | PRESENT | Single-file per-pipe CSV writer at line 8823. Headers at lines 8831–8854 include `topup` (new). Download filename `relining_packages_esri_${date}.csv` (line 8885). |
| Currency formatting | PRESENT | XLSX styled workbook handles its own currency rendering; HTML reports use a local `fmtCurrency` helper |
| Internal `_` columns removed from outputs | PRESENT-by-default | Output writers never *add* `_`-prefixed columns, so nothing needs filtering |

---

## 9. Forward works compatibility

| Item | Status | Notes |
|---|---|---|
| Bridge from relining packages → future-works rows | PRESENT | `mapReliningPackagesToFutureWorksRows` line 8246; consumed by `loadFutureWorksFromRelining` (line 8326) and the "Load Latest Relining Packages" button (line 1235) |
| Import existing forward-works workbook | PRESENT | `importForwardWorksWorkbook` line 8078 reads `.xlsx/.xls/.xlsm`; additional importers `importFutureWorksFile` (line 8208) and `importFutureWorksExtra` (line 8100) cover CSV/JSON/Workbook input |
| Export forward-works CSV | PRESENT | `exportFutureWorksCsv` line 8337; download button at line 1236 |
| Per-pipe CSV columns required by downstream forward-works tooling | PRESENT | `package_id`, `Asset Suburb`, `Pipe_Start_Address`, `Asset`, `pipe_cost`, `topup` all present in `exportReliningPackagesCsv` |

---

## 10. UI inventory

Inputs visible on the Relining subpage (`#page-relining`, line 884):

- File pickers: `#pkgAssetsFile` (924), `#pkgRatesFile` (928)
- Mode + method: `#pkgReliningMode` (941), `#pkgMethod` (950)
- Targets: `#pkgMaxValue` (958), `#pkgPipeCount` (962)
- Grouping: `#pkgGroupSuburb` (966), `#pkgGroupingMethod` (973)
- Size groups: `size-group-1..4-select` + `_pills` (1003–1034)
- Top-up radios: `pkgTopupMode` (1040–1042) inside `#pkgTopupRow` (1037)
- Cost modifiers: `#pkgTrafficControl` (1049, default checked), `#pkgInitiation` (1053, default checked) inside `#pkgCostAdjustmentsRow` (1045)
- Actions: `#pkgPreviewBtn` (984), `#pkgGenerateBtn` (990)
- Output: results table + `#reliningPackagesMap` (line 1090)
- Session controls: `#pkgIncludeLocks` (893), Load Locks (898), Clear All Locks (902), Export State (903), Import State (904)
- Subtabs: `reliningSubtabMain` (914), `reliningSubtabEdit` (915), switched via `switchReliningSubtab` (6975)

| Item | Status | Notes |
|---|---|---|
| All cost / packaging controls expose their underlying option | PRESENT | Every control above is wired into `getReliningPackagingOptions` (line 4784) or `renderReliningPackagingReasoning` (line 7769) |
| Missing controls | PARTIAL | No `#pkgCostMode` (median/lowest/contractor) or contractor selector. No reconstruction / amplification controls. |
| Missing output panels | PARTIAL | No REC or AMP results panels. The Relining map (`#reliningPackagesMap`, line 1090) and per-package map HTML pages (`buildReliningPackageReportHtml`, 8900) are present. |
| Renamed / breaking control IDs | NONE | All public IDs (`pkgMethod`, `pkgMaxValue`, `pkgReliningMode`, etc.) are stable across recent commits. |

---

## Do not change these

The following items represent the c81e55b proximity-fix work plus
subsequent web-only additions. They are correctness-critical or
intentional web-only extensions; ports / refactors must not regress them:

- **c81e55b proximity fixes (whole block):** `finaliseReliningCluster` (5168), `buildReliningSpatialCluster` (5191), `assignReliningClusters` (5238), `enforceReliningPackageRadius` (5591), the proximity-rejection logic inside `topupReliningPackages` (5643)
- **Haversine distance** — `haversineDistanceM` line 15514
- **Centroid-radius trimming** — `finaliseReliningCluster` line 5168 (iterative trim until centroid stabilises)
- **`enforceReliningPackageRadius` safety sweep** — line 5591, called twice (after top-up and after final renumber)
- **Top-up proximity rejection** — inside `topupReliningPackages` (5643): tentative-add then recompute-centroid then reject if past radius
- **`condition_score` derived from raw `SW_Condition` alias** — `addPackagePriority` line 5710–5711
- **Diameter-pair rules and `getSizeGroup`** — `DIAMETER_COMPATIBLE_PAIRS` (1887), `DIAMETER_LARGE_THRESHOLD` (1897), `diametersCompatible` (5329), `getSizeGroup` (5340)
- **Island single-pipe forcing** — `forceIslandSinglePipePackages` line 7582 (Scotland Island carve-out)
- **Per-package map with selection / overlay / leader line** — `renderGeneratedPackages` line 7906 and downstream map plumbing
- **`package_summary.txt`, `file_list.txt`, `provenance.txt`, `package_summary.xlsx`, `file_list.xlsx`** in the ZIP — `downloadReliningPackagesZip` (14103)
- **`renderReliningPackagingReasoning`** narrative panel — line 7769
- **Future Works workflow** — `mapReliningPackagesToFutureWorksRows` (8246), `loadFutureWorksFromRelining` (8326), `exportFutureWorksCsv` (8337), `importForwardWorksWorkbook` (8078)
- **Edit Packages subtab + locks system** — `reliningManualMoves`, lock helpers around 6293–6360, `_recostLockedPackages` (8569)
- **CCTV packaging stream** — `buildCctvPackagingPreview` (15499), `buildCctvPackagesPortable` (15593), `consolidateSmallCctvPackages` (15888), `downloadCctvPackagesZip` (16206), `generateCctvPackages` (16799)
- **Branding / logo / hub home / Stormgauge launcher routing** — preserve as-is

---

## Recommended fix priority

If/when further edits are authorised, the remaining high-impact gaps (in order) are:

1. **Expose cost-mode and contractor selectors** (§2). Algorithm already supports `median / lowest / contractor` modes — only the input wiring is missing in `getReliningPackagingOptions` (currently hard-coded `costMode: 'median'`, `contractor: null` at lines 4807–4808).
2. **Drop the date suffix from the ZIP filename** (§8) so the file drops straight into downstream tooling that expects a literal `relining_packages.zip`.
3. **Add a `topup` column to the per-package XLSX** (§5) — already in the ESRI CSV; the XLSX deliverable is the one contractors actually see.
4. **Reconstruction & amplification streams** — only worth doing if these works are intended to migrate out of an external tool. Large port.
