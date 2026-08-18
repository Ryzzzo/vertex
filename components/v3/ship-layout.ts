/**
 * Where everything is, in world units. One metre per unit.
 *
 * This file exists because of the failure recorded in the v2 decisions log §9
 * ("one number, two renderers"): the callout ladder was positioned from two
 * hand-read constants, the geometry from another set, and they agreed closely
 * enough that the error read as a moved object rather than as a wrong step.
 *
 * So the camera score, the geometry builders, the interaction hit targets and
 * the SVG fallback all import their positions from here. Moving a console is
 * one edit, and the camera follows it.
 *
 * ── The room ──────────────────────────────────────────────────────────────
 *
 * The bridge is a real interior, not a backdrop with props. Camera eye level
 * sits at 1.62; the ceiling is at 4.4, which is high enough that a person
 * standing on the deck reads as small in it. The viewport is a cylindrical
 * section rather than a flat plane, because the give-away on every cheap sci-fi
 * interior is a window that is obviously a quad — the horizon line stays
 * straight as the camera pans instead of bending with the glass.
 */

/** Deck plane. Everything sits on this. */
export const DECK_Y = 0;
/** Ceiling plane. LED strips run just under it. */
export const CEIL_Y = 4.4;
/** Eye level for a seated pilot, and the camera's home height. */
export const EYE_Y = 1.62;

/** Interior half-width and the z the viewport glass sits at. */
export const HALL_HALF_X = 7.4;
export const VIEWPORT_Z = -10.2;
/** Radius of the cylindrical viewport section, centred on the bridge axis. */
export const VIEWPORT_R = 12.6;

/** The corridor behind the bridge, running +Z out to the launch bay door. */
export const CORRIDOR_START_Z = 2.2;
export const CORRIDOR_END_Z = 17.5;
export const CORRIDOR_HALF_X = 2.05;
export const CORRIDOR_CEIL_Y = 3.1;
/** The door itself. Warm amber spill comes from behind this plane. */
export const BAY_DOOR_Z = CORRIDOR_END_Z;

/** Pilot chair, on the bridge axis, facing the viewport. */
export const CHAIR = { x: 0, y: DECK_Y, z: -3.9 } as const;

/**
 * The five capability modules.
 *
 * Sides alternate down the sequence — right, left, centre, left, centre —
 * because the camera has to *travel* between them for the descent to read as
 * walking the bridge rather than as a carousel. The copy column takes the
 * opposite side in `narrative.ts`; those two facts are the same decision and
 * they have to be read together.
 */
export type ModuleAnchor = {
  /** Console centre, world. */
  x: number;
  y: number;
  z: number;
  /** Facing, radians about Y. 0 faces +Z (back toward the camera's home). */
  yaw: number;
  /** Panel face half-extents, for hit-testing the press-and-hold target. */
  w: number;
  h: number;
};

export const ANCHOR = {
  /** 01 — right of the arc. Tall, portrait: it is a code surface. */
  schema: { x: 4.35, y: 1.18, z: -6.6, yaw: -0.52, w: 1.15, h: 0.86 },
  /** 02 — hard left. A physical gate in a bulkhead, not a screen. */
  rls: { x: -4.75, y: 1.06, z: -5.7, yaw: 0.61, w: 0.98, h: 0.98 },
  /** 03 — dead centre, in front of the chair. The main bridge station. */
  actions: { x: 0, y: 0.98, z: -6.15, yaw: 0, w: 1.32, h: 0.72 },
  /** 04 — left of centre, tucked toward the glass. The one green light. */
  interface: { x: -2.55, y: 1.14, z: -7.3, yaw: 0.34, w: 1.05, h: 0.7 },
  /** 05 — the corridor mouth itself. The module is the way out. */
  deploy: { x: 0, y: 1.45, z: 3.4, yaw: Math.PI, w: 1.6, h: 0.9 },
} as const satisfies Record<string, ModuleAnchor>;

export type AnchorId = keyof typeof ANCHOR;

/* ─────────────────────────────────────────────────────────────────────────
   The Dune world
   ─────────────────────────────────────────────────────────────────────────
   Shares the origin with the ship. The two are never on screen together —
   the swap happens under the launch blowout, deterministically on scroll
   fraction — so there is no reason to spend world space separating them, and
   keeping both near the origin keeps depth precision where the detail is. */

/** The plain. A large disc rather than a plane, so the horizon is a real edge. */
export const DUNE_RADIUS = 220;
/** Sun azimuth and elevation at the portfolio beat. Low, hard, raking. */
/*
 * -1.34, swung round from -0.72. At the first value the sun sat behind the
 * camera's left shoulder, so every shadow fell *away* from the lens and
 * foreshortened to nothing — the act was lit for long shadows and did not have
 * any. Near -PI/2 the light rakes across the frame instead and the shadows run
 * left to right, which is the only thing carrying scale out here.
 */
export const SUN_AZ = -1.34;
export const SUN_EL = 0.135;
/** Sun elevation at the footer — dusk. The shadows lengthen into this. */
export const SUN_EL_DUSK = 0.045;

/**
 * The four monoliths, spread across the plain.
 *
 * Heights are deliberately unequal and not in size order along the row. Four
 * identical slabs read as a chart; four different ones read as architecture
 * that was built at different times for different reasons, which is what the
 * portfolio actually is.
 */
export const MONOLITHS = [
  { x: -17.5, z: -6, w: 3.1, h: 11.4, d: 2.6, yaw: 0.14 },
  { x: -5.8, z: 2.5, w: 2.4, h: 7.2, d: 2.2, yaw: -0.22 },
  { x: 6.4, z: -3.5, w: 3.6, h: 14.1, d: 3.0, yaw: 0.07 },
  { x: 18.2, z: 4, w: 2.7, h: 9.0, d: 2.4, yaw: -0.31 },
] as const;

/** Where the ship sets down, for scale against the monoliths. */
/*
 * Moved from z 16.5 to z -13. In front of the monoliths it was four metres from
 * the lens and read as a chrome pill lying on the sand — the opposite of its
 * job, which is to give the monoliths a human-scale reference. Behind them and
 * small, it does that.
 */
export const LANDING = { x: -9.5, y: 0, z: -13 } as const;
