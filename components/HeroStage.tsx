"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import VertexDashboardMockup from "./VertexDashboardMockup";
import type { Commit } from "@/lib/shiplog";

/* The site's one curve — see --easing-linear in globals.css. */
const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * The tilted stage. A band holding the console rotated back into the page, so
 * the hero shows a real working surface at an angle rather than a picture of
 * one. The dashboard inside is live DOM — rotating it in 3D keeps every edge
 * and glyph resolution-independent, which a screenshot would not.
 *
 * Two things respond to the visitor once the console has booted:
 *
 *   - The plane leans a couple of degrees toward the pointer. It is a real
 *     object on a real surface, and objects on a surface catch your eye when
 *     you move around them.
 *   - A specular sheen on the glass follows the pointer, so the console reads
 *     as lit from where you are standing rather than painted flat.
 *
 * Both are driven by two custom properties (`--px`, `--py`, each −1…1) set
 * from a rAF-throttled pointermove, and consumed by CSS transforms and
 * gradients only — nothing here forces layout or repaints type.
 *
 * Under reduced motion the whole thing renders at its final position with no
 * entrance, no scroll coupling and no pointer coupling: a still frame of the
 * same image, rather than the same movement played slowly.
 */
export default function HeroStage({
  shiplog,
  buildSha,
}: {
  shiplog: Commit[];
  buildSha: string;
}) {
  const reduced = useReducedMotion();
  const [drift, setDrift] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setDrift(Math.min(window.scrollY / 300, 1) * -20);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      frame = 0;
      stage.style.setProperty("--px", px.toFixed(3));
      stage.style.setProperty("--py", py.toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      px = 0;
      py = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    /* Listen on the section so the copy column steers the plane too. */
    const target = stage.closest("section") ?? stage;
    target.addEventListener("pointermove", onMove, { passive: true });
    target.addEventListener("pointerleave", onLeave);
    return () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div className="hero-stage" ref={stageRef}>
      {/* Atmosphere: two slow-breathing colour fields, masked so they dissolve
          into the page instead of ending. Layers, not filters. */}
      <div className="hero-aurora hero-aurora-a" />
      <div className="hero-aurora hero-aurora-b" />

      <div
        className="hero-stage-perspective"
        style={{ transform: `translateY(${reduced ? 0 : drift}px)` }}
      >
        <motion.div
          className="hero-stage-plane"
          initial={reduced ? false : "hidden"}
          animate="shown"
          variants={{
            hidden: { opacity: 0 },
            shown: {
              opacity: 1,
              transition: {
                delay: 0.35,
                duration: 0.9,
                ease: EASE,
                staggerChildren: 0.25,
                delayChildren: 0.35,
              },
            },
          }}
        >
          <VertexDashboardMockup shiplog={shiplog} buildSha={buildSha} />
          {/* The glass. Sits over the console and carries the pointer sheen. */}
          <div className="hero-stage-sheen" aria-hidden="true" />
        </motion.div>
        {/* Light the console throws onto the page beneath it. */}
        <div className="hero-stage-spill" aria-hidden="true" />
      </div>

      {/* Ground fade — the stage dissolves into the page rather than ending.
          Painted last so it sits over the plane. */}
      <div className="hero-stage-fade" />
      {/* Keeps the copy column legible where the plane runs under it. */}
      <div className="hero-stage-scrim" />
    </div>
  );
}
