#!/usr/bin/env node
/**
 * Builds data/precincts/nc-precincts.topo.json from the NC State Board of
 * Elections statewide precinct shapefile.
 *
 *   node scripts/build-precinct-data.mjs
 *
 * Reproducible from nothing: downloads the source zip into scripts/.cache
 * (gitignored), runs a pinned mapshaper through npx so package.json gains no
 * dependency, and writes two files:
 *
 *   data/precincts/nc-precincts.topo.json   the geometry the API reads
 *   data/precincts/meta.json                where it came from, and how coarse
 *
 * Order matters. Simplification runs in the source CRS (NC State Plane, US
 * survey feet) so the tolerance is a ground distance rather than a fraction of
 * a degree that means different things at different latitudes; the result is
 * reprojected to WGS84 afterwards.
 *
 * Why TopoJSON: every precinct boundary is shared by two precincts, and
 * TopoJSON stores it once. Measured on the 2026-08-24 file at the same
 * tolerance, it is less than half the size of the equivalent GeoJSON, and the
 * shared arcs are exactly what the lookup needs to draw "the line between these
 * two precincts".
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Precincts as of 2026-08-24, posted by NCSBE 2026-08-28. */
const SOURCE_URL =
  "https://s3.amazonaws.com/dl.ncsbe.gov/ShapeFiles/Precinct/SBE_PRECINCTS_20260824.zip";
const SOURCE_AS_OF = "2026-08-24";

/**
 * Douglas-Peucker tolerance in the source unit, US survey feet. 3 ft is 0.91 m.
 * Measured (TopoJSON, quantization 1e6):
 *   full resolution   9.48 MB raw, 2.89 MB gzip
 *   3 ft  (~1 m)      3.95 MB raw, 1.32 MB gzip   <- shipped
 *   10 ft (~3 m)      2.59 MB raw, 0.88 MB gzip
 * The Census geocoder places a point about 6 m off the street centre line, so a
 * 3 m tolerance would spend half of that margin on simplification alone. 1 m
 * keeps simplification well below the thing it is being compared against.
 */
const SIMPLIFY_INTERVAL_FT = 3;

/**
 * Quantization grid for the TopoJSON integer coordinates. Across North
 * Carolina's extent 1e6 steps is ~0.8 m east-west and ~0.3 m north-south,
 * finer than the simplification above, so it adds no meaningful error.
 */
const QUANTIZATION = 1_000_000;

const MAPSHAPER = "mapshaper@0.7.66";

const CACHE_DIR = join(ROOT, "scripts", ".cache", "precincts");
const OUT_DIR = join(ROOT, "data", "precincts");
const ZIP_PATH = join(CACHE_DIR, SOURCE_URL.split("/").pop());
const RAW_TOPO = join(CACHE_DIR, "mapshaper-out.topo.json");

