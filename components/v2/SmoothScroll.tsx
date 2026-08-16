"use client";

import { useEffect } from "react";

/**
 * Lenis — 5.5 kB gzipped, and the largest change to how a page feels per
 * kilobyte on the list. It replaces the browser's stepped scroll response with
 * an eased virtual scroll.
 *
 * It is also a system behaviour the user did not ask to have changed, so the
 * rules around it are strict and all of them are honoured here:
 *
 *   · disabled outright under `prefers-reduced-motion` — an eased virtual
 *     scroll is exactly the class of motion that preference is asking to stop
 *   · disabled on coarse pointers, where native momentum is better than
 *     anything a library can synthesise
 *   · never traps scroll: no wrapper element, no `overflow: hidden`, and the
 *     document keeps scrolling natively if this component never mounts
 *   · in-page anchors are routed through Lenis so `#da-proof` still lands, and
 *     still lands instantly for anyone who has asked for less motion
 *
 * Dropping it is deleting one element from `app/v2/page.tsx`; nothing else in
 * the hero reads from it, and the scroll score reads `window.scrollY`, which
 * Lenis keeps truthful.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;

      const lenis = new Lenis({
        // Long-tail decay, chosen to sit in the same family as the page's one
        // easing curve rather than to introduce a second feel.
        lerp: 0.11,
        wheelMultiplier: 1,
        touchMultiplier: 1,
        autoRaf: true,
      });

      const onAnchor = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
        const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
        const href = a?.getAttribute("href");
        if (!href || href === "#") return;
        const el = document.querySelector(href);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el as HTMLElement, { offset: -8 });
        // Keep the URL and the focus ring honest — smooth scrolling must not
        // cost the keyboard path.
        history.pushState(null, "", href);
        (el as HTMLElement).focus?.({ preventScroll: true });
      };
      document.addEventListener("click", onAnchor);

      const onReduced = () => {
        if (reduced.matches) lenis.destroy();
      };
      reduced.addEventListener("change", onReduced);

      cleanup = () => {
        document.removeEventListener("click", onAnchor);
        reduced.removeEventListener("change", onReduced);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
