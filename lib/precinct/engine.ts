/**
 * The statewide precinct index and the lookup against it. Server only: it
 * reads a 3.9 MB file from disk.
 *
 * The file is read once per server instance, on first use, and decoded into
 * packed Float64Array rings with a bounding box per precinct. A lookup is a
 * bounding-box prefilter over 2,625 boxes followed by an even-odd ray cast on
 * the few that survive — measured well under a millisecond, so there is no
 * spatial index beyond the boxes.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  clipLine,
  clipRing,
  frameAt,
  labelPoint,
  nearestEdge,
  pointInRings,
  ringBox,
  roundRing,
  simplify,
  toLocal,
  type Frame,
} from "./geometry";
import type {
  Box,
  BoundaryReport,
  MapLayer,
  MapShape,
  PrecinctRef,
  Ring,
  ShapeRole,
  Xy,
} from "./types";

/**
 * Below this distance from the precinct's edge, the lookup stops claiming
 * certainty and names both precincts.
 *
 * The Census geocoder places a point about 6 m off the street centre line, on
 * the address's side (measured against Census block edges at five addresses,
 * 6.0–6.4 m). A precinct line that follows a street therefore sits roughly 6 m
 * from every address on it. But the State Board's lines are drawn by counties
 * on their own street centre lines, which do not coincide with the Census ones,
 * and the geocoder interpolates house numbers along the block, so a line that
 * crosses a street mid-block can be tens of metres from where the point lands.
 * 40 m covers both; the test table in the status doc is what it was tuned on.
 */
export const NEAR_BOUNDARY_M = 40;

const DATA_FILE = path.join(process.cwd(), "data", "precincts", "nc-precincts.topo.json");

type Topology = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: Array<Array<[number, number]>>;
  objects: {
    precincts: {
      geometries: Array<{
        type: "Polygon" | "MultiPolygon";
        arcs: number[][] | number[][][];
        properties: { c: string; n: string; p: string };
      }>;
    };
  };
};

type Precinct = PrecinctRef & {
  /** Every ring, packed [lon, lat, ...], closed. */
  rings: Float64Array[];
  /** Ring arc references, to find the boundary two precincts share. */
  arcs: Set<number>;
  /** minLon, minLat, maxLon, maxLat */
  box: [number, number, number, number];
};

type Index = { precincts: Precinct[]; arcs: Float64Array[] };

let index: Index | null = null;

function decodeArcs(topo: Topology): Float64Array[] {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  return topo.arcs.map((arc) => {
    const out = new Float64Array(arc.length * 2);
    let x = 0;
    let y = 0;
    for (let i = 0; i < arc.length; i++) {
      x += arc[i][0];
      y += arc[i][1];
      out[i * 2] = x * sx + tx;
      out[i * 2 + 1] = y * sy + ty;
    }
    return out;
  });
}

/** Stitches a ring from its arcs; a negative reference (~i) walks arc i backwards. */
function stitch(refs: number[], arcs: Float64Array[]): Float64Array {
  let length = 0;
  for (const ref of refs) length += arcs[ref < 0 ? ~ref : ref].length;
  const out = new Float64Array(length);
  let o = 0;
  refs.forEach((ref, k) => {
    const arc = arcs[ref < 0 ? ~ref : ref];
    const n = arc.length / 2;
    // Consecutive arcs share an endpoint; drop the repeat.
    const start = k === 0 ? 0 : 1;
    for (let s = start; s < n; s++) {
      const i = ref < 0 ? n - 1 - s : s;
      out[o++] = arc[i * 2];
      out[o++] = arc[i * 2 + 1];
    }
  });
  return out.subarray(0, o);
}

