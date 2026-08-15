"use client";

import { useEffect } from "react";

/**
 * Scroll-driven CSS is the primary path; this is the fallback for browsers
 * that don't have it yet — Firefox stable still keeps `animation-timeline`
 * behind `layout.css.scroll-driven-animations.enabled`.
 *
 * The order matters for correctness. Nothing is hidden until this component
 * has run and confirmed both that the CSS timeline is missing *and* that the
 * user has not asked for reduced motion. A browser that never executes this —
 * no JS, a crawler, a hard failure — keeps the finished layout, because
 * `.da-reveal` is styled visible by default and only the `[data-da-io]`
 * attribute switches it to the animated pair of states.
 */
export default function RevealFallback() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (CSS.supports?.("animation-timeline: view()")) return;

    const root = document.documentElement;
    root.dataset.daIo = "";

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.seen = "";
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    const targets = document.querySelectorAll<HTMLElement>(".da-reveal");
    targets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      delete root.dataset.daIo;
      targets.forEach((el) => delete el.dataset.seen);
    };
  }, []);

  return null;
}
