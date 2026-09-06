"use client";

import { useEffect } from "react";

/**
 * Spotlight borders. Panels carry a hairline that brightens where the pointer
 * is — the Linear/Vercel tell. One document-level pointermove, throttled to a
 * frame, writes `--mx`/`--my` (px, element-local) onto each panel the pointer
 * is near; the CSS draws the highlight as a masked gradient on ::before.
 *
 * Pointer devices only, and nothing under reduced motion — the border is an
 * effect, not information.
 */
const SELECTOR =
  ".card-face, .card-media:not(.card-flip), .schematic, .tokens, .terminal, .deploy-panel, .lab-media, .vx-card, .vx-kpi";

const REACH = 320;

export default function Spotlight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    let nodes: HTMLElement[] = [];

    const collect = () => {
      nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
      nodes.forEach((n) => n.classList.add("spot"));
    };

    const apply = () => {
      frame = 0;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        const near =
          x > r.left - REACH && x < r.right + REACH && y > r.top - REACH && y < r.bottom + REACH;
        if (!near) {
          if (n.dataset.spot) delete n.dataset.spot;
          continue;
        }
        n.style.setProperty("--mx", `${(x - r.left).toFixed(0)}px`);
        n.style.setProperty("--my", `${(y - r.top).toFixed(0)}px`);
        n.dataset.spot = "";
      }
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    collect();
    const observer = new MutationObserver(() => collect());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
