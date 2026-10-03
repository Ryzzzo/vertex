"use client";
/* eslint-disable @next/next/no-img-element -- explicit srcsets per layer, for the reason Shot.tsx gives: the
   optimizer would hand every layer one oversized source, and these are swapped in by hand on demand. */

import { useEffect, useRef } from "react";

/**
 * The Drowned Hollow's picture on /games: the game's own mechanic in one
 * gesture. Six stills of the main room, captured from the game itself at six
 * water heights (dry at nine o'clock to drowned at ten to twelve). Over the
 * picture the waterline follows the pointer's height — high at the top, gone at
 * the bottom — and when the pointer leaves, the river comes back.
 *
 * Why stills and not the game's shader: the shader needs the room's geometry
 * buffer and three.js, which is the whole game. Six captures are about 150 KB
 * at the width this is shown at, and they are the real renders.
 *
 * Layers stack dry-to-drowned in DOM order, so the layer at floor(level) sits
 * fully opaque and only the one above it fades. Cross-fading two half-opaque
 * layers instead would let the dark ground show through mid-way and dim the
 * picture on every move.
 *
 * Only for a fine pointer that can hover, and never under reduced motion:
 * everyone else gets the drowned room as a still, which is the picture the
 * game opens on. The other five stills are fetched only when the picture is
 * near the viewport for a visitor who can use them.
 *
 * The title link's ::after is stretched over the whole card, so pointer
 * events land on the link, not on this element. The listeners go on the
 * enclosing <article> and are measured against this element's own box.
 */

const TOP = 5; // index of the drowned still
const WIDTHS = [640, 960, 1280, 1920] as const;
/* Not under /games/drowned-hollow/: next.config.ts rewrites that whole prefix to the game's own zone
   before this app's public folder is consulted, so files placed there would 404. */
const DIR = "/games/media/drowned-hollow";

const srcSet = (i: number) => WIDTHS.map((w) => `${DIR}/waterline-${i}-${w}.webp ${w}w`).join(", ");

export default function Waterline({ alt, sizes, priority = false }: { alt: string; sizes: string; priority?: boolean }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    const card = el?.closest("article");
    if (!el || !card) return;
    const can = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!can.matches) return;

    const layers = Array.from(el.querySelectorAll<HTMLImageElement>("img[data-level]"));
    let level = TOP;
    let target = TOP;
    let frame = 0;
    let last = 0;
    let armed = false;
    let ready = false;

    const paint = () => {
      const base = Math.floor(level);
      const frac = level - base;
      for (const img of layers) {
        const i = Number(img.dataset.level);
        img.style.opacity = i <= base ? "1" : i === base + 1 ? frac.toFixed(3) : "0";
      }
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      // the room's water has weight: it eases toward the pointer, never jumps
      level += (target - level) * (1 - Math.exp(-dt * 7));
      if (Math.abs(target - level) < 0.002) level = target;
      paint();
      frame = level === target ? 0 : requestAnimationFrame(tick);
      if (!frame) last = 0;
    };
    const go = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    // fetch the other five stills once the picture is close, and follow only when they have all arrived
    const arm = () => {
      if (armed) return;
      armed = true;
      let left = layers.length;
      for (const img of layers) {
        const done = () => {
          left -= 1;
          if (left === 0) {
            ready = true;
            el.dataset.ready = "";
          }
        };
        if (img.dataset.srcset) {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          img.sizes = sizes;
          img.srcset = img.dataset.srcset;
          delete img.dataset.srcset;
        } else if (img.complete) done();
        else img.addEventListener("load", done, { once: true });
      }
    };
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && arm(), { rootMargin: "300px 0px" });
    io.observe(el);

    const move = (e: PointerEvent) => {
      if (!ready || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        target = TOP;
      } else {
        const t = (e.clientY - r.top) / r.height;
        target = Math.min(TOP, Math.max(0, (1 - t) * TOP * 1.08));
      }
      go();
    };
    const leave = () => {
      target = TOP;
      go();
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    el.dataset.live = "";

    return () => {
      io.disconnect();
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
      delete el.dataset.live;
      delete el.dataset.ready;
    };
  }, [sizes]);

  return (
    <div ref={box} className="waterline">
      {Array.from({ length: TOP + 1 }, (_, i) =>
        i === TOP ? (
          <img
            key={i}
            data-level={i}
            src={`${DIR}/waterline-${i}-1280.webp`}
            srcSet={srcSet(i)}
            sizes={sizes}
            alt={alt}
            width={1920}
            height={1080}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
        ) : (
          <img
            key={i}
            data-level={i}
            data-srcset={srcSet(i)}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            decoding="async"
            style={{ opacity: 0 }}
          />
        ),
      )}
    </div>
  );
}
