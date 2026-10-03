"use client";

import { useEffect, useRef } from "react";
import Shot from "@/components/Shot";
import type { Lake } from "@/lib/lakeWater";

/**
 * The Drowned Hollow's picture on /games: the drawdown key art with its lake
 * alive. The still is an ordinary <Shot>; a WebGL canvas over it moves only
 * the water (lib/lakeWater.ts says how), flickers the lantern, and lets the
 * pointer trail rings across the lake.
 *
 * The still is always there underneath and is what everyone gets first. The
 * canvas joins only when the picture is near the viewport, for a visitor who
 * has not asked for reduced motion and whose browser has WebGL2; it fades in
 * over a frame that matches the still, then the motion eases up from nothing.
 * It stops drawing whenever the picture is off screen or the tab is hidden.
 *
 * The title link's ::after is stretched over the whole card, so pointer
 * events land on the link, not on the canvas. The listeners go on the
 * enclosing <article> and are measured against the canvas's own box. Only a
 * mouse stirs the water: a tap on the card is a tap on the link.
 */

/* Not under /games/drowned-hollow/: next.config.ts rewrites that whole prefix to the game's own zone
   before this app's public folder is consulted, so files placed there would 404. */
const DIR = "/games/media/drowned-hollow";

export default function LakeCover({ alt, sizes, priority = false }: { alt: string; sizes: string; priority?: boolean }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    const canvas = el?.querySelector("canvas");
    const img = el?.querySelector("img");
    const card = el?.closest("article");
    if (!el || !canvas || !img || !card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let lake: Lake | null = null;
    let visible = false;
    const sync = () => lake?.setRunning(visible && document.visibilityState === "visible");

    const start = async () => {
      try {
        const { createLake } = await import("@/lib/lakeWater");
        const made = await createLake({ canvas, image: img, auxUrl: `${DIR}/lake-aux.webp`, lampUrl: `${DIR}/lake-lamp.webp` });
        if (disposed) {
          made?.destroy();
          return;
        }
        if (!made) return;
        lake = made;
        el.dataset.live = "";
        sync();
      } catch {
        // no lake, just the still: it is the same picture
      }
    };

    // start once the picture is close; after that, only draw while it is on screen
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (e.isIntersecting && !started) {
          started = true;
          void start();
        }
        visible = e.intersectionRatio > 0;
        sync();
      },
      { rootMargin: "200px 0px", threshold: [0, 0.01] },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    const move = (e: PointerEvent) => {
      if (!lake || e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      lake.pointer(x < 0 || x > 1 || y < 0 || y > 1 ? null : x, y);
    };
    const leave = () => lake?.pointer(null, 0);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);

    return () => {
      disposed = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
      lake?.destroy();
      lake = null;
      delete el.dataset.live;
    };
  }, []);

  return (
    <div ref={box} className="lake">
      <Shot src={`${DIR}/lake.avif`} alt={alt} sizes={sizes} priority={priority} className="lake-still" />
      <canvas className="lake-canvas" aria-hidden="true" />
    </div>
  );
}
