"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import VertexDashboardMockup from "./VertexDashboardMockup";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The tilted stage. A full-bleed band holding the console rotated back into the
 * page, so the hero shows a real working surface at an angle rather than a
 * picture of one. The dashboard inside is live DOM — rotating it in 3D keeps
 * every edge and glyph resolution-independent, which a screenshot would not.
 *
 * Under reduced motion the whole thing renders at its final position with no
 * entrance and no scroll coupling: a still frame of the same image, rather than
 * the same movement played slowly.
 */
export default function HeroStage() {
  const reduced = useReducedMotion();
  const [drift, setDrift] = useState(0);

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

  return (
    <div className="hero-stage">
      {/* The single chromatic note behind the whole composition. */}
      <div className="hero-stage-glow" />

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
                delay: 0.5,
                duration: 1,
                ease: EASE,
                staggerChildren: 0.3,
                delayChildren: 0.5,
              },
            },
          }}
        >
          <VertexDashboardMockup />
        </motion.div>
      </div>

      {/* Ground fade — the stage dissolves into the page rather than ending.
          Painted last so it sits over the plane. */}
      <div className="hero-stage-fade" />
    </div>
  );
}
