/**
 * The room's floor plan, as data.
 *
 * ── Why the room was reading as a box ─────────────────────────────────────
 *
 * The first bridge was a rectangle 18 m wide by 23 m deep, which is not a small
 * room — and it still read as one. Three reasons, none of them size:
 *
 *   1. Two parallel side walls meeting a flat back wall put a hard right angle
 *      in both bottom corners of the frame. A right angle in peripheral vision
 *      is the single strongest "this is a box" signal there is, and no amount
 *      of depth behind it undoes that.
 *   2. The viewport occupied under half the front wall, so the wall read as the
 *      subject and the window as a feature on it. A room is only as deep as its
 *      furthest interesting thing, and the furthest interesting thing was a
 *      wall.
 *   3. Nothing stood between the chair and the far wall. Perspective needs
 *      objects at intermediate distances to be legible — an empty floor between
 *      near and far gives the eye nothing to measure with, so twelve metres and
 *      four metres look alike.
 *
 * The plan below answers the first: an elongated octagon, so every corner in
 * frame is a 135° angle rather than a 90° one. The other two are answered in
 * the room itself by a viewport at ~70% of the front wall and a mid-ground
 * console arc.
 *
 * Not a regular octagon — a bridge needs a wide forward wall to put a window
 * in. This is a rectangle with its four corners cut back at 45°, which reads as
 * octagonal from inside while keeping a broad front face.
 */

export type WallKind = "front" | "frontAngle" | "side" | "backAngle" | "back";

export type WallSegment = {
  /** Centre of the segment, in XZ. */
  mid: [number, number];
  /** Length along the wall. */
  length: number;
  /**
   * Yaw about Y that turns a +Z-facing panel to face into the room. Derived
   * from the edge normal rather than assigned per segment, so the plan can be
   * reshaped without every placement needing its angles recomputed by hand.
   */
  yaw: number;
  kind: WallKind;
};

export type RoomPlan = {
  segments: WallSegment[];
  /** Polygon vertices, XZ, for the deck and ceiling outline. */
  vertices: [number, number][];
  halfWidth: number;
  frontZ: number;
  backZ: number;
  frontHalfWidth: number;
};

export const BRIDGE_PLAN_CONFIG = {
  /** Widest half-width, at the side walls. */
  halfWidth: 11,
  /** The viewport wall. */
  frontZ: -16,
  /**
   * The rear bulkhead. Must sit behind the camera's rest position (z = 9) with
   * clearance — the first octagon put it at 8, which left the camera outside
   * its own room looking at the back of a wall.
   */
  backZ: 12,
  /** Half-width of the flat front wall. The corner cut is the difference. */
  frontHalfWidth: 7,
  /** Half-width of the flat back wall. */
  backHalfWidth: 6,
  /** How far along Z the front corners are cut. */
  frontCut: 5,
  /** How far along Z the back corners are cut. */
  backCut: 5,
} as const;

export function octagonPlan(
  cfg: typeof BRIDGE_PLAN_CONFIG = BRIDGE_PLAN_CONFIG,
): RoomPlan {
  const { halfWidth: hw, frontZ, backZ, frontHalfWidth: fhw, backHalfWidth: bhw, frontCut, backCut } = cfg;

  // Clockwise from the front-left corner, viewed from above.
  const vertices: [number, number][] = [
    [-fhw, frontZ],
    [fhw, frontZ],
    [hw, frontZ + frontCut],
    [hw, backZ - backCut],
    [bhw, backZ],
    [-bhw, backZ],
    [-hw, backZ - backCut],
    [-hw, frontZ + frontCut],
  ];

  const kinds: WallKind[] = [
    "front",
    "frontAngle",
    "side",
    "backAngle",
    "back",
    "backAngle",
    "side",
    "frontAngle",
  ];

  const segments: WallSegment[] = vertices.map((a, i) => {
    const b = vertices[(i + 1) % vertices.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

    // Edge normal, then flipped if it points away from the room's interior.
    // Deriving it this way means the winding order of `vertices` above cannot
    // silently produce walls that all face outward — a whole room rendered
    // inside-out is a very expensive way to learn which way you wound a
    // polygon.
    let nx = dz / length;
    let nz = -dx / length;
    const towardCentre = -mid[0] * nx + -mid[1] * nz;
    if (towardCentre < 0) {
      nx = -nx;
      nz = -nz;
    }

    return { mid, length, yaw: Math.atan2(nx, nz), kind: kinds[i] };
  });

  return {
    segments,
    vertices,
    halfWidth: hw,
    frontZ,
    backZ,
    frontHalfWidth: fhw,
  };
}
