/**
 * The single dynamic-import boundary for everything that touches three.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 *
 * It was two boundaries: `ShipCanvas` imported `SceneManager` in one dynamic
 * chunk and the room loader in another. Both graphs import `three/webgpu`, and
 * while the bundler deduped them at first, adding the environment generator and
 * the post chain grew one graph enough that it stopped — and the build emitted
 * **two chunks of 254.5 KB each**, one complete copy of three per boundary.
 * Shell total went from 268.8 KB to 528.9 KB against a 300 KB gate.
 *
 * That failure is invisible in the source and invisible in the browser. Only
 * the byte measurement finds it, which is exactly why the gate is a script and
 * not a habit.
 *
 * The fix is not a bundler alias, because a heuristic that changed once will
 * change again. One boundary can only produce one copy. Rooms are procedural
 * and cost single-digit kilobytes each, so bundling all five with the scene
 * costs far less than the duplication it prevents — and the moment a room is
 * expensive enough to want its own chunk, it can have one deliberately rather
 * than by accident.
 */
import { SceneManager } from "./SceneManager";
import { pickQuality, type QualityTier } from "./quality";
import { createBridge } from "../rooms/bridge";
import { ROOMS } from "../registry";
import type { RoomFactory } from "./types";
import type { Capability } from "./capability";

const FACTORIES: Record<string, RoomFactory> = {
  bridge: createBridge,
};

export function hasRoom(slug: string): boolean {
  return slug in FACTORIES;
}

export type Scene = {
  manager: SceneManager;
  /** Mount a compartment by slug. Returns false if that room has no module. */
  enter(slug: string): boolean;
  quality: QualityTier;
};

export async function createScene(opts: {
  canvas: HTMLCanvasElement;
  capability: Capability;
}): Promise<Scene> {
  const quality = pickQuality(opts.capability.tier, window.innerWidth);

  const manager = new SceneManager({
    canvas: opts.canvas,
    tier: opts.capability.tier,
    quality,
    reducedMotion: opts.capability.reducedMotion,
  });

  await manager.init();

  return {
    manager,
    quality,
    enter(slug) {
      const factory = FACTORIES[slug];
      if (!factory) return false;
      if (manager.currentRoom() === slug) return true;

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

      const seed = ROOMS.find((r) => r.slug === slug)?.seed ?? 1;
      manager.mount(slug, factory({ seed, quality, camera: manager.camera }));
      return true;
    },
  };
}
