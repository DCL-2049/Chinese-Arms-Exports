#!/usr/bin/env node
/* Build index.html from template.html + SIPRI data.
 *
 * Inputs:
 *   data/trade_register_china.csv  — SIPRI Trade Register export, supplier = China.
 *     Modern schema (one row per deal-ID × delivery year):
 *     SIPRI AT Database ID,Supplier,Recipient,Designation,Description,Armament category,
 *     Order date,Order date is estimate,Numbers delivered,Numbers delivered is estimate,
 *     Delivery year,Delivery year is estimate,Status,SIPRI estimate,TIV deal unit,
 *     TIV delivery values,Local production
 *   data/sipri_tiv_table_2000_2025.csv — SIPRI TIV tables (recipient × year) for cross-check.
 *   data/ne_land_110m.json, data/ne_countries_110m.json — Natural Earth geometry.
 *
 * Output: index.html (single self-contained file).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* ---------------- CSV parsing (handles quoted fields) ---------------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ---------------- category mapping: SIPRI armament category -> 7 buckets ---------------- */
const CATMAP = {
  "aircraft": "aircraft",
  "ships": "ships",
  "missiles": "missiles",
  "armoured vehicles": "armour",
  "artillery": "armour",
  "air defence systems": "airdef",
  "sensors": "sensors",
  "naval weapons": "other",
  "anti-submarine warfare weapons": "other",
  "engines": "other",
  "satellites": "other",
  "armoured vehicle": "armour",
  "air defence system": "airdef",
  "other": "other",
};
function mapCat(c) {
  const k = c.trim().toLowerCase();
  if (CATMAP[k]) return CATMAP[k];
  console.warn("  ! unmapped armament category:", JSON.stringify(c), "-> other");
  return "other";
}

/* ---------------- recipient canonicalization + capitals ----------------
 * key: SIPRI recipient name (after alias folding)
 * ne:  Natural Earth 110m ADMIN name (null -> heat dot at capital only)
 * fl:  note for non-state / special recipients (shown as ? flag in table)
 */
const ALIAS = {
  "Cote d'Ivoire": "Côte d'Ivoire", "Cote dIvoire": "Côte d'Ivoire",
  "Turkiye": "Türkiye", "Turkey": "Türkiye",
  "UAE": "United Arab Emirates",
  "Viet Nam": "Vietnam",
  "Kampuchea": "Cambodia (Khmer Rouge era)",
  "Burma": "Myanmar",
  "Zaire": "DR Congo", "Congo, DR": "DR Congo", "Congo, Democratic Republic": "DR Congo",
  "Congo, Republic": "Congo",
  "Korea, North": "North Korea", "Korea North": "North Korea",
  "Korea, South": "South Korea",
  "Yemen, North": "North Yemen", "Yemen Arab Republic": "North Yemen",
  "Yemen, South": "South Yemen", "South Yemen (PDRY)": "South Yemen",
  "Tanzania, United Republic of": "Tanzania",
  "Lao PDR": "Laos", "Laos PDR": "Laos",
  "Brunei Darussalam": "Brunei",
  "Timor Leste": "Timor-Leste", "East Timor": "Timor-Leste",
  "Macedonia": "North Macedonia",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
};
const canon = (r) => ALIAS[r.trim()] || r.trim();

