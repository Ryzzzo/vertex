/**
 * Plane geometry for the lookup. Pure functions, no data, no I/O — so they can
 * be exercised directly and reasoned about on their own.
 *
 * Rings arrive in two shapes: packed Float64Arrays of [lon, lat, lon, lat, ...]
 * for the statewide data (compact, and fast to scan), and Xy tuples in the local
 * metre frame for anything headed to the client.
 */

import type { Box, Ring, Xy } from "./types";

/**
 * Metres per degree at a latitude, from the WGS84 series expansions. Across a
 * precinct-sized window a flat frame built on these is accurate to well under
 * a metre, which is all the boundary check needs.
 */
export function metresPerDegree(latDeg: number): { kx: number; ky: number } {
  const p = (latDeg * Math.PI) / 180;
  return {
    kx: 111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p) + 0.118 * Math.cos(5 * p),
    ky: 111132.954 - 559.822 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p),
  };
}

/** A local frame centred on (lon0, lat0): x east, y SOUTH, both in metres. */
export type Frame = { lon0: number; lat0: number; kx: number; ky: number };

export function frameAt(lon0: number, lat0: number): Frame {
  return { lon0, lat0, ...metresPerDegree(lat0) };
}

/**
 * Even-odd ray cast across every ring of a precinct. Holes and multi-part
 * precincts fall out of the rule without being told apart.
 */