function load(): Index {
  if (index) return index;
  const topo = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Topology;
  const arcs = decodeArcs(topo);
  const precincts: Precinct[] = topo.objects.precincts.geometries.map((g) => {
    const polygons = (g.type === "Polygon" ? [g.arcs] : g.arcs) as number[][][];
    const rings: Float64Array[] = [];
    const arcSet = new Set<number>();
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const polygon of polygons) {
      for (const refs of polygon) {
        const ring = stitch(refs, arcs);
        rings.push(ring);
        for (const ref of refs) arcSet.add(ref < 0 ? ~ref : ref);
        for (let i = 0; i < ring.length; i += 2) {
          if (ring[i] < x0) x0 = ring[i];
          if (ring[i] > x1) x1 = ring[i];
          if (ring[i + 1] < y0) y0 = ring[i + 1];
          if (ring[i + 1] > y1) y1 = ring[i + 1];
        }
      }
    }
    return {
      id: g.properties.p,
      name: g.properties.n,
      county: g.properties.c,
      rings,
      arcs: arcSet,
      box: [x0, y0, x1, y1],
    };
  });
  index = { precincts, arcs };
  return index;
}

const ref = (p: Precinct): PrecinctRef => ({ id: p.id, name: p.name, county: p.county });

function boxHits(p: Precinct, lon: number, lat: number, padLon = 0, padLat = 0) {
  return (
    lon >= p.box[0] - padLon &&
    lon <= p.box[2] + padLon &&
    lat >= p.box[1] - padLat &&
    lat <= p.box[3] + padLat
  );
}

/** The precinct containing a point, or null. */
export function precinctAt(lon: number, lat: number): Precinct | null {
  const { precincts } = load();
  for (const p of precincts) {
    if (boxHits(p, lon, lat) && pointInRings(lon, lat, p.rings)) return p;
  }
  return null;
}

type Located = {
  precinct: Precinct;
  boundary: Omit<BoundaryReport, "block">;
  acrossPrecinct: Precinct | null;
  nearest: Xy;
  frame: Frame;
};

/**
 * Finds the precinct holding the point and measures how close it sits to the
 * next one. When no precinct contains the point — a sliver gap between two
 * counties' linework, or a point just offshore — the nearest precinct within
 * the threshold is used and the result is flagged as near a line, never
 * presented as certain.
 */
export function locate(lon: number, lat: number): Located | null {
  const { precincts } = load();
  const frame = frameAt(lon, lat);
  const padLat = (NEAR_BOUNDARY_M * 1.5) / frame.ky;
  const padLon = (NEAR_BOUNDARY_M * 1.5) / frame.kx;

  const candidates = precincts.filter((p) => boxHits(p, lon, lat, padLon, padLat));
  let home: Precinct | null = null;
  for (const p of candidates) {
    if (boxHits(p, lon, lat) && pointInRings(lon, lat, p.rings)) {
      home = p;
      break;
    }
  }

  const measured = candidates.map((p) => ({ p, ...nearestEdge(p.rings, frame) }));

  let contained = true;
  if (!home) {
    const closest = measured.sort((a, b) => a.distance - b.distance)[0];
    if (!closest || closest.distance > NEAR_BOUNDARY_M) return null;
    home = closest.p;
    contained = false;
  }

  const own = measured.find((m) => m.p === home)!;
  const others = measured
    .filter((m) => m.p !== home)
    .sort((a, b) => a.distance - b.distance);
  const across = others[0] && others[0].distance < NEAR_BOUNDARY_M ? others[0] : null;
  const distance = contained ? own.distance : 0;

  return {
    precinct: home,
    boundary: {
      distanceM: Math.round(distance * 10) / 10,
      near: (!contained || own.distance < NEAR_BOUNDARY_M) && across !== null,
      thresholdM: NEAR_BOUNDARY_M,
      across: across ? ref(across.p) : null,
    },
    acrossPrecinct: across?.p ?? null,
    nearest: own.point,
    frame,
  };
}

/* ── Map payload ─────────────────────────────────────────────────────────── */

function localRings(p: Precinct, frame: Frame, clip: Box, tolerance: number, step: number): Ring[] {
  const out: Ring[] = [];
  for (const packed of p.rings) {
    const clipped = clipRing(toLocal(packed, frame), clip);
    if (clipped.length === 0) continue;
    const simple = roundRing(simplify(clipped, tolerance), step);
    if (simple.length >= 3) out.push(simple);
  }
  return out;
}

function sharedLines(a: Precinct, b: Precinct, frame: Frame, clip: Box, tolerance: number, step: number): Ring[] {
  const { arcs } = load();
  const lines: Ring[] = [];
  for (const i of a.arcs) {
    if (!b.arcs.has(i)) continue;
    for (const part of clipLine(toLocal(arcs[i], frame), clip)) {
      const simple = roundRing(simplify(part, tolerance), step);
      if (simple.length >= 2) lines.push(simple);
    }
  }
  return lines;
}

