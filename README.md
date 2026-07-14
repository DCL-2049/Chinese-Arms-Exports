# Made in China

An interactive globe visualization of **Chinese exports of major conventional
weapons, 1954 – 2025**: every delivery in the SIPRI Arms Transfers Database
animated as arcs from China to each recipient, weighted by deal size, with a
country heat map of cumulative transfers.

Open **`index.html`** in any browser — a single self-contained file, no
dependencies, no build step, no network access required.

The story it tells: Cold-War fraternal deals (Vietnam, North Korea, Albania,
Pakistan), China supplying **both sides** of the Iran–Iraq war in its first
export boom, the quiet 1990s, the JF-17-and-submarines relationship with
Pakistan — which has taken **~33% of everything China has ever exported
(~44% since 2000)** and dominates the map — and the 2014+ armed-drone wave
across the Middle East and Africa.

## Features

- Orthographic globe (drag to rotate, scroll to zoom) and a Pacific-centered
  flat-map view; animated great-circle arcs whose **width and glow scale
  with √TIV** of that recipient-year's deliveries (TIV spans four orders of
  magnitude — √ scaling plus a width cap keeps the Pakistan extreme
  readable).
- Yearly timeline scrubber with play at ½×/1×/2× (full run ≈ 72 s at 1×);
  the density strip is a bar chart of TIV delivered per year, stacked by
  weapon category, and re-scales with the category filter.
- Weapon-category filter: aircraft / ships / missiles / armour (incl.
  artillery) / air defence / sensors / other — folded from SIPRI's
  categories (see data notes).
- Heat-map mode: countries shade with **cumulative TIV received** on a
  validated sequential ramp (√ scale, fixed all-era maximum so color keeps
  meaning while the timeline plays). Recipients absent from the 110m
  polygon set (Bahrain, Seychelles) render as heat dots at their capitals.
- Captions at key moments: Mao-era fraternal arms, the Iran–Iraq war, the
  post-Tiananmen slump, the JF-17 program, the drone-export era, the naval
  era.
- Stat tiles: cumulative TIV delivered, recipient count, share to the top
  recipient — all live against the timeline and filter.
- Table view: all 925 recipient × weapon rows — delivery years, designation
  and description, numbers delivered, TIV.

## Data

**Source: [SIPRI Arms Transfers Database](https://www.sipri.org/databases/armstransfers)
© SIPRI** (DOI [10.55163/SAFC1241](https://doi.org/10.55163/SAFC1241)),
Trade Register delivery values, supplier = China, all recipients, 1950–2025
(March 2026 update vintage). Retrieved 14 July 2026 via the
[Bewelge/globalArmsTransfers](https://github.com/Bewelge/globalArmsTransfers)
mirror (rebuilt 16 June 2026 from SIPRI's per-year Trade Register exports);
the China subset with provenance is committed at
`data/trade_register_china.json`. SIPRI data is free for non-commercial use
with attribution; this project is non-commercial and cites SIPRI as
required.

**Reconciliation.** `tools/build.js` reconciles the register against
SIPRI's own TIV import/export tables (supplier = China, exported from
armstransfers.sipri.org on 14 July 2026, committed at
`data/sipri_tiv_table_2000_2025.csv`): all 26 overlapping years match
within rounding tolerance (worst per-year difference −6.3 TIV m of a
2,745 TIV m year), and per-recipient 2000–2025 totals all match except the
African Union's 14 TIV m (0.04% of the total), which the mirror folds
away. Rebuild with `node tools/build.js` (template + data → `index.html`).

### Things to know before quoting numbers

- **TIV is not dollars.** SIPRI's trend-indicator value measures the volume
  of military resources transferred (based on production cost and
  capability), not sale prices. Nothing in this visualization is a dollar
  figure, and TIV must not be compared with financial data.
- **Deliveries, not orders.** Everything is dated by *delivery year*, using
  SIPRI's own per-delivery-year TIV allocation — a 2015 order delivered
  2017–2020 appears in 2017–2020. The mirror's compact schema drops SIPRI's
  deal-ID/order-year metadata, so the table view shows delivery years and
  numbers delivered rather than ordered-vs-delivered; re-exporting the full
  Trade Register from SIPRI's site and extending `tools/build.js` would
  restore those columns.
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
- **Recipient names** are the mirror's modern-entity consolidation (e.g.
  North and South Yemen appear as Yemen, transfers to the DDR-era entities
  under today's names), mapped to Natural Earth ADMIN names for the
  choropleth.