const RECIPIENTS = {
  /* --- Asia --- */
  "Pakistan":       { lat: 33.69, lon: 73.06, ne: "Pakistan" },
  "Bangladesh":     { lat: 23.81, lon: 90.41, ne: "Bangladesh" },
  "Myanmar":        { lat: 19.75, lon: 96.10, ne: "Myanmar" },
  "Thailand":       { lat: 13.76, lon: 100.50, ne: "Thailand" },
  "Iran":           { lat: 35.69, lon: 51.39, ne: "Iran" },
  "Iraq":           { lat: 33.31, lon: 44.37, ne: "Iraq" },
  "Sri Lanka":      { lat: 6.93,  lon: 79.85, ne: "Sri Lanka" },
  "Indonesia":      { lat: -6.19, lon: 106.82, ne: "Indonesia" },
  "Malaysia":       { lat: 3.14,  lon: 101.69, ne: "Malaysia" },
  "Cambodia":       { lat: 11.56, lon: 104.92, ne: "Cambodia" },
  "Cambodia (Khmer Rouge era)": { lat: 11.56, lon: 104.92, ne: null, fl: "Deliveries to Democratic Kampuchea / Khmer Rouge government" },
  "Laos":           { lat: 17.97, lon: 102.60, ne: "Laos" },
  "Vietnam":        { lat: 21.03, lon: 105.85, ne: "Vietnam" },
  "North Korea":    { lat: 39.03, lon: 125.75, ne: "North Korea" },
  "Nepal":          { lat: 27.72, lon: 85.32, ne: "Nepal" },
  "Afghanistan":    { lat: 34.53, lon: 69.17, ne: "Afghanistan" },
  "Mujahedin (Afghanistan)*": { lat: 34.53, lon: 69.17, ne: null, fl: "Non-state: Afghan Mujahedin forces" },
  "Timor-Leste":    { lat: -8.56, lon: 125.57, ne: "East Timor" },
  "Philippines":    { lat: 14.60, lon: 120.98, ne: "Philippines" },
  "Mongolia":       { lat: 47.89, lon: 106.91, ne: "Mongolia" },
  "Kazakhstan":     { lat: 51.13, lon: 71.43, ne: "Kazakhstan" },
  "Uzbekistan":     { lat: 41.31, lon: 69.24, ne: "Uzbekistan" },
  "Turkmenistan":   { lat: 37.95, lon: 58.38, ne: "Turkmenistan" },
  "Tajikistan":     { lat: 38.56, lon: 68.77, ne: "Tajikistan" },
  "Kyrgyzstan":     { lat: 42.87, lon: 74.59, ne: "Kyrgyzstan" },
  "Azerbaijan":     { lat: 40.41, lon: 49.87, ne: "Azerbaijan" },
  "Armenia":        { lat: 40.18, lon: 44.51, ne: "Armenia" },
  "Georgia":        { lat: 41.72, lon: 44.79, ne: "Georgia" },
  "United Wa State (Myanmar)*": { lat: 22.17, lon: 99.18, ne: null, fl: "Non-state: United Wa State Army, Myanmar" },
  "Bhutan":         { lat: 27.47, lon: 89.64, ne: "Bhutan" },
  /* --- Middle East --- */
  "Saudi Arabia":   { lat: 24.71, lon: 46.68, ne: "Saudi Arabia" },
  "United Arab Emirates": { lat: 24.45, lon: 54.38, ne: "United Arab Emirates" },
  "Qatar":          { lat: 25.29, lon: 51.53, ne: "Qatar" },
  "Kuwait":         { lat: 29.38, lon: 47.99, ne: "Kuwait" },
  "Bahrain":        { lat: 26.23, lon: 50.59, ne: null },
  "Oman":           { lat: 23.59, lon: 58.41, ne: "Oman" },
  "Jordan":         { lat: 31.95, lon: 35.93, ne: "Jordan" },
  "Syria":          { lat: 33.51, lon: 36.29, ne: "Syria" },
  "Lebanon":        { lat: 33.89, lon: 35.50, ne: "Lebanon" },
  "Israel":         { lat: 32.08, lon: 34.78, ne: "Israel" },
  "Türkiye":        { lat: 39.93, lon: 32.86, ne: "Turkey" },
  "North Yemen":    { lat: 15.37, lon: 44.19, ne: null, fl: "Yemen Arab Republic (pre-1990 unification)" },
  "South Yemen":    { lat: 12.79, lon: 45.02, ne: null, fl: "People's Democratic Republic of Yemen (pre-1990)" },
  "Yemen":          { lat: 15.37, lon: 44.19, ne: "Yemen" },
  /* --- Africa --- */
  "Algeria":        { lat: 36.75, lon: 3.06, ne: "Algeria" },
  "Egypt":          { lat: 30.04, lon: 31.24, ne: "Egypt" },
  "Libya":          { lat: 32.89, lon: 13.19, ne: "Libya" },
  "Morocco":        { lat: 34.02, lon: -6.83, ne: "Morocco" },
  "Tunisia":        { lat: 36.81, lon: 10.18, ne: "Tunisia" },
  "Sudan":          { lat: 15.50, lon: 32.56, ne: "Sudan" },
  "South Sudan":    { lat: 4.86,  lon: 31.57, ne: "South Sudan" },
  "Ethiopia":       { lat: 9.03,  lon: 38.74, ne: "Ethiopia" },
  "Eritrea":        { lat: 15.34, lon: 38.93, ne: "Eritrea" },
  "Somalia":        { lat: 2.05,  lon: 45.32, ne: "Somalia" },
  "Djibouti":       { lat: 11.59, lon: 43.15, ne: "Djibouti" },
  "Kenya":          { lat: -1.29, lon: 36.82, ne: "Kenya" },
  "Tanzania":       { lat: -6.16, lon: 35.75, ne: "United Republic of Tanzania" },
  "Uganda":         { lat: 0.35,  lon: 32.58, ne: "Uganda" },
  "Rwanda":         { lat: -1.95, lon: 30.06, ne: "Rwanda" },
  "Burundi":        { lat: -3.38, lon: 29.36, ne: "Burundi" },
  "DR Congo":       { lat: -4.32, lon: 15.31, ne: "Democratic Republic of the Congo" },
  "Congo":          { lat: -4.26, lon: 15.24, ne: "Republic of the Congo" },
  "Cameroon":       { lat: 3.85,  lon: 11.50, ne: "Cameroon" },
  "Nigeria":        { lat: 9.06,  lon: 7.50, ne: "Nigeria" },
  "Niger":          { lat: 13.51, lon: 2.11, ne: "Niger" },
  "Chad":           { lat: 12.13, lon: 15.06, ne: "Chad" },
  "Central African Republic": { lat: 4.36, lon: 18.56, ne: "Central African Republic" },
  "Gabon":          { lat: 0.39,  lon: 9.45, ne: "Gabon" },
  "Equatorial Guinea": { lat: 3.75, lon: 8.78, ne: "Equatorial Guinea" },
  "Ghana":          { lat: 5.56,  lon: -0.20, ne: "Ghana" },
  "Benin":          { lat: 6.50,  lon: 2.60, ne: "Benin" },
  "Togo":           { lat: 6.13,  lon: 1.22, ne: "Togo" },
  "Burkina Faso":   { lat: 12.37, lon: -1.52, ne: "Burkina Faso" },
  "Mali":           { lat: 12.64, lon: -8.00, ne: "Mali" },
  "Mauritania":     { lat: 18.08, lon: -15.98, ne: "Mauritania" },
  "Senegal":        { lat: 14.72, lon: -17.47, ne: "Senegal" },
  "Guinea":         { lat: 9.64,  lon: -13.58, ne: "Guinea" },
  "Guinea-Bissau":  { lat: 11.86, lon: -15.60, ne: "Guinea-Bissau" },
  "Sierra Leone":   { lat: 8.48,  lon: -13.23, ne: "Sierra Leone" },
  "Liberia":        { lat: 6.30,  lon: -10.80, ne: "Liberia" },
  "Côte d'Ivoire":  { lat: 6.82,  lon: -5.28, ne: "Ivory Coast" },
  "Gambia":         { lat: 13.45, lon: -16.58, ne: "Gambia" },
  "Zambia":         { lat: -15.39, lon: 28.32, ne: "Zambia" },
  "Zimbabwe":       { lat: -17.83, lon: 31.05, ne: "Zimbabwe" },
  "Malawi":         { lat: -13.96, lon: 33.79, ne: "Malawi" },
  "Mozambique":     { lat: -25.97, lon: 32.57, ne: "Mozambique" },
  "Angola":         { lat: -8.84, lon: 13.23, ne: "Angola" },
  "Namibia":        { lat: -22.56, lon: 17.08, ne: "Namibia" },
  "Botswana":       { lat: -24.63, lon: 25.92, ne: "Botswana" },
  "South Africa":   { lat: -25.75, lon: 28.19, ne: "South Africa" },
  "Madagascar":     { lat: -18.88, lon: 47.51, ne: "Madagascar" },
  "Seychelles":     { lat: -4.62, lon: 55.45, ne: null },
  "Mauritius":      { lat: -20.16, lon: 57.50, ne: null },
  "African Union**": { lat: 9.03, lon: 38.74, ne: null, fl: "International organisation (peacekeeping); dot at AU HQ, Addis Ababa" },
  /* --- Europe --- */
  "Albania":        { lat: 41.33, lon: 19.82, ne: "Albania" },
  "Serbia":         { lat: 44.79, lon: 20.45, ne: "Republic of Serbia" },
  "Slovakia":       { lat: 48.15, lon: 17.11, ne: "Slovakia" },
  "Belarus":        { lat: 53.90, lon: 27.57, ne: "Belarus" },
  "Russia":         { lat: 55.75, lon: 37.62, ne: "Russia" },
  "Romania":        { lat: 44.43, lon: 26.10, ne: "Romania" },
  "North Macedonia": { lat: 41.99, lon: 21.43, ne: "Macedonia" },
  "Bosnia and Herzegovina": { lat: 43.86, lon: 18.41, ne: "Bosnia and Herzegovina" },
  "United Kingdom": { lat: 51.51, lon: -0.13, ne: "United Kingdom" },
  /* --- Americas --- */
  "Venezuela":      { lat: 10.49, lon: -66.88, ne: "Venezuela" },
  "Bolivia":        { lat: -16.50, lon: -68.15, ne: "Bolivia" },
  "Peru":           { lat: -12.05, lon: -77.04, ne: "Peru" },
  "Ecuador":        { lat: -0.18, lon: -78.47, ne: "Ecuador" },
  "Argentina":      { lat: -34.60, lon: -58.38, ne: "Argentina" },
  "Guyana":         { lat: 6.80,  lon: -58.16, ne: "Guyana" },
  "Trinidad and Tobago": { lat: 10.65, lon: -61.51, ne: "Trinidad and Tobago" },
  "Bahamas":        { lat: 25.04, lon: -77.35, ne: "The Bahamas" },
  "Mexico":         { lat: 19.43, lon: -99.13, ne: "Mexico" },
  "Cuba":           { lat: 23.11, lon: -82.37, ne: "Cuba" },
  /* --- Oceania --- */
  "Australia":      { lat: -35.28, lon: 149.13, ne: "Australia" },
  "Papua New Guinea": { lat: -9.44, lon: 147.18, ne: "Papua New Guinea" },
  "Fiji":           { lat: -18.14, lon: 178.44, ne: "Fiji" },
};

