"use client";

import { useEffect, useRef } from "react";

/**
 * Counts a formatted figure up from zero on mount — "$4,280" arrives as
 * $0 → $4,280 with the prefix, thousands separators and any suffix preserved.
 *
 * Renders the final value in the server HTML, so a crawler, a screen reader
 * and a reduced-motion visitor all read the real number; the count runs only
 * after hydration on clients that have not asked for reduced motion.
 */
const EASE = (t: number) => 1 - Math.pow(1 - t, 3);

export default function CountUp({
  value,
  delay = 0,
  duration = 1100,
}: {
  value: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const match = value.match(/^([^\d]*)([\d,]+)(.*)$/);
    if (!match) return;
    const [, prefix, digits, suffix] = match;
    const target = Number(digits.replace(/,/g, ""));
    if (!Number.isFinite(target)) return;
    const grouped = digits.includes(",");

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / duration, 1);
      const n = Math.round(target * EASE(t));
      el.textContent = `${prefix}${grouped ? n.toLocaleString("en-US") : n}${suffix}`;
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    el.textContent = `${prefix}0${suffix}`;
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      el.textContent = value;
    };
  }, [value, delay, duration]);

  return <span ref={ref}>{value}</span>;
}