/** A square box around a centre, so the client can widen it to any aspect. */
function squareAround([x0, y0, x1, y1]: Box, factor: number): Box {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = (Math.max(x1 - x0, y1 - y0) * factor) / 2;
  return [cx - half, cy - half, cx + half, cy + half];
}

function layer(
  view: Box,
  located: Located,
  opts: { clipFactor: number; detail: number; labels: boolean },
): MapLayer {
  const { precincts } = load();
  const { frame, precinct, acrossPrecinct } = located;
  const size = Math.max(view[2] - view[0], view[3] - view[1]);
  const clip = squareAround(view, opts.clipFactor);
  const tolerance = size / opts.detail;
  const step = tolerance / 4 >= 1 ? 1 : tolerance / 4 >= 0.1 ? 0.1 : 0.01;

  // Degrees covered by the clip box, for the bounding-box prefilter.
  const lonMin = frame.lon0 + clip[0] / frame.kx;
  const lonMax = frame.lon0 + clip[2] / frame.kx;
  const latMax = frame.lat0 - clip[1] / frame.ky;
  const latMin = frame.lat0 - clip[3] / frame.ky;

  const shapes: MapShape[] = [];
  for (const p of precincts) {
    if (p.box[2] < lonMin || p.box[0] > lonMax || p.box[3] < latMin || p.box[1] > latMax) continue;
    const role: ShapeRole = p === precinct ? "match" : p === acrossPrecinct ? "across" : "neighbor";
    const rings = localRings(p, frame, clip, tolerance, step);
    if (rings.length === 0) continue;
    const shape: MapShape = { ...ref(p), role, rings };
    if (opts.labels) {
      const label = labelPoint(rings, view);
      if (label) shape.label = roundRing([label], step)[0];
    }
    shapes.push(shape);
  }
  // Paint order: neighbors, then the precinct across, then the match on top.
  const order: Record<ShapeRole, number> = { neighbor: 0, across: 1, match: 2 };
  shapes.sort((a, b) => order[a.role] - order[b.role]);

  const shared = acrossPrecinct
    ? sharedLines(precinct, acrossPrecinct, frame, clip, tolerance, step)
    : [];

  return { view: view.map((v) => Math.round(v)) as Box, shapes, shared };
}

export type MapPayload = { map: MapLayer; closeup: (MapLayer & { nearest: Xy }) | null };

/**
 * Two layers. The main one frames the whole precinct with its neighbours
 * around it. The close-up exists only near a line, because at the scale of a
 * precinct a 12 m gap is sub-pixel: it frames the point, the nearest point on
 * the line, and enough either side to show which way the line runs.
 */
export function mapPayload(located: Located): MapPayload {
  const { precinct, frame, boundary, nearest } = located;
  const own = precinct.rings.map((r) => toLocal(r, frame));
  const [x0, y0, x1, y1] = ringBox(own);
  // Always include the pin, then give the precinct room to breathe.
  const bx0 = Math.min(x0, 0);
  const by0 = Math.min(y0, 0);
  const bx1 = Math.max(x1, 0);
  const by1 = Math.max(y1, 0);
  const span = Math.max(bx1 - bx0, by1 - by0, 400);
  const pad = span * 0.14;
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const half = span / 2 + pad;
  const view: Box = [cx - half, cy - half, cx + half, cy + half];

  const map = layer(view, located, { clipFactor: 2.8, detail: 1400, labels: true });

  let closeup: MapPayload["closeup"] = null;
  if (boundary.near) {
    const reach = Math.min(Math.max(boundary.distanceM * 4, 45), 220);
    const ccx = nearest[0] / 2;
    const ccy = nearest[1] / 2;
    const cview: Box = [ccx - reach, ccy - reach, ccx + reach, ccy + reach];
    closeup = {
      ...layer(cview, located, { clipFactor: 3.4, detail: 1600, labels: true }),
      nearest: roundRing([nearest], 0.1)[0],
    };
  }

  return { map, closeup };
}

export { ref as precinctRef };
