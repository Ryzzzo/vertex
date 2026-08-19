/**
 * Two named quality tiers, designed in rather than retrofitted.
 *
 * Both measured reference studios ship explicit tiers — bruno-simon.com has a
 * `Quality.js`, Immersive Garden ships `bg_ultralow_draco.glb` and a
 * `textures/ktx2/ultralow/` directory. Retrofitting level-of-detail costs far
 * more than designing for it, which is why this file exists before any geometry
 * does.
 *
 * Everything that differs between a desktop and a phone lives here as a number.
 * No room code branches on device.
 */
import type { Tier } from "./capability";

export type QualityTier = {
  name: "full" | "reduced";
  /** Device pixel ratio ceiling. Beyond ~1.75 is invisible and quadratically
   *  expensive; the difference between 1.75 and 2 disappears under grain. */
  dpr: number;
  /** Console pods per side. The reference bridge reads with three. */
  stationsPerSide: number;
  /** Ceiling ribs along the room's length. */
  ceilingRibs: number;
  /** Deck plate subdivisions. Drives the inscribed-seam density. */
  deckDivisions: number;
  /** Run the depth-scattering composite at all. */
  scatter: boolean;
  /** Resolution scale for the scatter composite, 1 = full. */
  scatterScale: number;
  /** Bloom on the strips and screens. */
  bloom: boolean;
  /** Bloom strength. Restrained on purpose — bloom is what makes a scene read
   *  as dated faster than any other single effect. */
  bloomStrength: number;
  /** Screen-space ambient occlusion. The thing that makes a recess look
   *  recessed; without it a chamfered joint and a painted line are the same
   *  picture. Expensive, so it is the first thing off on a phone. */
  ao: boolean;
  /** Depth of field. Softens the far wall so the room recedes. A gather pass
   *  is the most expensive thing in the chain and the least missed. */
  dof: boolean;
  /** Star count behind the viewport. */
  stars: number;
  /** Shadow-casting lights. Zero on reduced — the room is lit by emissive
   *  strips and bounce, and shadow maps buy little for a lot. */
  shadowLights: number;
};

const FULL: QualityTier = {
  name: "full",
  dpr: 1.75,
  stationsPerSide: 3,
  ceilingRibs: 11,
  deckDivisions: 9,
  scatter: true,
  scatterScale: 1,
  bloom: true,
  bloomStrength: 0.2,
  ao: true,
  /**
   * Back on. Two earlier passes over-blurred because `focalLength` was read as
   * a lens length when it is the distance at which blur *saturates* — see the
   * derivation in `post.ts`. The third set is computed from the actual camera
   * distances rather than guessed.
   */
  dof: true,
  stars: 2600,
  shadowLights: 1,
};

const REDUCED: QualityTier = {
  name: "reduced",
  dpr: 1.5,
  stationsPerSide: 2,
  ceilingRibs: 7,
  deckDivisions: 6,
  scatter: true,
  scatterScale: 0.5,
  bloom: true,
  bloomStrength: 0.16,
  ao: false,
  dof: false,
  stars: 900,
  shadowLights: 0,
};

/**
 * Pick a tier.
 *
 * Narrow viewports and the WebGL2 backend both get `reduced`. The WebGL2 case
 * is not because the backend is slow — the same TSL lowers to GLSL and runs
 * fine — but because a client without a WebGPU adapter in 2026 is usually an
 * older device, and that correlation is a better signal than any single probe.
 */
export function pickQuality(tier: Tier, viewportWidth: number): QualityTier {
  if (tier === "webgl2") return REDUCED;
  if (viewportWidth < 900) return REDUCED;
  return FULL;
}

export { FULL as QUALITY_FULL, REDUCED as QUALITY_REDUCED };
