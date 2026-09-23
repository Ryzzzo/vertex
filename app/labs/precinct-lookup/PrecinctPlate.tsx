"use client";

import { useEffect, useRef, useState } from "react";
import type { Box, MapLayer, Ring, Xy } from "@/lib/precinct/types";

/**
 * One precinct plate: real State Board geometry as vector paths, in metres
 * around the geocoded point. Crisp at any zoom, no tiles, no map account, no
 * third-party request — and the geometry is the evidence, not a backdrop.
 *
 * Text never goes inside the SVG. Labels, the pin, the scale bar and the
 * dimension callout are HTML laid over it by percentage, so they use the site's
 * own type, stay a constant size whatever the plate's scale, and remain
 * selectable and readable by assistive technology.
 */

const NICE = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000];

function nice(target: number): number {
  let best = NICE[0];
  for (const n of NICE) if (n <= target) best = n;
  return best;
}

function fmtDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
  return `${m.toLocaleString("en-US", { maximumFractionDigits: m < 10 ? 1 : 0 })} m`;
}

/** Widens a box to an aspect ratio about its centre. */
function fit([x0, y0, x1, y1]: Box, aspect: number): Box {
  let w = x1 - x0;
  let h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
}

const n = (v: number) => Math.round(v * 10) / 10;

function ringsPath(rings: Ring[]): string {
  return rings
    .map((r) => `M${r.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`)
    .join("");
}

function linesPath(lines: Ring[]): string {
  return lines.map((l) => `M${l.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}`).join("");
}

/** A faint survey grid at a round spacing, eight-ish lines across. */
function gridPath([x0, y0, x1, y1]: Box): string {
  const step = nice((x1 - x0) / 8);
  let d = "";
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) d += `M${n(x)} ${n(y0)}V${n(y1)}`;
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) d += `M${n(x0)} ${n(y)}H${n(x1)}`;
  return d;
}

type Props = {
  layer: MapLayer;
  kind: "main" | "closeup";
  /** Accessible description of what the plate shows. */
  label: string;
  /** Close-up only: the nearest point on the line, and the distance to it. */
  nearest?: Xy;
  distanceM?: number;
  /** Rendered in the plate's corner, e.g. the statewide locator. */
  children?: React.ReactNode;
};

