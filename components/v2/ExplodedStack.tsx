"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore, type ReactNode } from "react";

/**
 * The capability gate, and the only place that decides whether three.js is
 * downloaded at all.
 *
 * `ssr: false` plus a gate that resolves after hydration means the WebGL chunk
 * is never requested on a narrow viewport, under reduced motion, on Save-Data,
 * on a low-memory device, or where WebGL 2 is missing. Those clients get the
 * server-rendered SVG and no JavaScript beyond this file — which is the
 * difference between degrading and simply not paying.
 *
 * It reads as an external store rather than an effect because that is what it
 * is: the answer lives in the platform, not in React, and it can change while
 * the page is open. Subscribing means a reduced-motion preference set
 * mid-session tears the canvas down and brings the drawing back, and a resize
 * across the 768px line is handled by the same path.
 *
 * The stage box is reserved from the drawing's own bounds and holds its size
 * in both modes, so the swap from SVG to canvas shifts nothing (CLS).
 */

const ExplodedStackGL = dynamic(() => import("./ExplodedStackGL"), {
  ssr: false,
});

/** Probing WebGL 2 costs a real context, so the answer is taken once. */
let webgl2: boolean | null = null;
function hasWebGL2() {
  if (webgl2 !== null) return webgl2;
  try {
    const gl = document
      .createElement("canvas")
      .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    webgl2 = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

const QUERIES = ["(prefers-reduced-motion: reduce)", "(max-width: 767px)"];

function subscribe(onChange: () => void) {
  const mqs = QUERIES.map((q) => window.matchMedia(q));
  for (const m of mqs) m.addEventListener("change", onChange);
  return () => {
    for (const m of mqs) m.removeEventListener("change", onChange);
  };
}

function getSnapshot() {
  if (window.matchMedia(QUERIES[0]).matches) return false;
  // Below 768px the SVG is the better experience, not the lesser one: it
  // carries the whole drawing, separates on scroll through CSS, and costs
  // nothing on the connection most likely to be metered.
  if (window.matchMedia(QUERIES[1]).matches) return false;

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  if (conn?.saveData) return false;

  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem < 4) return false;

  return hasWebGL2();
}

/** The server has no capabilities to report, so it renders the drawing alone. */
const getServerSnapshot = () => false;

export default function ExplodedStack({
  children,
  callouts,
  aspect,
  zoom,
}: {
  /** The server-rendered drawing. Sits under the canvas, in the same box. */
  children: ReactNode;
  /** The callout column. Its own grid track, so labels can never overlap the
      drawing or push the page wider than the viewport at any width. */
  callouts: ReactNode;
  /** Computed on the server from the drawing's own bounds, so the geometry
      module never crosses into the client bundle just to reserve a box. */
  aspect: number;
  /** How much larger the drawing sits at rest, before it separates into the
      headroom the frame reserves for the exploded pose. */
  zoom: number;
}) {
  const enhance = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      className="xs-stage"
      style={
        { "--xs-aspect": aspect, "--xs-zoom": zoom } as React.CSSProperties
      }
    >
      <div className="xs-frame">
        {children}
        {enhance ? <ExplodedStackGL /> : null}
      </div>
      {callouts}
    </div>
  );
}
