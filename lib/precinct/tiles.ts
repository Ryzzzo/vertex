/**
 * Vector tiles for the interactive map, cut on demand from the same files the
 * lookup reads. Server only.
 *
 * Why tiles and not one big GeoJSON: the statewide precinct file is 3.9 MB,
 * and a phone should not download North Carolina to look at one street. A
 * tile carries only what is on screen, simplified to the zoom it is drawn at,
 * and once cut it is cached at the CDN edge for the life of the deployment —
 * the URL carries the data version, so a new data build is a new URL.
 *
 * geojson-vt does the clipping and simplification (it is what Mapbox and
 * MapLibre use for GeoJSON sources in the browser); vt-pbf encodes the result
 * as a Mapbox Vector Tile.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { FeatureCollection } from "geojson";
import GeoJSONVT from "geojson-vt";
import vtpbf from "vt-pbf";
import { allPrecincts } from "./engine";
import { precinctInfo, joinShares } from "./geo";

export const TILE_LAYERS = ["precincts", "cd", "sen", "house"] as const;
export type TileLayer = (typeof TILE_LAYERS)[number];

const DISTRICTS_FILE = path.join(process.cwd(), "data", "precincts", "districts.topo.json");
const LABELS_FILE = path.join(process.cwd(), "data", "precincts", "precinct-labels.json");
const STATE_FILE = path.join(process.cwd(), "data", "precincts", "state-outline.json");
/** The state outline is simplified to 400 ft; past this zoom the precinct lines carry the edge. */
const STATE_MAX_ZOOM = 11;

type Topology = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: Array<Array<[number, number]>>;
  objects: Record<
    string,
    { geometries: Array<{ type: "Polygon" | "MultiPolygon"; arcs: number[][] | number[][][]; properties: { d: string } }> }
  >;
};

type Feature = {
  type: "Feature";
  id?: number;
  properties: Record<string, string | number>;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
};

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

function precinctFeatures(): Feature[] {
  return allPrecincts().map((p) => {
    const info = precinctInfo(p);
    return {
      type: "Feature",
      id: p.index,
      properties: {
        c: p.county,
        p: p.id,
        n: p.name,
        cd: joinShares(info.districts.congress),
        sen: joinShares(info.districts.senate),
        house: joinShares(info.districts.house),
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: p.polys.map((poly) =>
          poly.map((r) => {
            const out: number[][] = [];
            for (let i = 0; i < r.length; i += 2) out.push([r6(r[i]), r6(r[i + 1])]);
            return out;
          }),
        ),
      },
    };
  });
}

/** One point per precinct, precomputed well inside it, carried as a second tile layer. */
function precinctLabelFeatures() {
  const points = JSON.parse(readFileSync(LABELS_FILE, "utf8")) as Array<[number, number]>;
  const all = allPrecincts();
  return points.map(([lon, lat], i) => ({
    type: "Feature" as const,
    id: i,
    properties: { p: all[i]?.id ?? "" },
    geometry: { type: "Point" as const, coordinates: [lon, lat] },
  }));
}

/** The dissolved state outline, for the low-zoom sheet and edge. */
function stateFeatures() {
  const rings = JSON.parse(readFileSync(STATE_FILE, "utf8")) as Array<Array<[number, number]>>;
  return [
    {
      type: "Feature" as const,
      id: 0,
      properties: {},
      geometry: { type: "MultiPolygon" as const, coordinates: rings.map((ring) => [ring]) },
    },
  ];
}

let districtTopo: Topology | null = null;

function districtFeatures(layer: "cd" | "sen" | "house"): Feature[] {
  districtTopo ??= JSON.parse(readFileSync(DISTRICTS_FILE, "utf8")) as Topology;
  const topo = districtTopo;
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [r6(x * sx + tx), r6(y * sy + ty)];
    });
  });
  const ring = (refs: number[]) => {
    const out: number[][] = [];
    refs.forEach((ref, k) => {
      const arc = ref < 0 ? arcs[~ref].slice().reverse() : arcs[ref];
      out.push(...(k === 0 ? arc : arc.slice(1)));
    });
    return out;
  };
  return topo.objects[layer].geometries.map((g, i) => ({
    type: "Feature",
    id: i,
    properties: { d: g.properties.d },
    geometry: {
      type: "MultiPolygon",
      coordinates: ((g.type === "Polygon" ? [g.arcs] : g.arcs) as number[][][]).map((poly) => poly.map(ring)),
    },
  }));
}

type IndexKey = TileLayer | "plabels" | "state";
const indexes = new Map<IndexKey, GeoJSONVT>();

function indexFor(layer: IndexKey): GeoJSONVT {
  let index = indexes.get(layer);
  if (!index) {
    const features =
      layer === "precincts"
        ? precinctFeatures()
        : layer === "plabels"
          ? precinctLabelFeatures()
          : layer === "state"
            ? stateFeatures()
            : districtFeatures(layer);
    index = new GeoJSONVT(
      { type: "FeatureCollection", features } as unknown as FeatureCollection,
      {
        maxZoom: layer === "precincts" || layer === "plabels" ? 14 : layer === "state" ? STATE_MAX_ZOOM : 12,
        indexMaxZoom: 4,
        indexMaxPoints: 100000,
        tolerance: 3,
        extent: 4096,
        buffer: 64,
      },
    );
    indexes.set(layer, index);
  }
  return index;
}

/** One Mapbox Vector Tile, or null when nothing falls inside it. */
export function tile(layer: TileLayer, z: number, x: number, y: number): Uint8Array | null {
  const t = indexFor(layer).getTile(z, x, y);
  if (!t || t.features.length === 0) return null;
  const layers: Record<string, unknown> = { [layer]: t };
  if (layer === "precincts") {
    const labels = indexFor("plabels").getTile(z, x, y);
    if (labels && labels.features.length) layers.plabels = labels;
    if (z <= STATE_MAX_ZOOM) {
      const state = indexFor("state").getTile(z, x, y);
      if (state && state.features.length) layers.state = state;
    }
  }
  return vtpbf.fromGeojsonVt(layers, { version: 2, extent: 4096 });
}