/* ---------------- load register ---------------- */
const regPath = "data/trade_register_china.csv";
const raw = rd(regPath);
/* skip preamble lines before the header row (SIPRI exports carry a preamble) */
const lines = raw.split(/\r?\n/);
let hdrIdx = lines.findIndex(l => /SIPRI AT Database ID|Supplier.*Recipient.*Designation/i.test(l));
if (hdrIdx < 0) throw new Error("register header not found in " + regPath);
const table = parseCSV(lines.slice(hdrIdx).join("\n"));
const header = table[0].map(h => h.trim());
const col = (name) => {
  const i = header.findIndex(h => h.toLowerCase() === name.toLowerCase());
  if (i < 0) throw new Error("column not found: " + name + " in " + JSON.stringify(header));
  return i;
};
const I = {
  id: col("SIPRI AT Database ID"),
  sup: col("Supplier"),
  rec: col("Recipient"),
  des: col("Designation"),
  desc: col("Description"),
  cat: col("Armament category"),
  oy: col("Order date"),
  oyEst: col("Order date is estimate"),
  n: col("Numbers delivered"),
  nEst: col("Numbers delivered is estimate"),
  dy: col("Delivery year"),
  dyEst: col("Delivery year is estimate"),
  status: col("Status"),
  tivUnit: col("TIV deal unit"),
  tivDel: col("TIV delivery values"),
  local: col("Local production"),
};

