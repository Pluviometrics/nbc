# Input file schemas

This document describes the input files the NBC packaging/relining tool consumes.

## 1. Asset register CSV

Exported from Intramaps / TechnologyOne CiA. One row per stormwater pipe segment.

### Required columns (canonical names)

| Column | Description | Example |
|---|---|---|
| `Asset_Number` | Primary key | `SWP123456` |
| `Old_TechOne_ID` | Legacy T1 identifier (used for CiA deep links) | `12345` |
| `SW_Upstream_Node` | Upstream pit ID | `SWN045123` |
| `SW_Downstream_Node` | Downstream pit ID | `SWN045124` |
| `SW_Condition` | Condition score 1–5 (5 = worst) | `4` |
| `SWP_Pipe Diameter_mm` | Pipe internal diameter, mm | `375` |
| `Spatial Length_m` | GIS pipe length, metres | `28.4` |
| `SWP_Material` | Pipe material | `RCP`, `VC`, `PVC` |
| `Address` | Street address (for sorting / map labels) | `12 Smith St, Manly` |
| `Easting`, `Northing` | MGA Zone 56 coordinates (EPSG:28356) | `345678.9, 6256789.1` |

### Accepted aliases

The loader accepts these alternate column names (case-insensitive, whitespace-tolerant):

- `SW_Upstream_Node` ↔ `Upstream_Node`, `US_Pit`, `Upstream Pit`
- `SW_Downstream_Node` ↔ `Downstream_Node`, `DS_Pit`, `Downstream Pit`
- `SWP_Pipe Diameter_mm` ↔ `Diameter_mm`, `Diameter`, `Pipe_Diameter`
- `Spatial Length_m` ↔ `Length_m`, `GIS_Length`, `Pipe_Length`
- `Old_TechOne_ID` ↔ `TechOne_ID`, `T1_ID`
- `Address` ↔ `Street_Address`, `Site_Address`

> **Lessons-learned note:** NBC export historically labels pits `SW_Upstream_Node` / `SW_Downstream_Node` — never `US_Pit` / `DS_Pit` despite some aliasing tools assuming so.

## 2. Panel rates XLSX

Contractor rate card — supplied by procurement.

- **File:** `Panel_Rates_<vendor>_<year>.xlsx`
- **Sheet:** `Rates` (first sheet by default; named-sheet preferred)
- **Required columns:**
  - `Diameter_mm` — integer pipe diameter
  - `Liner_Type` — `CIPP`, `Spiral`, etc.
  - `Rate_per_m` — AUD per linear metre
  - `Mobilisation` — fixed mobilisation fee, AUD
  - `Min_Length_m` — minimum chargeable length

The packaging engine joins on `Diameter_mm` + `Liner_Type`.

## 3. Sample fixtures

No sample fixtures are currently committed. When adding regression coverage, place synthetic fixtures under `docs/fixtures/` and keep real council exports out of Git unless they have been approved and scrubbed.

## 4. Common gotchas

- **Address column variants:** users sometimes export with `Site_Address` or with no address column at all; tool falls back to coordinate-based labels.
- **Condition score range:** must be 1–5. Some legacy exports use 0–4 — these get coerced to 1–5 with a warning toast.
- **MGA Z56 coordinates:** always EPSG:28356 (NOT 32756, which is UTM). The packaging tool's coordinate transform expects 28356 for ArcGIS layer compatibility.
- **CSV encoding:** UTF-8 with BOM is fine; UTF-16 will break parsing — re-export as CSV (UTF-8).
- **Empty cells:** `null`/blank in `SW_Condition` filters the row out of relining candidacy (not "score 0").