async function download() {
  if (existsSync(ZIP_PATH)) {
    console.log(`source: cached ${ZIP_PATH} (${statSync(ZIP_PATH).size} bytes)`);
    return;
  }
  console.log(`source: downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(ZIP_PATH, buf);
  console.log(`source: ${buf.length} bytes`);
}

function runMapshaper() {
  const args = [
    "-y",
    MAPSHAPER,
    ZIP_PATH,
    "-filter-fields",
    "county_nam,enr_desc,prec_id",
    "-simplify",
    "dp",
    `interval=${SIMPLIFY_INTERVAL_FT}`,
    "keep-shapes",
    "-proj",
    "wgs84",
    "-o",
    "format=topojson",
    `quantization=${QUANTIZATION}`,
    RAW_TOPO,
  ];
  console.log(`mapshaper: npx ${args.join(" ")}`);
  // shell: true so Windows resolves npx.cmd; every argument above is a constant.
  const result = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`mapshaper exited ${result.status}`);
}

/** Title case for county names, which the source carries in capitals. */
function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function countVertices(arcs) {
  return arcs.reduce((n, arc) => n + arc.length, 0);
}

function postProcess(sourceSha256, sourceBytes) {
  const topo = JSON.parse(readFileSync(RAW_TOPO, "utf8"));
  const [layerName] = Object.keys(topo.objects);
  const layer = topo.objects[layerName];

  // Short property keys: 2,625 features x three long keys is ~100 KB of
  // repeated field names. c = county, n = precinct name, p = precinct id.
  const geometries = layer.geometries.map((g) => ({
    type: g.type,
    arcs: g.arcs,
    properties: {
      c: titleCase(g.properties.county_nam.trim()),
      n: g.properties.enr_desc.trim(),
      p: g.properties.prec_id.trim(),
    },
  }));

  const out = {
    type: "Topology",
    transform: topo.transform,
    objects: { precincts: { type: "GeometryCollection", geometries } },
    arcs: topo.arcs,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "nc-precincts.topo.json");
  const body = JSON.stringify(out);
  writeFileSync(outPath, body);

  const counties = new Set(geometries.map((g) => g.properties.c));
  const meta = {
    source: SOURCE_URL,
    sourceAsOf: SOURCE_AS_OF,
    sourceBytes,
    sourceSha256,
    publisher: "North Carolina State Board of Elections",
    precincts: geometries.length,
    counties: counties.size,
    arcs: out.arcs.length,
    vertices: countVertices(out.arcs),
    simplification: {
      method: "Douglas-Peucker, in NC State Plane (US survey feet), before reprojection",
      toleranceFeet: SIMPLIFY_INTERVAL_FT,
      toleranceMeters: Math.round(SIMPLIFY_INTERVAL_FT * 0.3048006096 * 100) / 100,
    },
    quantization: QUANTIZATION,
    tool: MAPSHAPER,
    bytes: Buffer.byteLength(body),
    built: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  console.log(
    `wrote ${outPath}: ${meta.precincts} precincts, ${meta.counties} counties, ` +
      `${meta.vertices} vertices, ${meta.bytes} bytes`,
  );
  return meta.precincts;
}

/* ── Statewide overview ─────────────────────────────────────────────────────
 *
 * The page's opening frame: every precinct line in the state, drawn once, as
 * a static SVG the browser caches. It is the empty state and the locator
 * inset in one asset, and it is built here rather than at request time so the
 * page ships none of the 3.9 MB above.
 *
 * Coarser on purpose. At 1440 px across, one pixel of this drawing is about
 * 560 m of North Carolina; 400 ft (~120 m) keeps every line sub-pixel accurate
 * and brings ~365k vertices down to ~26k.
 */

const OVERVIEW_INTERVAL_FT = 400;
const OVERVIEW_WIDTH = 1000;
const OVERVIEW_PAD = 6;
const OVERVIEW_SVG = join(ROOT, "public", "labs-shots", "precinct-lookup", "nc-precincts.svg");

function mapshaperLines(extra, out) {
  const args = [
    "-y",
    MAPSHAPER,
    ZIP_PATH,
    ...extra,
    "-proj",
    "wgs84",
    "-o",
    "format=geojson",
    "precision=0.00001",
    out,
  ];
  const result = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`mapshaper exited ${result.status}`);
  const gj = JSON.parse(readFileSync(out, "utf8"));
  return gj.geometries ?? gj.features.map((f) => f.geometry);
}

/** Every line or ring in a geometry list, as [lon, lat][] runs. */
function runs(geoms) {
  const out = [];
  for (const g of geoms) {
    if (!g) continue;
    if (g.type === "LineString") out.push(g.coordinates);
    else if (g.type === "MultiLineString" || g.type === "Polygon") out.push(...g.coordinates);
    else if (g.type === "MultiPolygon") for (const p of g.coordinates) out.push(...p);
  }
  return out;
}

function overview(precinctCount) {
  // Innerlines run after the polygons are simplified, so shared edges stay shared.
  const simplify = ["-simplify", "dp", `interval=${OVERVIEW_INTERVAL_FT}`, "keep-shapes"];
  const precinctLines = runs(
    mapshaperLines([...simplify, "-innerlines"], join(CACHE_DIR, "ov-precincts.json")),
  );
  const countyLines = runs(
    mapshaperLines(["-dissolve", "county_nam", ...simplify, "-innerlines"], join(CACHE_DIR, "ov-counties.json")),
  );
  // Outer rings only: dissolving 2,625 precincts leaves hairline holes wherever
  // two counties' linework does not quite meet, and drawn as outline they read
  // as stray bright marks across the state.
  const outline = mapshaperLines(["-dissolve", ...simplify], join(CACHE_DIR, "ov-state.json"))
    .flatMap((g) => (g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : []))
    .filter((ring) => ring.length > 8);
  // The same outline feeds the live map's low zooms — a white sheet with an ink
  // edge, so the state reads as the subject before any precinct is legible.
  // 400 ft is under a pixel until about zoom 10, where the map fades it out.
  const r5 = (v) => Math.round(v * 1e5) / 1e5;
  writeFileSync(
    join(OUT_DIR, "state-outline.json"),
    JSON.stringify(outline.map((ring) => ring.map(([lon, lat]) => [r5(lon), r5(lat)]))) + "\n",
  );

  let lonMin = Infinity;
  let lonMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;
  for (const run of outline) {
    for (const [lon, lat] of run) {
      lonMin = Math.min(lonMin, lon);
      lonMax = Math.max(lonMax, lon);
      latMin = Math.min(latMin, lat);
      latMax = Math.max(latMax, lat);
    }
  }
  // Equirectangular at the state's middle latitude: across North Carolina's
  // 2.75 degrees of latitude the east-west stretch error stays under 3%.
  const lat0 = (latMin + latMax) / 2;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const inner = OVERVIEW_WIDTH - OVERVIEW_PAD * 2;
  const scale = inner / ((lonMax - lonMin) * kx);
  const height = Math.round((latMax - latMin) * scale + OVERVIEW_PAD * 2);

  const project = ([lon, lat]) => [
    OVERVIEW_PAD + (lon - lonMin) * kx * scale,
    OVERVIEW_PAD + (latMax - lat) * scale,
  ];

  /** Relative path commands at 0.1-unit precision (about 80 m). */
  const path = (list, close) =>
    list
      .map((run) => {
        const pts = run.map(project).map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
        let d = `M${pts[0][0] / 10} ${pts[0][1] / 10}`;
        let [px, py] = pts[0];
        let seg = "";
        for (let i = 1; i < pts.length; i++) {
          const dx = pts[i][0] - px;
          const dy = pts[i][1] - py;
          if (dx === 0 && dy === 0) continue;
          seg += `${seg ? " " : ""}${dx / 10} ${dy / 10}`;
          px = pts[i][0];
          py = pts[i][1];
        }
        return seg ? `${d}l${seg}${close ? "z" : ""}` : "";
      })
      .filter(Boolean)
      .join("")
      .replace(/ -/g, "-");

  // Colours are baked in because the drawing ships as an <img>: it cannot read
  // the page's custom properties. They are the page's Open Sky tokens, written
  // out — this drawing is the map's first frame, so it wears the map's colours.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OVERVIEW_WIDTH} ${height}" width="${OVERVIEW_WIDTH}" height="${height}">` +
    `<title>North Carolina's ${precinctCount.toLocaleString("en-US")} voting precincts</title>` +
    `<path d="${path(outline, true)}" fill="#ffffff" stroke="none"/>` +
    `<path d="${path(precinctLines, false)}" fill="none" stroke="#8fa4b6" stroke-opacity=".75" stroke-width=".6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
    `<path d="${path(countyLines, false)}" fill="none" stroke="#5f768a" stroke-opacity=".8" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
    `<path d="${path(outline, true)}" fill="none" stroke="#0e1a28" stroke-opacity=".75" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
    `</svg>`;

  mkdirSync(dirname(OVERVIEW_SVG), { recursive: true });
  writeFileSync(OVERVIEW_SVG, svg);

  const frame = {
    width: OVERVIEW_WIDTH,
    height,
    pad: OVERVIEW_PAD,
    lonMin,
    latMax,
    kx,
    scale,
    toleranceFeet: OVERVIEW_INTERVAL_FT,
    vertices: precinctLines.reduce((n, r) => n + r.length, 0),
  };
  writeFileSync(join(OUT_DIR, "overview.json"), JSON.stringify(frame, null, 2) + "\n");
  console.log(`wrote ${OVERVIEW_SVG}: ${Buffer.byteLength(svg)} bytes, ${frame.vertices} precinct-line vertices`);
}

/* ── Districts ──────────────────────────────────────────────────────────────
 *
 * The State Board's shapefiles for the three plans in force for the Nov 3,
 * 2026 general election. They feed the map's district layers, and they let a
 * clicked precinct report its districts without an address: each precinct is
 * sampled on a grid and every sample tested against every plan, so a precinct
 * the legislature split between two districts says so, with the rough share.
 *
 * The three plans are combined into one topology so a line two plans share is
 * stored once. Their CRS is NC State Plane in metres, so the 1 m interval here
 * matches the precincts' 3 ft.
 */

const DISTRICT_SOURCES = [
  {
    key: "cd",
    label: "US House",
    law: "S.L. 2025-95",
    url: "https://s3.amazonaws.com/dl.ncsbe.gov/ShapeFiles/USCongress/SL%202025-95%20-%20Shapefile.zip",
  },
  {
    key: "sen",
    label: "NC Senate",
    law: "S.L. 2023-146",
    url: "https://s3.amazonaws.com/dl.ncsbe.gov/ShapeFiles/LegislativeDistricts/Shapefiles/Senate/SL%202023-146%20Senate%20-%20Shapefile.zip",
  },
  {
    key: "house",
    label: "NC House",
    law: "S.L. 2023-149",
    url: "https://s3.amazonaws.com/dl.ncsbe.gov/ShapeFiles/LegislativeDistricts/Shapefiles/House/SL%202023-149%20House%20-%20Shapefile.zip",
  },
];

async function downloadTo(url, path) {
  if (existsSync(path)) return readFileSync(path);
  console.log(`source: downloading ${decodeURIComponent(url)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  return buf;
}

/** TopoJSON geometry → polygons of packed [lon, lat, ...] rings (outer ring first). */
function topoPolygons(topo) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
  const ring = (refs) => {
    const out = [];
    refs.forEach((ref, k) => {
      const arc = ref < 0 ? arcs[~ref].slice().reverse() : arcs[ref];
      out.push(...(k === 0 ? arc : arc.slice(1)));
    });
    return out;
  };
  return (g) => (g.type === "Polygon" ? [g.arcs] : g.arcs).map((poly) => poly.map(ring));
}

function inRings(x, y, rings) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function boxOf(polys) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys)
    for (const r of poly)
      for (const [x, y] of r) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  return b;
}

