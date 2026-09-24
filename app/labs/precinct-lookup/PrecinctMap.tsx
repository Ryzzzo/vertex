"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, Marker, StyleSpecification } from "maplibre-gl";
import districtLabels from "@/data/precincts/district-labels.json";
import type { GeoFeature, LookupResult, PrecinctInfo } from "@/lib/precinct/types";

/**
 * The interactive map: MapLibre GL 5 (the open-source fork of Mapbox GL), a free
 * keyless street basemap from OpenFreeMap, and the State Board's precincts and
 * district plans as vector tiles cut by this site's own API.
 *
 * What the visitor can do: drag, zoom, tilt and turn; hover any of the 2,625
 * precincts; click one to raise it and read its districts; switch the three
 * district plans on and off; and, when an address sits on a line, fly down to
 * the line itself with the distance measured.
 *
 * Privacy: the address never reaches OpenFreeMap. Its servers do see which
 * tiles are requested, which is to say the area on screen — the page says so.
 */

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const NC_BOUNDS: [[number, number], [number, number]] = [[-84.42, 33.75], [-75.35, 36.65]];

/** Open Sky, restated for the map: the page's tokens can't reach a WebGL canvas. */
const C = {
  teal: "#12A5A0",
  tealDark: "#0B7B77",
  coral: "#FF6B4A",
  coralDark: "#E4502F",
  ink: "#0E1A28",
  line: "#7C91A5",
  cd: "#1E293B",
  sen: "#B7791F",
  house: "#8E4585",
} as const;

/** Label text a shade darker than its line, to clear 4.5:1 on the white halo. */
const LABEL_INK = { cd: "#1E293B", sen: "#8A5A0F", house: "#8E4585" } as const;

type Layers = { cd: boolean; sen: boolean; house: boolean };

type Props = {
  result: LookupResult | null;
  /** The precinct raised on the map: a clicked one, else the result's. */
  selected: GeoFeature | null;
  onInspect: (info: PrecinctInfo, feature: GeoFeature) => void;
  /** Incremented to fly the camera down to the line near the address. */
  lineRequest: number;
  dataVersion: string;
  /** Rendered instead of the map when WebGL is unavailable. */
  fallback: React.ReactNode;
  onUnsupported?: () => void;
  /** Non-zero once the visitor shows intent elsewhere (focuses the field, picks a sample). */
  wake: number;
  /** The statewide drawing shown until the map is live — the map's first frame. */
  poster: React.ReactNode;
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function fc(...features: Array<GeoFeature | null | undefined>): FeatureCollection {
  return { type: "FeatureCollection", features: features.filter(Boolean) as unknown as Feature[] };
}

function bboxOf(f: GeoFeature): [[number, number], [number, number]] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    } else (c as unknown[]).forEach(walk);
  };
  walk(f.geometry.coordinates);
  return [[x0, y0], [x1, y1]];
}

