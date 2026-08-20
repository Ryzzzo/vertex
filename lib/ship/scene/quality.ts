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
  /**
   * Volumetric shafts through the viewport. The "outside is real" tell.
   *
   * **Off, and honestly so.** The pass is fully wired — `three`'s own TSL
   * `GodraysNode` marching the key's shadow map, deferred until that map is
   * allocated, density driven from the atmosphere state — and it compiles
   * without error and composites into the chain. It contributes nothing
   * visible. Raising density from 0.62 to 1.6 changed no pixels, which rules
   * out "too subtle" and points at the pass receiving or returning nothing.
   *
   * Two attempts is where guessing stops. Left disabled rather than burning
   * GPU on a pass that produces no image, with every line of integration intact
   * so the next session diagnoses rather than rebuilds. Likely suspects, in
   * order: the additive compose of its output against a vec4 beauty; the
   * shadow-map resolution the node samples versus the one the key allocates;
   * and whether the marched volume is bounded by the shadow camera's near
   * plane, which sits at 0.5 while the light is 6 units outside the front wall.
   */
  godrays: boolean;
  /** Raymarch steps. 60 is the reference default; 40 holds up at half-res. */
  godraySteps: number;
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
  godrays: false,
  godraySteps: 60,
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
  godrays: false,
  godraySteps: 40,
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