const deals = new Map(); /* dealId|rec|des -> row */
let skipped = 0, unmappedRecip = new Map();
for (let r = 1; r < table.length; r++) {
  const row = table[r];
  if (!row || row.length < header.length - 1 || !row[I.rec]) continue;
  if (row[I.sup] && row[I.sup].trim() !== "China") continue;
  const rec = canon(row[I.rec]);
  if (!RECIPIENTS[rec]) {
    unmappedRecip.set(rec, (unmappedRecip.get(rec) || 0) + 1);
  }
  const dy = parseInt(row[I.dy], 10);
  const tiv = parseFloat(row[I.tivDel]);
  if (!Number.isFinite(dy)) { skipped++; continue; }        /* undelivered/open order rows */
  const n = parseInt(row[I.n], 10) || 0;
  const key = row[I.id] + "|" + rec + "|" + row[I.des];
  let d = deals.get(key);
  if (!d) {
    d = {
      r: rec,
      c: mapCat(row[I.cat]),
      d: row[I.des].trim(),
      dd: row[I.desc].trim(),
      oy: parseInt(row[I.oy], 10) || null,
      oyEst: /yes/i.test(row[I.oyEst] || ""),
      no: 0,
      dl: [],
      tiv: 0,
      lic: /yes/i.test(row[I.local] || "") ? 1 : 0,
      status: (row[I.status] || "").trim(),
    };
    deals.set(key, d);
  }
  d.no += n;
  d.tiv += Number.isFinite(tiv) ? tiv : 0;
  d.dl.push([dy, n, Number.isFinite(tiv) ? +tiv.toFixed(3) : 0]);
}
if (unmappedRecip.size) {
  console.error("UNMAPPED RECIPIENTS (add to RECIPIENTS/ALIAS):");
  for (const [k, v] of [...unmappedRecip].sort((a, b) => b[1] - a[1])) console.error("   " + k + "  (" + v + " rows)");
  process.exit(1);
}

