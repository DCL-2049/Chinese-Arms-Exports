# Made in China

An interactive globe visualization of **Chinese exports of major conventional
weapons, 2000 – 2025**: every delivery in the SIPRI Arms Transfers Database
animated as arcs from China to each recipient, weighted by deal size, with a
country heat map of cumulative transfers.

Open **`index.html`** in any browser — a single self-contained file, no
dependencies, no build step, no network access required.

The story it tells: China opens the century as the developing world's budget
armorer, the JF-17-and-submarines relationship with Pakistan grows to
dominate the map — **Pakistan takes 44% of everything China exports** — and
the 2014+ armed-drone wave reaches the Middle East and Africa where US
manufacturers wouldn't sell.

## Features

- Orthographic globe (drag to rotate, scroll to zoom) and a Pacific-centered
  flat-map view; animated great-circle arcs whose **width and glow scale
  with √TIV** of that recipient-year's deliveries (TIV spans four orders of
  magnitude — √ scaling plus a width cap keeps the Pakistan extreme
  readable).
- Yearly timeline scrubber with play at ½×/1×/2× (full run ≈ 65 s at 1×);
  the density strip is a bar chart of TIV delivered per year, stacked by
  weapon category, and re-scales with the category filter.
- Weapon-category filter: aircraft / ships / missiles / armour (incl.
  artillery) / air defence / sensors / other — folded from SIPRI's
  categories (see data notes).
- Heat-map mode: countries shade with **cumulative TIV received** on a
  validated sequential ramp (√ scale, fixed all-era maximum so color keeps
  meaning while the timeline plays). Recipients absent from the 110m
  polygon set (Bahrain, Seychelles) render as heat dots at their capitals.
- Captions at key moments: the budget-supplier 2000s, the JF-17 program,
  the drone-export era, the naval era.
- Stat tiles: cumulative TIV delivered, recipient count, share to the top
  recipient — all live against the timeline and filter.
- Table view: all 692 Trade Register deals with deliveries 2000–2025 —
  order year, designation and description, numbers ordered vs delivered,
  delivery years, TIV, SIPRI's uncertainty markers (`?`) and comments
  (`i`). Deals ordered in the 1990s with deliveries from 2000 are included;
  their pre-2000 deliveries are outside this project's scope.

## Data

**Source: [SIPRI Arms Transfers Database](https://www.sipri.org/databases/armstransfers)
© SIPRI** (DOI [10.55163/SAFC1241](https://doi.org/10.55163/SAFC1241)),
March 2026 update vintage, retrieved 14 July 2026. Three inputs, all
committed under `data/`:

- `trade_register_china_2000_2025.csv` — the official **Trade Register
  export** from armstransfers.sipri.org (supplier = China, deliveries
  2000–2025): deal-level order years, numbers ordered/delivered, comments.
- `trade_register_china.json` — per-delivery-year values via the
  [Bewelge/globalArmsTransfers](https://github.com/Bewelge/globalArmsTransfers)
  mirror (rebuilt 16 June 2026 from SIPRI's per-year Trade Register
  exports); drives the animation and heat map. The file covers 1954–2025;
  the build uses 2000 onward.
- `sipri_tiv_table_2000_2025.csv` — SIPRI's **TIV import/export tables**
  (supplier = China), the reconciliation baseline.

SIPRI data is free for non-commercial use with attribution; this project
is non-commercial and cites SIPRI as required.

**Reconciliation** (`node tools/build.js` prints it on every rebuild):
the Trade Register export sums to exactly the TIV table's 31,795 TIV m
for 2000–2025; the per-year mirror matches the TIV tables in all 26
overlapping years within rounding tolerance (worst difference 2.0 TIV m)
and in every per-recipient 2000–2025 total.

### Things to know before quoting numbers

- **TIV is not dollars.** SIPRI's trend-indicator value measures the volume
  of military resources transferred (based on production cost and
  capability), not sale prices. Nothing in this visualization is a dollar
  figure, and TIV must not be compared with financial data.
- **Deliveries, not orders.** The animation is dated by *delivery year*,
  using SIPRI's own per-delivery-year TIV allocation — a 2015 order
  delivered 2017–2020 appears as arcs in 2017–2020. Order years and
  numbers ordered appear in the table view.
- **Major conventional weapons only.** SIPRI covers aircraft, ships,
  armoured vehicles, artillery, missiles, air-defence systems, sensors and
  engines — **not small arms**. Chinese small-arms exports are substantial
  but have no comparable time-series dataset, so this undercounts total
  Chinese arms transfers by design.
- **Licensed production counts.** Weapons assembled in the recipient
  country under Chinese licence (e.g. JF-17s at Kamra, Pakistan) are
  transfers in SIPRI's method and are included.
- **Category folding.** SIPRI's armament categories map onto seven filter
  buckets: artillery (towed/self-propelled guns, MRLs, mortars) is folded
  into *armour*; naval weapons, torpedoes and engines into *other*; SAM
  *systems* and anti-aircraft guns are *air defence* while the missiles
  themselves are *missiles*, following SIPRI's own category assignments.
- **Recipient names** follow the mirror's modern-entity consolidation (e.g.
  North and South Yemen appear as Yemen), mapped to Natural Earth ADMIN
  names for the choropleth. Non-state and organisational recipients from
  the register — the African Union (peacekeeping aid) and the United Wa
  State (Myanmar) — are kept as SIPRI records them, flagged `?` in the
  table and drawn as heat dots at a representative point. Deals SIPRI
  attributes to "unknown recipient(s)" appear in the table but not on the
  map.
