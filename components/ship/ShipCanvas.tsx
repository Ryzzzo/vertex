"use client";

/**
 * The persistent canvas. Mounted once by the ship layout, never by a page.
 *
 * This component is reached only through a dynamic import that a Tier C client
 * never triggers, which is what makes "three is never requested on a
 * reduced-motion client" an assertion rather than a hope — the capture harness
 * checks it by watching the network, and it is the one gate that has to hold.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Capability } from "@/lib/ship/scene/capability";
import type { SceneManager } from "@/lib/ship/scene/SceneManager";
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

  // Held in a ref rather than state: the manager is not render data, and
  // putting a renderer in React state re-renders the tree on every mutation.
  const managerRef = useRef<SceneManager | null>(null);

  // The renderer's init is async, so the route effect below cannot simply read
  // the ref — on first run it is still null, and with a single open room the
  // slug never changes to retrigger it. That race left the scene mounted,
  // running, and empty. This flag is the join.
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Held in a ref so the room-swap effect does not re-run when the parent
  // hands down a new closure. Written in an effect rather than during render —
  // a ref mutated while rendering is not guaranteed to be the value React
  // commits.
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  const announce = useCallback(() => {
    readyRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let manager: SceneManager | null = null;

    async function boot() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const [{ SceneManager: Manager }, { pickQuality }] = await Promise.all([
          import("@/lib/ship/scene/SceneManager"),
          import("@/lib/ship/scene/quality"),
        ]);
        if (cancelled) return;

        const quality = pickQuality(capability.tier, window.innerWidth);
        manager = new Manager({
          canvas,
          tier: capability.tier,
          quality,
          reducedMotion: capability.reducedMotion,
        });

        await manager.init();
        if (cancelled) {
          manager.dispose();
          return;
        }

        managerRef.current = manager;
        manager.start();

        // Exposed for the capture harness, outside production. This is a
        // verification surface, not an API — and it exists because
        // `requestAnimationFrame` does not fire in a browser pane that is not
        // compositing, so looking at pixels needs a real instrument.
        if (process.env.NODE_ENV !== "production") {
          const m = manager;
          (window as unknown as Record<string, unknown>).__ship = {
            backend: () => m.backendName(),
            memory: () => m.memory(),
            room: () => m.currentRoom(),
            quality: quality.name,
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
      manager?.dispose();
      managerRef.current = null;
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as Record<string, unknown>).__ship;
      }
    };
    // Deliberately mount-once. The manager outlives every route change; a
    // dependency on `slug` here would rebuild the renderer per navigation,
    // which is the context-exhaustion failure this architecture exists to
    // prevent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Route → room. The only thing a navigation does to the scene. */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function swap() {
      const manager = managerRef.current;
      if (!manager || manager.currentRoom() === slug) return;

      const [{ loadRoom, ROOMS }, { pickQuality }] = await Promise.all([
        import("@/lib/ship/rooms"),
        import("@/lib/ship/scene/quality"),
      ]);
      const factory = await loadRoom(slug);
      if (cancelled || !factory) return;

      const seed = ROOMS.find((r) => r.slug === slug)?.seed ?? 1;
      const quality = pickQuality(capability.tier, window.innerWidth);

      // `scene.clear()` frees nothing on the GPU, so the room disposes itself
      // and this checks the result against the empty-scene baseline rather than
      // trusting it.
      const result = manager.unmount();
      if (process.env.NODE_ENV !== "production" && result.leaked) {
        console.warn(
          "[ship] room disposal did not return memory to baseline",
          result,
        );
      }

      manager.mount(slug, factory({ seed, quality, camera: manager.camera }));

      // Two frames of grace, so the handover lands on a painted canvas rather
      // than on the frame that asked for it.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) announce();
        });
      });
    }

    void swap();
    return () => {
      cancelled = true;
    };
  }, [slug, ready, capability.tier, announce]);

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