const ROWS = [...deals.values()];
for (const d of ROWS) {
  d.dl.sort((a, b) => a[0] - b[0]);
  d.tiv = +d.tiv.toFixed(3);
  const st = d.status.toLowerCase();
  const bits = [];
  if (st && st !== "new") bits.push(d.status);
  if (d.oyEst) bits.push("order year is a SIPRI estimate");
  d.fl = bits.length ? bits.join("; ") : undefined;
  delete d.status; delete d.oyEst;
}

/* used recipients only */
const usedRec = new Set(ROWS.map(d => d.r));
const RECIP_OUT = {};
for (const r of usedRec) RECIP_OUT[r] = RECIPIENTS[r];

/* ---------------- timeline span ---------------- */
const years = ROWS.flatMap(d => d.dl.map(x => x[0]));
const Y0 = Math.min(...years), Y1 = Math.max(...years) + 1;

/* ---------------- cross-check vs TIV tables (2000-2025) ---------------- */
console.log("Register: " + ROWS.length + " deals, " + years.length + " delivery-year rows, span " + Y0 + "–" + (Y1 - 1) + (skipped ? " (" + skipped + " undelivered rows skipped)" : ""));
try {
  const tivRaw = rd("data/sipri_tiv_table_2000_2025.csv");
  const tl = tivRaw.split(/\r?\n/);
  const hi = tl.findIndex(l => l.startsWith("Recipient,"));
  const tt = parseCSV(tl.slice(hi).join("\n"));
  const thdr = tt[0];
  const yearsIdx = thdr.map((h, i) => [h, i]).filter(([h]) => /^\d{4}$/.test(h));
  const totalRow = tt.find(r => /^Total/i.test(r[0] || ""));
  /* our per-year totals */
  const ours = new Map();
  for (const d of ROWS) for (const [y, , tiv] of d.dl) ours.set(y, (ours.get(y) || 0) + tiv);
  console.log("\nCross-check vs SIPRI TIV tables (per-year totals, TIV m.):");
  let worst = 0;
  for (const [h, i] of yearsIdx) {
    const y = +h;
    const theirs = parseFloat(String(totalRow[i]).replace(/\s/g, "")) || 0;
    const mine = ours.get(y) || 0;
    const diff = mine - theirs;
    if (Math.abs(diff) > Math.abs(worst)) worst = diff;
    const mark = Math.abs(diff) > Math.max(2, theirs * 0.02) ? "  <-- CHECK" : "";
    console.log("  " + y + "  table=" + String(theirs).padStart(6) + "  register=" + String(Math.round(mine)).padStart(6) + "  diff=" + diff.toFixed(1).padStart(8) + mark);
  }
  console.log("  worst diff: " + worst.toFixed(1) + " TIV m.");
} catch (e) {
  console.warn("cross-check skipped:", e.message);
}

