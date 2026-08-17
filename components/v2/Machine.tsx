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
 * server-rendered drawing and no JavaScript beyond this file — which is the
 * difference between degrading and simply not paying.
 *
 * It reads as an external store rather than an effect because that is what it
 * is: the answer lives in the platform, not in React, and it can change while
 * the page is open. Subscribing means a reduced-motion preference set
 * mid-session tears the canvas down and brings the drawing back, and a resize
 * across the 768px line is handled by the same path.
 *
 * Carried over unchanged from the Exploded Stack, which is the one part of that
 * attempt that was right.
 */

const MachineGL = dynamic(() => import("./MachineGL"), { ssr: false });

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
  // Below 768px the drawing is the better experience, not the lesser one: it
  // carries the whole machine, the marble still runs the route on scroll, and
  // it costs nothing on the connection most likely to be metered.
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

export default function Machine({
  children,
  callouts,
  readout,
  aspect,
  launchU,
}: {
  /** The server-rendered drawing. Sits under the canvas, in the same box. */
  children: ReactNode;
  /** The callout column. Its own grid track, so labels can never overlap the
      machine or push the page wider than the viewport at any width. */
  callouts: ReactNode;
  /** The terminal readout, as selectable text under the stage. */
  readout: ReactNode;
  /** The camera's aspect, so the frame and the frustum are the same rectangle. */
  aspect: number;
  /** Where the descent ends and the launch begins, in route distance. Passed in
      from the server rather than imported, so the geometry module stays out of
      the client bundle for the clients that never load the canvas. */
  launchU: number;
}) {
  const enhance = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      className="mx-stage"
      style={
        { "--mx-aspect": aspect, "--mx-launch": launchU } as React.CSSProperties
      }
    >
      <div className="mx-frame">
        {children}
        {enhance ? <MachineGL /> : null}
      </div>
      {callouts}
      {readout}
    </div>
  );
}
