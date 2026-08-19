/**
 * The ship's compartment registry.
 *
 * Single source of truth. `generateStaticParams` reads it, the HUD renders from
 * it, the scene looks up its module by `slug`, `sitemap.ts` reads it, and every
 * room's metadata comes from it. Adding a compartment is one entry here plus
 * one module under `lib/ship/rooms/`.
 *
 * `seed` and `params` are content, not implementation. A room's look is a seed
 * plus parameters, which makes it reproducible, diffable and art-directable
 * without touching geometry — a rib-spacing change should be a one-line diff
 * you can read in a pull request.
 */

export type RoomStatus = "open" | "sealed";

export type Room = {
  slug: string;
  /** Ship-computer designation. Shown in the HUD. */
  designation: string;
  /** Page <h1>. */
  title: string;
  /** One line under the title, and the meta description. */
  blurb: string;
  status: RoomStatus;
  /** Deterministic seed for this room's procedural generation. */
  seed: number;
  /**
   * One sentence describing the compartment for a screen reader, since the
   * canvas is aria-hidden. Lives here so it cannot be forgotten when a room is
   * added.
   */
  described: string;
  /** When a sealed room opens. Shown on the tile so a lock reads as scheduled. */
  opens?: string;
};

export const ROOMS: Room[] = [
  {
    slug: "bridge",
    designation: "01 · BRIDGE",
    title: "Custom software that ships.",
    blurb: "One developer, from architecture to deploy.",
    status: "open",
    seed: 1701,
    described:
      "The bridge of a ship: a symmetric room with a wide viewport looking out onto a gas giant, flanked by six crew consoles, with a command chair on a raised dais at the centre.",
  },
  {
    slug: "portfolio",
    designation: "02 · PORTFOLIO BAY",
    title: "Four in production.",
    blurb: "Client work, running and paid for.",
    status: "sealed",
    seed: 2258,
    described:
      "A long bay with completed project work mounted as lit panels along both walls.",
    opens: "Phase 1b",
  },
  {
    slug: "labs",
    designation: "03 · LABS BAY",
    title: "Things built to find out.",
    blurb: "Interface studies and working prototypes.",
    status: "sealed",
    seed: 3312,
    described:
      "A workshop compartment holding interactive prototypes at separate work stations.",
    opens: "Phase 1d",
  },
  {
    slug: "engineering",
    designation: "04 · ENGINEERING",
    title: "How it gets built.",
    blurb: "Method, stack, and the reasoning behind both.",
    status: "sealed",
    seed: 4471,
    described:
      "An engine room housing the reactor that drives the ship, with heavier structure than the decks above it.",
    opens: "Phase 1c",
  },
  {
    slug: "comms",
    designation: "05 · COMMS",
    title: "Start a project.",
    blurb: "One terminal, one channel out.",
    status: "sealed",
    seed: 5590,
    described:
      "A small communications compartment with a single terminal for outbound contact.",
    opens: "Phase 1c",
  },
];

export const DEFAULT_ROOM = "bridge";

export function getRoom(slug: string): Room | undefined {
  return ROOMS.find((r) => r.slug === slug);
}

export function openRooms(): Room[] {
  return ROOMS.filter((r) => r.status === "open");
}
