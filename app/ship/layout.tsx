/**
 * The persistent shell.
 *
 * Next's App Router preserves a layout across navigation between its child
 * segments, so this mounts the canvas and the ship computer exactly once and
 * `app/ship/[room]/page.tsx` swaps beneath them. One GL context for the whole
 * ship, real shareable URLs per compartment.
 *
 * This is the load-bearing file in the multi-room architecture. Moving the
 * canvas into a page would mount a renderer per route, which exhausts WebGL
 * contexts and presents as "context lost" several rooms in — after the build
 * looks finished.
 */
import type { Metadata } from "next";
import ShipShell from "@/components/ship/ShipShell";
import Hud from "@/components/ship/Hud";
import { shipVars } from "@/lib/ship/palette";
import "@/components/ship/ship.css";

export const metadata: Metadata = {
  // Rooms are shareable, so each sets its own title; this is the suffix.
  title: { default: "Ship", template: "%s · Vertex" },
};

export default function ShipLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="ship" style={shipVars() as React.CSSProperties}>
      <a className="ship-skip" href="#readout">
        Skip to compartment details
      </a>
      <ShipShell />
      {children}
      <Hud />
    </div>
  );
}
