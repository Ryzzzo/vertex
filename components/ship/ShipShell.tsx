"use client";

/**
 * The shell: capability gate, canvas host, and the handover from drawing to
 * scene.
 *
 * Mounted by `app/ship/layout.tsx`, which means it survives every navigation
 * between rooms. That is the whole architecture — one renderer, one context,
 * real URLs — and it is why nothing below is keyed on the route.
 *
 * The handover is deliberately one-directional and late: the drawing is the
 * first paint on every client and stays until a frame has genuinely rendered.
 * Fading it on "the module loaded" would reveal a black canvas, and a page that
 * shows less after loading more is the worst possible read.
 */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { Capability } from "@/lib/ship/scene/capability";

// `ssr: false` because there is no renderer on the server, and the chunk this
// points at carries `three/webgpu`. It is requested only when this component
// actually renders — which a Tier C client never does.
const ShipCanvas = dynamic(() => import("./ShipCanvas"), { ssr: false });

/**
 * Compartments served by a pre-rendered frame rather than the renderer. The canvas is
 * mounted by the ship layout, so without this it would still boot behind the photoreal
 * plate — a WebGPU context, the room's geometry and the whole `three` chunk, all
 * downloaded to sit invisibly under an opaque image.
 */
const PRERENDERED = new Set(["/ship/bridge"]);

export default function ShipShell() {
  const pathname = usePathname();
  const prerendered = PRERENDERED.has(pathname);
  const [capability, setCapability] = useState<Capability | null>(null);

  useEffect(() => {
    if (prerendered) return;
    let cancelled = false;

    void (async () => {
      const { detectCapability } = await import("@/lib/ship/scene/capability");
      const cap = await detectCapability();
      if (cancelled) return;
      setCapability(cap);

      // Announce the decision on the root element so CSS can respond and the
      // capture harness can read it without touching React internals.
      document.documentElement.dataset.shipTier = cap.tier;
      if (cap.reducedMotion) document.documentElement.dataset.shipMotion = "reduced";
    })();

    return () => {
      cancelled = true;
      delete document.documentElement.dataset.shipTier;
      delete document.documentElement.dataset.shipMotion;
      delete document.documentElement.dataset.shipScene;
    };
    // `prerendered` belongs here. This component is mounted by the layout and survives
    // navigation between compartments, so with an empty dep list a visitor who arrived
    // on the bridge and then walked to another room would take the early return once
    // and never detect capability again — every later room would be blank.
  }, [prerendered]);

  if (prerendered || !capability || capability.tier === "none") return null;

  return (
    <ShipCanvas
      capability={capability}
      onReady={() => {
        // `ShipCanvas` already waits two frames past the room mount before
        // calling this, so by here there is genuinely something to hand over to.
        document.documentElement.dataset.shipScene = "live";
      }}
    />
  );
}