/** A label point well inside the largest part: widest horizontal run near the middle. */
function labelOf(polys) {
  const area = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2);
  const poly = polys.slice().sort((a, b) => area(b[0]) - area(a[0]))[0];
  const [x0, y0, x1, y1] = boxOf([poly]);
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  let best = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestScore = -1;
  for (let s = 1; s < 32; s++) {
    const y = y0 + ((y1 - y0) * s) / 32;
    const xs = [];
    for (const r of poly)
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i];
        const [xj, yj] = r[j];
        if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
      }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const width = (xs[i + 1] - xs[i]) * k;
      const score = Math.min(width, Math.min(y - y0, y1 - y) * 2);
      if (score > bestScore) {
        bestScore = score;
        best = [(xs[i] + xs[i + 1]) / 2, y];
      }
    }
  }
  return best.map((v) => Math.round(v * 1e5) / 1e5);
}

async function districts() {
  const zips = [];
  for (const src of DISTRICT_SOURCES) {
    const path = join(CACHE_DIR, decodeURIComponent(src.url.split("/").pop()));
    const buf = await downloadTo(src.url, path);
    zips.push({ ...src, path, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") });
  }

  const raw = join(CACHE_DIR, "districts-out.topo.json");
  const args = [
    "-y", MAPSHAPER, "-i", ...zips.map((z) => z.path), "combine-files",
    "-rename-layers", zips.map((z) => z.key).join(","),
    "-filter-fields", "DISTRICT", "target=*",
    "-simplify", "dp", "interval=1", "keep-shapes",
    "-proj", "wgs84", "target=*",
    "-o", "format=topojson", `quantization=${QUANTIZATION}`, "target=*", raw,
  ];
  console.log(`mapshaper: districts (${zips.map((z) => z.law).join(", ")})`);
  const result = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`mapshaper exited ${result.status}`);

  const topo = JSON.parse(readFileSync(raw, "utf8"));
  for (const key of Object.keys(topo.objects)) {
    for (const g of topo.objects[key].geometries) g.properties = { d: String(g.properties.DISTRICT).trim() };
  }
  writeFileSync(join(OUT_DIR, "districts.topo.json"), JSON.stringify(topo));

  // Every district, decoded, with a bounding box for the prefilter.
  const decode = topoPolygons(topo);
  const layers = Object.fromEntries(
    DISTRICT_SOURCES.map(({ key }) => [
      key,
      topo.objects[key].geometries.map((g) => {
        const polys = decode(g);
        return { d: g.properties.d, polys, rings: polys.flat(), box: boxOf(polys) };
      }),
    ]),
  );

  const labels = Object.fromEntries(
    Object.entries(layers).map(([key, list]) => [
      key,
      list
        .map((f) => ({ d: f.d, at: labelOf(f.polys) }))
        .sort((a, b) => Number(a.d) - Number(b.d)),
    ]),
  );
  writeFileSync(join(OUT_DIR, "district-labels.json"), JSON.stringify(labels));

  // Precinct membership, sampled. Aligned with the precinct file's order.
  const ptopo = JSON.parse(readFileSync(join(OUT_DIR, "nc-precincts.topo.json"), "utf8"));
  const pdecode = topoPolygons(ptopo);
  const districtAt = (key, x, y) => {
    for (const f of layers[key]) {
      if (x < f.box[0] || x > f.box[2] || y < f.box[1] || y > f.box[3]) continue;
      if (inRings(x, y, f.rings)) return f.d;
    }
    return null;
  };
  let split = 0;
  const membership = ptopo.objects.precincts.geometries.map((g) => {
    const rings = pdecode(g).flat();
    const [x0, y0, x1, y1] = boxOf([rings]);
    let pts = [];
    for (const n of [16, 48]) {
      pts = [];
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
          const y = y0 + ((y1 - y0) * (j + 0.5)) / n;
          if (inRings(x, y, rings)) pts.push([x, y]);
        }
      if (pts.length >= 24) break;
    }
    const row = DISTRICT_SOURCES.map(({ key }) => {
      const tally = new Map();
      for (const [x, y] of pts) {
        const d = districtAt(key, x, y);
        if (d) tally.set(d, (tally.get(d) ?? 0) + 1);
      }
      const total = [...tally.values()].reduce((a, b) => a + b, 0) || 1;
      const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
      // Two samples and 3% before a second district counts: below that it is
      // the two agencies' linework disagreeing by metres, not a real split.
      const kept = ranked.filter(([, n], i) => i === 0 || (n >= 2 && n / total >= 0.03));
      return kept.map(([d, n]) => [d, Math.round((n / total) * 100)]);
    });
    if (row.some((r) => r.length > 1)) split++;
    return row;
  });
  writeFileSync(join(OUT_DIR, "precinct-districts.json"), JSON.stringify(membership));

  // One label point per precinct. Left to itself the map labels every tile a
  // polygon touches, so a large precinct wore its code three times.
  const plabels = ptopo.objects.precincts.geometries.map((g) => labelOf(pdecode(g)));
  writeFileSync(join(OUT_DIR, "precinct-labels.json"), JSON.stringify(plabels));

  console.log(
    `wrote districts: ${Object.entries(layers).map(([k, v]) => `${k} ${v.length}`).join(", ")}; ` +
      `${split} of ${membership.length} precincts split across districts`,
  );
  return zips.map(({ key, label, law, url, bytes, sha256 }) => ({ key, label, law, source: decodeURIComponent(url), bytes, sha256 }));
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  await download();
  const zip = readFileSync(ZIP_PATH);
  const sha = createHash("sha256").update(zip).digest("hex");
  runMapshaper();
  const precincts = postProcess(sha, zip.length);
  overview(precincts);
  const plans = await districts();
  const metaPath = join(OUT_DIR, "meta.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  meta.districts = plans;
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