export function pointInRings(lon: number, lat: number, rings: Float64Array[]): boolean {
  let inside = false;
  for (const r of rings) {
    const n = r.length;
    for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
      const yi = r[i + 1];
      const yj = r[j + 1];
      if (yi > lat !== yj > lat) {
        const xi = r[i];
        const xj = r[j];
        if (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Shortest distance from the frame's origin to any edge of the rings, in
 * metres, and the point on the edge where it occurs (local frame).
 */
export function nearestEdge(
  rings: Float64Array[],
  f: Frame,
): { distance: number; point: Xy } {
  let best = Infinity;
  let bx = 0;
  let by = 0;
  for (const r of rings) {
    let ax = (r[0] - f.lon0) * f.kx;
    let ay = (f.lat0 - r[1]) * f.ky;
    for (let i = 2; i < r.length; i += 2) {
      const cx = (r[i] - f.lon0) * f.kx;
      const cy = (f.lat0 - r[i + 1]) * f.ky;
      const dx = cx - ax;
      const dy = cy - ay;
      const len2 = dx * dx + dy * dy;
      let t = len2 === 0 ? 0 : -(ax * dx + ay * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx;
      const py = ay + t * dy;
      const d2 = px * px + py * py;
      if (d2 < best) {
        best = d2;
        bx = px;
        by = py;
      }
      ax = cx;
      ay = cy;
    }
  }
  return { distance: Math.sqrt(best), point: [bx, by] };
}

/** Packed lon/lat → local-frame tuples. */
export function toLocal(r: Float64Array, f: Frame): Ring {
  const out: Ring = new Array(r.length / 2);
  for (let i = 0, k = 0; i < r.length; i += 2, k++) {
    out[k] = [(r[i] - f.lon0) * f.kx, (f.lat0 - r[i + 1]) * f.ky];
  }
  return out;
}

/**
 * Douglas-Peucker on a local-frame ring or line, iterative so a long rural
 * boundary cannot overflow the stack. Keeps both endpoints.
 */
export function simplify(points: Ring, tolerance: number): Ring {
  const n = points.length;
  if (n <= 3 || tolerance <= 0) return points;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const tol2 = tolerance * tolerance;
  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d2: number;
      if (len2 === 0) {
        d2 = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        const cross = dx * (py - ay) - dy * (px - ax);
        d2 = (cross * cross) / len2;
      }
      if (d2 > maxD) {
        maxD = d2;
        idx = i;
      }
    }
    if (maxD > tol2 && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out: Ring = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/**
 * Sutherland–Hodgman against an axis-aligned box. Correct for any polygon
 * because the clip window is convex; the price is zero-width slivers along the
 * box edge where a concave ring re-enters, which fill invisibly.
 */
export function clipRing(ring: Ring, [x0, y0, x1, y1]: Box): Ring {
  let out = ring;
  const edges: Array<[(p: Xy) => boolean, (a: Xy, b: Xy) => Xy]> = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  for (const [inside, cut] of edges) {
    if (out.length === 0) break;
    const input = out;
    out = [];
    let prev = input[input.length - 1];
    for (const cur of input) {
      const cIn = inside(cur);
      const pIn = inside(prev);
      if (cIn) {
        if (!pIn) out.push(cut(prev, cur));
        out.push(cur);
      } else if (pIn) {
        out.push(cut(prev, cur));
      }
      prev = cur;
    }
  }
  return out.length >= 3 ? out : [];
}

/**
 * Clips a polyline to a box, splitting it where it leaves and re-enters.
 * Liang–Barsky per segment.
 */
export function clipLine(line: Ring, [x0, y0, x1, y1]: Box): Ring[] {
  const parts: Ring[] = [];
  let cur: Ring = [];
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const dx = bx - ax;
    const dy = by - ay;
    let t0 = 0;
    let t1 = 1;
    let visible = true;
    const checks: Array<[number, number]> = [
      [-dx, ax - x0],
      [dx, x1 - ax],
      [-dy, ay - y0],
      [dy, y1 - ay],
    ];
    for (const [p, q] of checks) {
      if (p === 0) {
        if (q < 0) {
          visible = false;
          break;
        }
      } else {
        const t = q / p;
        if (p < 0) {
          if (t > t1) {
            visible = false;
            break;
          }
          if (t > t0) t0 = t;
        } else {
          if (t < t0) {
            visible = false;
            break;
          }
          if (t < t1) t1 = t;
        }
      }
    }
    if (!visible) {
      if (cur.length > 1) parts.push(cur);
      cur = [];
      continue;
    }
    const s: Xy = [ax + t0 * dx, ay + t0 * dy];
    const e: Xy = [ax + t1 * dx, ay + t1 * dy];
    if (cur.length === 0) cur.push(s);
    cur.push(e);
    if (t1 < 1) {
      parts.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) parts.push(cur);
  return parts;
}

export function ringBox(rings: Ring[]): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rings) {
    for (const [x, y] of r) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return [x0, y0, x1, y1];
}

function pointInLocalRings(x: number, y: number, rings: Ring[]): boolean {
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

/**
 * A label point well inside a shape: scan a set of horizontal lines, take the
 * widest inside run on each, and keep the one whose midpoint sits farthest from
 * the run's ends. Not a true pole of inaccessibility, but it never lands in a
 * hole or outside a crescent the way a centroid does.
 */
export function labelPoint(rings: Ring[], within?: Box): Xy | undefined {
  const [bx0, by0, bx1, by1] = ringBox(rings);
  const x0 = within ? Math.max(bx0, within[0]) : bx0;
  const x1 = within ? Math.min(bx1, within[2]) : bx1;
  const y0 = within ? Math.max(by0, within[1]) : by0;
  const y1 = within ? Math.min(by1, within[3]) : by1;
  if (!(x1 > x0 && y1 > y0)) return undefined;
  let best: Xy | undefined;
  let bestScore = -1;
  const steps = 24;
  for (let s = 1; s < steps; s++) {
    const y = y0 + ((y1 - y0) * s) / steps;
    const xs: number[] = [];
    for (const r of rings) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i];
        const [xj, yj] = r[j];
        if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.max(xs[i], x0);
      const b = Math.min(xs[i + 1], x1);
      if (b <= a) continue;
      const mid = (a + b) / 2;
      // Favour runs near the vertical middle as well as wide ones.
      const vertical = Math.min(y - y0, y1 - y) * 2;
      const score = Math.min(b - a, vertical);
      if (score > bestScore && pointInLocalRings(mid, y, rings)) {
        bestScore = score;
        best = [mid, y];
      }
    }
  }
  return best;
}

/** Rounds a ring for the wire. The step is chosen per layer from its scale. */
export function roundRing(r: Ring, step: number): Ring {
  const inv = 1 / step;
  const out: Ring = [];
  let px = NaN;
  let py = NaN;
  for (const [x, y] of r) {
    const rx = Math.round(x * inv) / inv;
    const ry = Math.round(y * inv) / inv;
    if (rx !== px || ry !== py) out.push([rx, ry]);
    px = rx;
    py = ry;
  }
  return out;
}
