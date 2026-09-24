/**
 * Precinct geometry and facts in the shapes the interactive map consumes:
 * GeoJSON in lon/lat, and each precinct's districts from the State Board's
 * plan files. Server only — it reads files from disk.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { metresPerDegree } from "./geometry";
import { allPrecincts, sharedBoundary, type Precinct } from "./engine";
import type { DistrictShare, GeoFeature, PrecinctInfo } from "./types";

const MEMBERSHIP_FILE = path.join(process.cwd(), "data", "precincts", "precinct-districts.json");

/** [congress, senate, house] shares per precinct, aligned with the precinct file. */
let membership: DistrictShare[][][] | null = null;

function districtsOf(index: number): PrecinctInfo["districts"] {
  membership ??= JSON.parse(readFileSync(MEMBERSHIP_FILE, "utf8")) as DistrictShare[][][];
  const [congress = [], senate = [], house = []] = membership[index] ?? [];
  return { congress, senate, house };
}

/** Planar area on a local equirectangular frame: holes subtract through winding. */
function areaKm2(p: Precinct): number {
  const lat0 = (p.box[1] + p.box[3]) / 2;
  const { kx, ky } = metresPerDegree(lat0);
  let total = 0;
  for (const poly of p.polys) {
    poly.forEach((r, k) => {
      let a = 0;
      for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
        a += r[j] * kx * (r[i + 1] * ky) - r[i] * kx * (r[j + 1] * ky);
      }
      total += (k === 0 ? 1 : -1) * Math.abs(a / 2);
    });
  }
  return Math.round((total / 1e6) * 100) / 100;
}

export function precinctInfo(p: Precinct): PrecinctInfo {
  return {
    index: p.index,
    id: p.id,
    name: p.name,
    county: p.county,
    districts: districtsOf(p.index),
    areaKm2: areaKm2(p),
  };
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

function ringCoords(r: Float64Array): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < r.length; i += 2) out.push([round6(r[i]), round6(r[i + 1])]);
  return out;
}

/** "102" or "102/106" — how a split reads in a tile property or a tooltip. */
export function joinShares(shares: DistrictShare[]): string {
  return shares.map(([d]) => d).join("/");
}

/** A precinct as a GeoJSON feature, full precision (~1 m), with its facts. */
export function precinctFeature(p: Precinct): GeoFeature {
  const info = precinctInfo(p);
  return {
    type: "Feature",
    id: p.index,
    properties: {
      i: p.index,
      c: p.county,
      p: p.id,
      n: p.name,
      cd: joinShares(info.districts.congress),
      sen: joinShares(info.districts.senate),
      house: joinShares(info.districts.house),
    },
    geometry: { type: "MultiPolygon", coordinates: p.polys.map((poly) => poly.map(ringCoords)) },
  };
}

export function sharedFeature(a: Precinct, b: Precinct): GeoFeature | null {
  const lines = sharedBoundary(a, b).map((l) => l.map(([x, y]) => [round6(x), round6(y)]));
  if (lines.length === 0) return null;
  return { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines } };
}

export function precinctByIndex(index: number): Precinct | null {
  const all = allPrecincts();
  return Number.isInteger(index) && index >= 0 && index < all.length ? all[index] : null;
}
