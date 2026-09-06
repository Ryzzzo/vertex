"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "how-i-build", label: "Method" },
  { id: "selected-work", label: "Work" },
  { id: "lab", label: "Lab" },
  { id: "contact", label: "Contact" },
] as const;

/**
 * In-page navigation with an active state, and a hairline progress line.
 *
 * The page is nine and a half thousand pixels tall; without this the header
 * offered one link. Active section comes from an IntersectionObserver on the
 * section headings' parents, progress from scroll position — both throttled
 * to a frame, both CSS-only to paint.
 */
export default function HeaderNav() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const targets = SECTIONS.map((s) => document.getElementById(s.id)?.closest("section")).filter(
      (el): el is HTMLElement => !!el,
    );

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
        header?.style.setProperty("--progress", p.toFixed(4));
        setScrolled(window.scrollY > 24);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let io: IntersectionObserver | undefined;
    if (targets.length) {
      io = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible) {
            const id = visible.target.querySelector("h2")?.id ?? null;
            setActive(id);
          } else if (window.scrollY < 200) {
            setActive(null);
          }
        },
        { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.25] },
      );
      targets.forEach((t) => io!.observe(t));
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      io?.disconnect();
    };
  }, []);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    if (scrolled) header.dataset.scrolled = "";
    else delete header.dataset.scrolled;
  }, [scrolled]);

  return (
    <>
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          className="site-nav-link site-nav-section"
          href={`/#${s.id}`}
          aria-current={active === s.id ? "location" : undefined}
        >
          {s.label}
        </a>
      ))}
    </>
  );
}
