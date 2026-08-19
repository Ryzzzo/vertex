/**
 * Room module loader.
 *
 * Each compartment is its own chunk, so the shell pays for the renderer once
 * and a room costs only its own code. Rooms are procedural, so a "room chunk"
 * is kilobytes of generation code rather than megabytes of geometry — which is
 * what makes adjacency preloading a dynamic `import()` rather than a fetch, and
 * therefore cheap and cancellable.
 */
import type { RoomFactory } from "../scene/types";

export { ROOMS, DEFAULT_ROOM, getRoom, openRooms } from "../registry";
export type { Room, RoomStatus } from "../registry";

const LOADERS: Record<string, () => Promise<RoomFactory>> = {
  bridge: () => import("./bridge").then((m) => m.createBridge),
};

export function hasRoomModule(slug: string): boolean {
  return slug in LOADERS;
}

export async function loadRoom(slug: string): Promise<RoomFactory | null> {
  const loader = LOADERS[slug];
  return loader ? loader() : null;
}

/** Warm a room's chunk without mounting it. Fire-and-forget by design. */
export function preloadRoom(slug: string): void {
  LOADERS[slug]?.().catch(() => {
    // A failed preload is not an error — the room will simply load on demand.
  });
}
