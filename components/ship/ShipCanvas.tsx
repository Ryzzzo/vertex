"use client";

/**
 * The persistent canvas. Mounted once by the ship layout, never by a page.
 *
 * Exactly one dynamic import in this file, and that is a constraint rather than
 * a style choice — see `lib/ship/scene/bootstrap.ts`. Two boundaries put two
 * complete copies of three in the bundle and doubled the shell.
 *
 * This component is reached only through a dynamic import that a Tier C client
 * never triggers, which is what makes "three is never requested on a
 * reduced-motion client" an assertion rather than a hope.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Capability } from "@/lib/ship/scene/capability";
import type { Scene } from "@/lib/ship/scene/bootstrap";
import { DEFAULT_ROOM } from "@/lib/ship/registry";

type Props = {
  capability: Capability;
  /**
   * Fired once a room is mounted AND has rendered, so the shell can lift the
   * drawing. Deliberately not fired on renderer init: a handover that lands on
   * an initialised-but-empty canvas replaces a correct drawing with a black
   * rectangle, and a page that shows less after loading more is the worst
   * possible read.
   */
  onReady?: () => void;
};

/** Slug for the current route. `/ship` and `/ship/` both mean the bridge. */
function slugFrom(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[1] ?? DEFAULT_ROOM;
}

export default function ShipCanvas({ capability, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const slug = slugFrom(pathname);

  // Held in a ref rather than state: the scene is not render data, and putting
  // a renderer in React state re-renders the tree on every mutation.
  const sceneRef = useRef<Scene | null>(null);

  // The renderer's init is async, so the route effect below cannot simply read
  // the ref — on first run it is still null, and with a single open room the
  // slug never changes to retrigger it. That race left the scene mounted,
  // running, and empty.
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  const announce = useCallback(() => {
    readyRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let scene: Scene | null = null;

    async function boot() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const { createScene } = await import("@/lib/ship/scene/bootstrap");
        if (cancelled) return;

        scene = await createScene({ canvas, capability });
        if (cancelled) {
          scene.manager.dispose();
          return;
        }

        sceneRef.current = scene;
        scene.manager.start();

        // Exposed for the capture harness, outside production. This is a
        // verification surface, not an API — and it exists because
        // `requestAnimationFrame` does not fire in a browser pane that is not
        // compositing, so looking at pixels needs a real instrument.
        if (process.env.NODE_ENV !== "production") {
          const s = scene;
          (window as unknown as Record<string, unknown>).__ship = {
            backend: () => s.manager.backendName(),
            memory: () => s.manager.memory(),
            room: () => s.manager.currentRoom(),
            quality: s.quality.name,
            capability,
          };
        }

        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      scene?.manager.dispose();
      sceneRef.current = null;
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as Record<string, unknown>).__ship;
      }
    };
    // Deliberately mount-once. The renderer outlives every route change; a
    // dependency on `slug` here would rebuild it per navigation, which is the
    // context-exhaustion failure this architecture exists to prevent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Route → room. The only thing a navigation does to the scene. */
  useEffect(() => {
    if (!ready) return;
    const scene = sceneRef.current;
    if (!scene) return;

    let cancelled = false;
    if (!scene.enter(slug)) return;

    // Two frames of grace, so the handover lands on a painted canvas rather
    // than on the frame that asked for it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) announce();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [slug, ready, announce]);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      className="ship-canvas"
      aria-hidden="true"
      // The canvas carries no information a screen reader can use. Every room's
      // content is real DOM beneath it, which is also the entire SEO story.
      tabIndex={-1}
    />
  );
}