/* ---------------- captions ---------------- */
const CAPTIONS = [
  [1955, 1979, "<b>Fraternal arms.</b> Mao-era China arms its ideological allies — Albania after the Soviet split, North Korea, North Vietnam through the war years, and above all Pakistan after 1965, when Western embargoes push Islamabad toward Beijing."],
  [1981, 1989, "<b>The Iran–Iraq war.</b> China sells to <b>both sides</b> — Type 59/69 tanks, fighters and Silkworm missiles flow to Baghdad and Tehran alike. The 1980s are China's first arms-export boom."],
  [1990, 1999, "<b>The quiet decade.</b> After Tiananmen and the Soviet collapse, cheap Russian surplus floods the market and Chinese exports slump — Pakistan, Myanmar and Iran keep the pipeline alive."],
  [2007, 2013, "<b>The JF-17 era.</b> Co-developed with Pakistan and assembled in Kamra under licence, the JF-17 Thunder anchors a relationship that will absorb roughly half of all Chinese arms exports."],
  [2014, 2020, "<b>Drones where the US won't sell.</b> CH-4 and Wing Loong armed UAVs go to Saudi Arabia, the UAE, Iraq, Egypt and Nigeria — customers Washington refused. China becomes the world's top exporter of armed drones."],
  [2021, 2026, "<b>Submarines and frigates.</b> Type 054A/P frigates and Hangor-class submarines for Pakistan, S26T for Thailand — big-ticket naval deals now dominate, with Pakistan taking ~45% of everything China exports."],
];

/* ---------------- substitute ---------------- */
const tpl = rd("template.html");
const today = new Date();
const RETRIEVED = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const out = tpl
  .replace("%%LAND%%", rd("data/ne_land_110m.json").trim())
  .replace("%%COUNTRIES%%", rd("data/ne_countries_110m.json").trim())
  .replace("%%ROWS%%", JSON.stringify(ROWS))
  .replace("%%RECIPIENTS%%", JSON.stringify(RECIP_OUT))
  .replace("%%CAPTIONS%%", JSON.stringify(CAPTIONS))
  .replace(/%%Y0%%/g, String(Y0))
  .replace(/%%Y1%%/g, String(Y1))
  .replace(/%%RETRIEVED%%/g, RETRIEVED);
for (const m of out.match(/%%[A-Z0-9_]+%%/g) || []) throw new Error("unsubstituted token: " + m);
fs.writeFileSync(path.join(ROOT, "index.html"), out);
console.log("\nWrote index.html (" + (out.length / 1024).toFixed(0) + " KB)");
