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
  // the page's custom properties. They are the site's tokens, written out.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OVERVIEW_WIDTH} ${height}" width="${OVERVIEW_WIDTH}" height="${height}">` +
    `<title>North Carolina's ${precinctCount.toLocaleString("en-US")} voting precincts</title>` +
    `<path d="${path(outline, true)}" fill="#0d0e12" stroke="none"/>` +
    `<path d="${path(precinctLines, false)}" fill="none" stroke="#9aa0ab" stroke-opacity=".5" stroke-width=".6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
    `<path d="${path(countyLines, false)}" fill="none" stroke="#c8ccd5" stroke-opacity=".62" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
    `<path d="${path(outline, true)}" fill="none" stroke="#e4e6eb" stroke-opacity=".85" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>` +
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

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  await download();
  const zip = readFileSync(ZIP_PATH);
  const sha = createHash("sha256").update(zip).digest("hex");
  runMapshaper();
  const precincts = postProcess(sha, zip.length);
  overview(precincts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