/** A slab height that reads at the zoom the precinct is framed at. */
function slabHeight(f: GeoFeature): number {
  const [[x0, y0], [x1, y1]] = bboxOf(f);
  const diag = Math.hypot((x1 - x0) * 91000, (y1 - y0) * 111000);
  return Math.min(Math.max(diag * 0.035, 35), 900);
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fmtM(m: number): string {
  return `${m.toLocaleString("en-US", { maximumFractionDigits: m < 10 ? 1 : 0 })} m`;
}

export default function PrecinctMap({
  result,
  selected,
  onInspect,
  lineRequest,
  dataVersion,
  fallback,
  onUnsupported,
  wake,
  poster,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const dimRef = useRef<Marker | null>(null);
  const hoverId = useRef<number | null>(null);
  const onInspectRef = useRef(onInspect);
  const onUnsupportedRef = useRef(onUnsupported);
  const resultRef = useRef(result);
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported">("loading");
  /**
   * MapLibre is a megabyte of JavaScript and a WebGL context. It starts on the
   * first sign of intent — a pointer or finger on the map, focus in the address
   * field, a sample picked — not on page load, so a visitor who only reads pays
   * nothing for it. Until then the statewide drawing stands in, and it is the
   * same picture the map opens on.
   */
  const [touched, setTouched] = useState(false);
  const live = touched || wake > 0;
  const [shown, setShown] = useState(false);
  const [pitched, setPitched] = useState(false);
  const [layers, setLayers] = useState<Layers>({ cd: false, sen: false, house: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; f: MapGeoJSONFeature } | null>(null);

  useEffect(() => {
    onInspectRef.current = onInspect;
    onUnsupportedRef.current = onUnsupported;
    resultRef.current = result;
  }, [onInspect, onUnsupported, result]);

  /* ── Create the map once, on intent ── */
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const unsupported = () => {
      setStatus("unsupported");
      onUnsupportedRef.current?.();
    };
    (async () => {
      let lib: typeof import("maplibre-gl");
      let style: StyleSpecification;
      try {
        if (!hasWebGL()) throw new Error("no WebGL");
        // The basemap style is fetched here rather than by MapLibre, so an
        // OpenFreeMap outage lands on the drawn plates instead of a map that
        // never finishes loading. Our own precinct tiles do not depend on it.
        const [mod, res] = await Promise.all([
          import("maplibre-gl"),
          fetch(STYLE_URL, { signal: AbortSignal.timeout(10_000) }),
        ]);
        if (!res.ok) throw new Error(`basemap style ${res.status}`);
        style = (await res.json()) as StyleSpecification;
        // The UMD build arrives as a CommonJS module: the API may sit on `default`.
        lib = (mod as unknown as { default?: typeof mod }).default ?? mod;
      } catch {
        if (!cancelled) unsupported();
        return;
      }
      if (cancelled || !container.current) return;
      libRef.current = lib;
      const wideAtStart = container.current.clientWidth >= 900;
      let map: MapLibreMap;
      try {
        map = new lib.Map({
          container: container.current,
          style,
          bounds: NC_BOUNDS,
          // Leave the floating panel its own ground on wide screens.
          fitBoundsOptions: { padding: wideAtStart ? { top: 24, bottom: 24, left: 450, right: 60 } : 16 },
          // Loose enough that a tall stage can show all of NC at the fit zoom;
          // tighter, and MapLibre zooms in to honour it and hides the west.
          maxBounds: [[-93, 28.5], [-67, 42]],
          minZoom: 5,
          maxZoom: 19.5,
          maxPitch: 62,
          // Never trap the page's scroll: wheel-zoom needs Ctrl/⌘, touch needs two fingers.
          cooperativeGestures: true,
          attributionControl: { compact: true },
          fadeDuration: 0,
        });
      } catch {
        // A GPU that refuses a WebGL context surfaces here, not in the probe.
        unsupported();
        return;
      }
      mapRef.current = map;
      // Style in hand but no first frame after 45 s (a stalled tile host, a
      // lost GPU): stop promising a live map and fall back to the plates.
      const watchdog = window.setTimeout(() => {
        if (cancelled || map.loaded()) return;
        map.remove();
        mapRef.current = null;
        unsupported();
      }, 45_000);
      map.once("load", () => window.clearTimeout(watchdog));
      map.on("error", () => {
        /* A missing basemap tile is not fatal; precincts come from our own API. */
      });

      map.on("load", () => {
        if (cancelled) return;
        // Tint the basemap from warm grey toward the page's cool sky.
        const tint: Array<[string, string, string]> = [
          ["background", "background-color", "#F3F6F8"],
          ["park", "fill-color", "#E3ECE6"],
          ["water", "fill-color", "#CFE2EC"],
          ["landuse_residential", "fill-color", "#EDF1F3"],
          ["building", "fill-color", "#E7ECF0"],
        ];
        for (const [id, prop, value] of tint) {
          if (!map.getLayer(id)) continue;
          (map as unknown as { setPaintProperty(l: string, p: string, v: string): void }).setPaintProperty(id, prop, value);
        }
        const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
        const origin = window.location.origin;
        const tiles = (layer: string) => [`${origin}/api/precinct/tiles/${layer}/{z}/{x}/{y}?v=${dataVersion}`];

        map.addSource("precincts", { type: "vector", tiles: tiles("precincts"), minzoom: 5, maxzoom: 14 });
        for (const d of ["cd", "sen", "house"] as const) {
          map.addSource(d, { type: "vector", tiles: tiles(d), minzoom: 5, maxzoom: 12 });
        }
        map.addSource("sel", { type: "geojson", data: EMPTY });
        map.addSource("home", { type: "geojson", data: EMPTY });
        map.addSource("across", { type: "geojson", data: EMPTY });
        map.addSource("shared", { type: "geojson", data: EMPTY });
        map.addSource("dim", { type: "geojson", data: EMPTY });
        const labelFeatures = (key: "cd" | "sen" | "house", prefix: string): FeatureCollection => ({
          type: "FeatureCollection",
          features: districtLabels[key].map((l) => ({
            type: "Feature",
            properties: { t: `${prefix} ${l.d}` },
            geometry: { type: "Point", coordinates: l.at },
          })),
        });
        map.addSource("cd-labels", { type: "geojson", data: labelFeatures("cd", "US House") });
        map.addSource("sen-labels", { type: "geojson", data: labelFeatures("sen", "Senate") });
        map.addSource("house-labels", { type: "geojson", data: labelFeatures("house", "House") });

        // Under the basemap's labels, so street names stay readable on top.
        // Low zooms: North Carolina as a white sheet with an ink edge, so the
        // state is the subject and the neighbours recede. Gone by street level.
        map.addLayer({
          id: "pl-state-sheet",
          type: "fill",
          source: "precincts",
          "source-layer": "state",
          maxzoom: 11,
          paint: {
            "fill-color": "#ffffff",
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.92, 8, 0.8, 10.5, 0],
          },
        }, firstSymbol);
        map.addLayer({
          id: "pl-precinct-fill",
          type: "fill",
          source: "precincts",
          "source-layer": "precincts",
          paint: {
            "fill-color": C.ink,
            "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.07, 0],
          },
        }, firstSymbol);
        map.addLayer({
          id: "pl-across-fill",
          type: "fill",
          source: "across",
          paint: { "fill-color": C.coral, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.2, 17.5, 0.12] },
        }, firstSymbol);
        map.addLayer({
          id: "pl-precinct-line",
          type: "line",
          source: "precincts",
          "source-layer": "precincts",
          paint: {
            "line-color": C.line,
            "line-opacity": 0.75,
            "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.3, 9, 0.6, 13, 1.1, 17, 1.6],
          },
        }, firstSymbol);
        map.addLayer({
          id: "pl-state-line",
          type: "line",
          source: "precincts",
          "source-layer": "state",
          maxzoom: 11,
          layout: { "line-join": "round" },
          paint: {
            "line-color": C.ink,
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.75, 9, 0.5, 10.5, 0],
            "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 9, 1.6],
          },
        }, firstSymbol);
        map.addLayer({
          id: "pl-precinct-hover",
          type: "line",
          source: "precincts",
          "source-layer": "precincts",
          paint: {
            "line-color": C.ink,
            "line-width": 2,
            "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.9, 0],
          },
        }, firstSymbol);
        map.addLayer({
          id: "pl-across-line",
          type: "line",
          source: "across",
          paint: { "line-color": C.coralDark, "line-width": 1.5, "line-opacity": 0.9 },
        }, firstSymbol);
        const dash: Record<string, number[] | undefined> = { cd: undefined, sen: [4, 2], house: [1.2, 1.6] };
        const width: Record<string, number> = { cd: 2.6, sen: 2.2, house: 1.8 };
        for (const d of ["cd", "sen", "house"] as const) {
          map.addLayer({
            id: `pl-${d}-line`,
            type: "line",
            source: d,
            "source-layer": d,
            layout: { visibility: "none", "line-join": "round" },
            paint: {
              "line-color": C[d],
              "line-width": width[d],
              "line-opacity": 0.8,
              ...(dash[d] ? { "line-dasharray": dash[d] } : {}),
            },
          }, firstSymbol);
        }
        // Below the basemap's labels, so street names read on top of the slab.
        map.addLayer({
          id: "pl-sel-3d",
          type: "fill-extrusion",
          source: "sel",
          paint: {
            "fill-extrusion-color": C.teal,
            "fill-extrusion-height": 0,
            "fill-extrusion-base": 0,
            // Lighter at street level, where the streets under it are the point.
            "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.6, 17.5, 0.3],
          },
        }, firstSymbol);
        // While another precinct is inspected, the address's own stays traced.
        map.addLayer({
          id: "pl-home-line",
          type: "line",
          source: "home",
          layout: { "line-join": "round" },
          paint: { "line-color": C.tealDark, "line-width": 2, "line-dasharray": [2, 1.4] },
        });
        map.addLayer({
          id: "pl-sel-line",
          type: "line",
          source: "sel",
          paint: { "line-color": C.tealDark, "line-width": 2.2 },
        });
        map.addLayer({
          id: "pl-shared",
          type: "line",
          source: "shared",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": C.ink, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 17, 4] },
        });
        map.addLayer({
          id: "pl-dim",
          type: "line",
          source: "dim",
          minzoom: 15,
          paint: { "line-color": C.ink, "line-width": 1.5, "line-dasharray": [2, 1.5] },
        });
        map.addLayer({
          id: "pl-precinct-label",
          type: "symbol",
          source: "precincts",
          "source-layer": "plabels",
          minzoom: 11.5,
          layout: {
            "text-field": ["get", "p"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            "text-letter-spacing": 0.06,
          },
          paint: { "text-color": "#44576A", "text-halo-color": "#FFFFFF", "text-halo-width": 1.6 },
        });
        for (const d of ["cd", "sen", "house"] as const) {
          map.addLayer({
            id: `pl-${d}-label`,
            type: "symbol",
            source: `${d}-labels`,
            layout: {
              visibility: "none",
              "text-field": ["get", "t"],
              "text-font": ["Noto Sans Bold"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 10, 13],
              "text-allow-overlap": false,
            },
            paint: { "text-color": LABEL_INK[d], "text-halo-color": "#FFFFFF", "text-halo-width": 2 },
          });
        }

        /* Hover: outline + tooltip. */
        map.on("mousemove", "pl-precinct-fill", (e) => {
          const f = e.features?.[0];
          if (!f || f.id === undefined) return;
          map.getCanvas().style.cursor = "pointer";
          if (hoverId.current !== null && hoverId.current !== f.id) {
            map.setFeatureState({ source: "precincts", sourceLayer: "precincts", id: hoverId.current }, { hover: false });
          }
          hoverId.current = Number(f.id);
          map.setFeatureState({ source: "precincts", sourceLayer: "precincts", id: f.id }, { hover: true });
          setTip({ x: e.point.x, y: e.point.y, f });
        });
        map.on("mouseleave", "pl-precinct-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoverId.current !== null) {
            map.setFeatureState({ source: "precincts", sourceLayer: "precincts", id: hoverId.current }, { hover: false });
          }
          hoverId.current = null;
          setTip(null);
        });

        /* Click: fetch the precinct at full precision and hand it to the panel. */
        map.on("click", "pl-precinct-fill", async (e) => {
          const f = e.features?.[0];
          if (!f || f.id === undefined) return;
          try {
            const res = await fetch(`/api/precinct/shape/${f.id}?v=${dataVersion}`);
            const body = (await res.json()) as { ok: boolean; info: PrecinctInfo; feature: GeoFeature };
            if (body.ok) onInspectRef.current(body.info, body.feature);
          } catch {
            /* A failed click leaves the current selection in place. */
          }
        });

        // Re-frame the state against the container's settled size, which the
        // constructor can see before layout has finished.
        if (!resultRef.current) {
          const wideNow = map.getContainer().clientWidth >= 900;
          map.fitBounds(NC_BOUNDS, {
            padding: wideNow ? { top: 24, bottom: 24, left: 450, right: 60 } : 16,
            duration: 0,
          });
        }

        // Attribution starts folded on a phone, where expanded it covers the legend.
        if (map.getContainer().clientWidth < 640) {
          map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        }

        // The 2D/3D button reflects the camera, whoever moved it.
        map.on("pitchend", () => setPitched(map.getPitch() > 5));

        setStatus("ready");
        map.once("idle", () => setShown(true));
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [dataVersion, live]);

  /* ── Raise the selected precinct ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const src = map.getSource("sel") as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(fc(selected));
    const home = result && selected && selected.id !== result.info.index ? result.geo.match : null;
    (map.getSource("home") as GeoJSONSource).setData(fc(home));
    if (!selected) return;
    const height = slabHeight(selected);
    if (prefersReducedMotion()) {
      map.setPaintProperty("pl-sel-3d", "fill-extrusion-height", height);
      return;
    }
    // The slab rises: the one moment on the page that moves on its own.
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      map.setPaintProperty("pl-sel-3d", "fill-extrusion-height", height * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    map.setPaintProperty("pl-sel-3d", "fill-extrusion-height", 0);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [selected, status, result]);

  /* ── A new lookup result: pin, precinct across, the line, and the camera ── */
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || status !== "ready") return;
    (map.getSource("across") as GeoJSONSource).setData(fc(result?.geo.across));
    (map.getSource("shared") as GeoJSONSource).setData(fc(result?.geo.shared));
    pinRef.current?.remove();
    dimRef.current?.remove();
    pinRef.current = null;
    dimRef.current = null;
    if (!result) {
      (map.getSource("dim") as GeoJSONSource).setData(EMPTY);
      return;
    }
    const { lon, lat } = result.location;
    const el = document.createElement("div");
    el.className = "pl-map-pin";
    el.setAttribute("aria-hidden", "true");
    pinRef.current = new lib.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);

    if (result.boundary.near) {
      const [nx, ny] = result.geo.nearest;
      (map.getSource("dim") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[lon, lat], [nx, ny]] } }],
      });
      const label = document.createElement("div");
      label.className = "pl-map-dim";
      label.textContent = fmtM(result.boundary.distanceM);
      dimRef.current = new lib.Marker({ element: label, anchor: "right", offset: [-14, 0] })
        .setLngLat([(lon + nx) / 2, (lat + ny) / 2])
        .addTo(map);
    } else {
      (map.getSource("dim") as GeoJSONSource).setData(EMPTY);
    }

    const wide = map.getContainer().clientWidth >= 900;
    map.fitBounds(bboxOf(result.geo.match), {
      padding: wide ? { top: 70, bottom: 70, left: 440, right: 90 } : { top: 70, bottom: 80, left: 24, right: 64 },
      pitch: wide ? 48 : 36,
      bearing: -14,
      maxZoom: 16.5,
      duration: prefersReducedMotion() ? 0 : 2200,
    });
  }, [result, status]);

  /* ── Fly down to the line ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !result || !lineRequest) return;
    const [nx, ny] = result.geo.nearest;
    const wide = map.getContainer().clientWidth >= 900;
    map.flyTo({
      center: [(result.location.lon + nx) / 2, (result.location.lat + ny) / 2],
      zoom: 18.6,
      pitch: 0,
      bearing: 0,
      // An offset, not padding: padding given to flyTo stays on the camera and
      // would squeeze every later fitBounds into what is left of the canvas.
      offset: [wide ? 200 : 0, 0],
      duration: prefersReducedMotion() ? 0 : 2400,
    });
  }, [lineRequest, result, status]);

  /* ── The layers menu closes like any popover: outside press or Escape ── */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!layersRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      layersRef.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* ── District layers ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    for (const d of ["cd", "sen", "house"] as const) {
      const v = layers[d] ? "visible" : "none";
      map.setLayoutProperty(`pl-${d}-line`, "visibility", v);
      map.setLayoutProperty(`pl-${d}-label`, "visibility", v);
    }
  }, [layers, status]);

  if (status === "unsupported") return <>{fallback}</>;

  const ease = (o: Parameters<MapLibreMap["easeTo"]>[0]) =>
    mapRef.current?.easeTo({ ...o, duration: prefersReducedMotion() ? 0 : 600 });
  const frameResult = (r: LookupResult, duration: number) => {
    const map = mapRef.current;
    if (!map) return;
    const wide = map.getContainer().clientWidth >= 900;
    map.fitBounds(bboxOf(r.geo.match), {
      padding: wide ? { top: 70, bottom: 70, left: 440, right: 90 } : { top: 70, bottom: 80, left: 24, right: 64 },
      pitch: wide ? 48 : 36,
      bearing: -14,
      maxZoom: 16.5,
      duration: prefersReducedMotion() ? 0 : duration,
    });
  };

  const tipProps = tip?.f.properties as Record<string, string> | undefined;

  const wakeUp = () => {
    if (!touched) setTouched(true);
  };

  return (
    <div
      className="pl-map"
      role="region"
      aria-label="Interactive map of North Carolina voting precincts"
      data-shown={shown || undefined}
      onPointerEnter={wakeUp}
      onTouchStart={wakeUp}
      onFocus={wakeUp}
    >
      <div ref={container} className="pl-map-canvas" />
      {!shown ? (
        <div className="pl-map-poster">
          {poster}
          <button type="button" className="pl-map-wake" onClick={wakeUp}>
            {live ? "Loading the live map…" : "Explore the live map"}
          </button>
        </div>
      ) : null}

      {tip && tipProps ? (
        <div className="pl-map-tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          <span>
            <b>Precinct {tipProps.p}</b> · {tipProps.c}
          </span>
          {tipProps.n && tipProps.n !== tipProps.p ? <span className="pl-map-tip-name">{tipProps.n}</span> : null}
          <span className="pl-map-tip-d">
            US House {tipProps.cd} · Senate {tipProps.sen} · House {tipProps.house}
          </span>
          <em>Click to inspect</em>
        </div>
      ) : null}

      <div className="pl-map-controls">
        <div className="pl-map-group">
          <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>−</button>
        </div>
        <div className="pl-map-group">
          <button
            type="button"
            className="pl-map-text"
            aria-pressed={pitched}
            aria-label={pitched ? "Flat view" : "Tilted 3D view"}
            onClick={() => {
              ease({ pitch: pitched ? 0 : 50, bearing: pitched ? 0 : -14 });
              setPitched(!pitched);
            }}
          >
            {pitched ? "2D" : "3D"}
          </button>
        </div>
        <div className="pl-map-group">
          <button
            type="button"
            aria-label={result ? "Back to the address" : "Show all of North Carolina"}
            onClick={() => {
              if (result) {
                frameResult(result, 1200);
                setPitched(true);
              } else {
                const m = mapRef.current;
                const wideNow = (m?.getContainer().clientWidth ?? 0) >= 900;
                m?.fitBounds(NC_BOUNDS, {
                  padding: wideNow ? { top: 24, bottom: 24, left: 450, right: 60 } : 16,
                  pitch: 0,
                  bearing: 0,
                });
                setPitched(false);
              }
            }}
          >
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="pl-map-group pl-map-layers" ref={layersRef}>
          <button
            type="button"
            className="pl-map-text"
            aria-expanded={menuOpen}
            aria-controls="pl-layer-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Layers
          </button>
          {menuOpen ? (
            <div className="pl-map-menu" id="pl-layer-menu">
              <p className="pl-map-menu-head">District plans</p>
              {(
                [
                  ["cd", "US House", "S.L. 2025-95"],
                  ["sen", "NC Senate", "S.L. 2023-146"],
                  ["house", "NC House", "S.L. 2023-149"],
                ] as const
              ).map(([key, label, law]) => (
                <label key={key} className="pl-map-check">
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                  />
                  <span className={`pl-map-swatch pl-map-swatch-${key}`} aria-hidden="true" />
                  <span>
                    {label}
                    <small>{law}</small>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pl-map-legend" aria-hidden="true">
        {result || selected ? (
          <span>
            <i className="pl-key pl-key-sel" />
            {selected && result && selected.id !== result.info.index ? "Inspected precinct" : "Your precinct"}
          </span>
        ) : null}
        {result?.geo.across ? (
          <span>
            <i className="pl-key pl-key-across" />
            Across the line
          </span>
        ) : null}
        {(["cd", "sen", "house"] as const)
          .filter((k) => layers[k])
          .map((k) => (
            <span key={k}>
              <i className={`pl-key pl-key-${k}`} />
              {k === "cd" ? "US House" : k === "sen" ? "NC Senate" : "NC House"}
            </span>
          ))}
        {!result && !selected ? <span>Hover or click any precinct</span> : null}
      </div>
    </div>
  );
}
