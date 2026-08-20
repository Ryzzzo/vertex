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
import type { Capability } from "@/lib/ship/scene/capability";

// `ssr: false` because there is no renderer on the server, and the chunk this
// points at carries `three/webgpu`. It is requested only when this component
// actually renders — which a Tier C client never does.
const ShipCanvas = dynamic(() => import("./ShipCanvas"), { ssr: false });

export default function ShipShell() {
  const [capability, setCapability] = useState<Capability | null>(null);

  useEffect(() => {
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
  }, []);

  if (!capability || capability.tier === "none") return null;

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