export default function PrecinctPlate({ layer, kind, label, nearest, distanceM, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(kind === "main" ? 4 / 3 : 16 / 9);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vb = fit(layer.view, aspect);
  const [vx0, vy0, vx1, vy1] = vb;
  const vw = vx1 - vx0;
  const vh = vy1 - vy0;
  const pos = ([x, y]: Xy) => ({ left: `${((x - vx0) / vw) * 100}%`, top: `${((y - vy0) / vh) * 100}%` });

  const scale = nice(vw * 0.22);
  const match = layer.shapes.find((s) => s.role === "match");

  /*
   * In the close-up the server's label points crowd the pin: the widest run
   * of each side is the band right beside the line. So the two names are set
   * off the line instead — one either side, along the direction from the pin
   * to the line, and shifted along the line clear of the dimension callout.
   */
  const labelAt = new Map<string, Xy>();
  if (kind === "closeup" && nearest) {
    const len = Math.hypot(nearest[0], nearest[1]);
    if (len > 0.01) {
      const nx = nearest[0] / len;
      const ny = nearest[1] / len;
      // Tangent along the line, pointed rightward so labels sit to the right.
      let tx = -ny;
      let ty = nx;
      if (tx < 0) {
        tx = -tx;
        ty = -ty;
      }
      const off = Math.min(vw, vh) * 0.26;
      const along = vw * 0.2;
      const clampIn = ([x, y]: Xy): Xy => [
        Math.min(Math.max(x, vx0 + vw * 0.12), vx1 - vw * 0.12),
        Math.min(Math.max(y, vy0 + vh * 0.14), vy1 - vh * 0.14),
      ];
      labelAt.set("match", clampIn([-nx * off + tx * along, -ny * off + ty * along]));
      labelAt.set("across", clampIn([nearest[0] + nx * off + tx * along, nearest[1] + ny * off + ty * along]));
    }
  }
  /**
   * Neighbour codes are density, not information the visitor came for, so they
   * give way to the plate furniture: the north mark, the scale bar, and on the
   * main plate the statewide locator.
   */
  const clearOfFurniture = ([x, y]: Xy) => {
    const px = (x - vx0) / vw;
    const py = (y - vy0) / vh;
    if (px < 0.07 || px > 0.93 || py < 0.05 || py > 0.95) return false;
    if (px > 0.8 && py < 0.16) return false;
    if (px < 0.3 && py > 0.84) return false;
    if (kind === "main" && px > 0.52 && py > 0.7) return false;
    return true;
  };
  const labelFor = (role: string, fallback?: Xy): Xy | undefined => {
    const at = kind === "closeup" ? (labelAt.get(role) ?? (role === "neighbor" ? fallback : undefined)) : fallback;
    if (!at) return undefined;
    return role === "neighbor" && !clearOfFurniture(at) ? undefined : at;
  };

  return (
    <div className={`pl-plate pl-plate-${kind}`} ref={ref} role="img" aria-label={label}>
      <svg
        className="pl-plate-svg"
        viewBox={`${n(vx0)} ${n(vy0)} ${n(vw)} ${n(vh)}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`pl-match-fill-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pl-match)" stopOpacity="0.34" />
            <stop offset="1" stopColor="var(--pl-match)" stopOpacity="0.16" />
          </linearGradient>
          <filter id={`pl-lift-${kind}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy={vw * 0.006} stdDeviation={vw * 0.012} floodColor="#000" floodOpacity="0.7" />
          </filter>
        </defs>

        <path className="pl-grid" d={gridPath(vb)} vectorEffect="non-scaling-stroke" />

        {layer.shapes.map((s) => (
          <path
            key={`${s.county}|${s.id}`}
            className={`pl-shape pl-shape-${s.role}`}
            d={ringsPath(s.rings)}
            fillRule="evenodd"
            vectorEffect="non-scaling-stroke"
            fill={s.role === "match" ? `url(#pl-match-fill-${kind})` : undefined}
            filter={s.role === "match" ? `url(#pl-lift-${kind})` : undefined}
          />
        ))}

        {/* The match's outline again, stroke only, so it can draw itself in. */}
        {match ? (
          <path
            className="pl-outline"
            d={ringsPath(match.rings)}
            pathLength={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {layer.shared.length ? (
          <path className="pl-shared" d={linesPath(layer.shared)} vectorEffect="non-scaling-stroke" />
        ) : null}

        {kind === "closeup" && nearest ? (
          <path
            className="pl-dimension"
            d={`M0 0L${n(nearest[0])} ${n(nearest[1])}`}
            pathLength={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {/* Labels. Neighbours in small mono; the two that matter in display type. */}
      <div className="pl-labels" aria-hidden="true">
        {layer.shapes.map((s) => {
          const at = labelFor(s.role, s.label);
          return at ? (
            <span
              key={`l-${s.county}|${s.id}`}
              className={`pl-label pl-label-${s.role}`}
              style={pos(at)}
            >
              {s.id}
            </span>
          ) : null;
        })}
      </div>

      {kind === "closeup" && nearest && distanceM !== undefined ? (
        <>
          <span className="pl-dim-end" style={pos(nearest)} aria-hidden="true" />
          <span
            className="pl-dim-label"
            style={pos([nearest[0] / 2, nearest[1] / 2])}
            aria-hidden="true"
          >
            {fmtDistance(distanceM)}
          </span>
        </>
      ) : null}

      <span className="pl-pin" style={pos([0, 0])} aria-hidden="true">
        <span className="pl-pin-ring" />
        <span className="pl-pin-dot" />
      </span>

      {/* Width as a share of the plate, so the bar stays true at any size. */}
      <span className="pl-scale" style={{ width: `${(scale / vw) * 100}%` }} aria-hidden="true">
        <span className="pl-scale-bar" />
        <span className="pl-scale-text">{fmtDistance(scale)}</span>
      </span>
      <span className="pl-north" aria-hidden="true">
        N
      </span>

      {children}
    </div>
  );
}
