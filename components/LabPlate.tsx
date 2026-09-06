"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The Lab plates as instruments rather than stills.
 *
 * `map`  — the NC Housing Terminal capture. Hovering zooms the plate and the
 *          map pans under the pointer, with a reticle where you are, so the
 *          visitor looks around the state the way they would in the real map.
 * `sql`  — the Query Grid capture. As the plate scrolls into view a query bar
 *          types the level-one solution, then the Run chip lights. The query
 *          is the real answer to the real puzzle on the board.
 *
 * Both are pointer/scroll driven, CSS-transitioned, and inert under reduced
 * motion — the still capture is the correct fallback.
 */
const LEVEL_ONE = "SELECT product, amount FROM refunds WHERE amount > 500 ORDER BY amount DESC;";

export default function LabPlate({
  kind,
  children,
}: {
  kind: "map" | "sql";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  /* Typing starts when the plate is actually on screen, once. */
  useEffect(() => {
    const el = ref.current;
    if (!el || kind !== "sql") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [kind]);

  /* The map pans under the pointer. */
  useEffect(() => {
    const el = ref.current;
    if (!el || kind !== "map") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let x = 50;
    let y = 50;
    const apply = () => {
      frame = 0;
      el.style.setProperty("--lx", `${x.toFixed(1)}%`);
      el.style.setProperty("--ly", `${y.toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width) * 100;
      y = ((e.clientY - r.top) / r.height) * 100;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [kind]);

  return (
    <div
      ref={ref}
      className={`lab-media lab-media-${kind}`}
      data-armed={armed ? "" : undefined}
    >
      {children}

      {kind === "map" ? (
        <div className="lab-reticle" aria-hidden="true">
          <span className="lab-reticle-h" />
          <span className="lab-reticle-v" />
          <span className="lab-reticle-tag">zoom · pan</span>
        </div>
      ) : null}

      {kind === "sql" ? (
        <div className="lab-query" aria-hidden="true" style={{ ["--chars" as string]: LEVEL_ONE.length }}>
          <span className="lab-query-prompt">query ›</span>
          <span className="lab-query-text">
            {LEVEL_ONE}
          </span>
          <span className="lab-query-run">Run</span>
        </div>
      ) : null}
    </div>
  );
}
