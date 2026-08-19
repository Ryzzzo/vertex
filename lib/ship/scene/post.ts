/**
 * Post-processing, on three's native node pipeline.
 *
 * Not pmndrs `postprocessing` and not `@react-three/postprocessing`. Both are
 * WebGL-era and would need WebGPU-specific builds or TSL rewrites for several
 * effects; three's node post is already inside the dependency and lowers to
 * both backends from one source, like everything else here.
 *
 * Order is load-bearing and it is the same lesson every composer teaches:
 * ambient occlusion has to darken the beauty pass *before* bloom samples it,
 * or the recesses bloom back out to the value AO just removed and the whole
 * pass cancels itself.
 *
 *   scene → AO (multiply) → bloom → tone map → screen
 */
import { PostProcessing, type Renderer, type Scene, type Camera } from "three/webgpu";
import {
  pass,
  mrt,
  output,
  emissive,
  transformedNormalView,
  float,
} from "three/tsl";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import type { QualityTier } from "./quality";

export type PostChain = {
  post: PostProcessing;
  dispose(): void;
};

export function createPostChain(
  renderer: Renderer,
  scene: Scene,
  camera: Camera,
  quality: QualityTier,
): PostChain {
  const post = new PostProcessing(renderer);

  // An MRT pass so the bloom can read the emissive channel specifically rather
  // than thresholding total luminance. Thresholding is what makes a bright
  // white panel bloom as hard as an LED strip — which is exactly the "glowy
  // and dated" look, and the reason the strips are the only thing here that
  // should glow.
  const scenePass = pass(scene, camera);
  /**
   * `normal` must be `transformedNormalView`, not `normalView`.
   *
   * The first attempt used `normalView` — the raw geometric normal — and GTAO
   * returned a buffer that was not occlusion at all. Multiplied into the beauty
   * pass it tinted the entire room red, which reads as a lighting or palette
   * failure and is neither: it is a normal buffer in the wrong space being
   * consumed as if it were greyscale.
   *
   * `transformedNormalView` is the shaded normal after normal-mapping and
   * flipping, which is the convention GTAO is written against.
   */
  scenePass.setMRT(
    mrt({
      output,
      emissive,
      normal: transformedNormalView,
    }),
  );

  const colour = scenePass.getTextureNode("output");
  const emissiveTex = scenePass.getTextureNode("emissive");

  /**
   * Screen-space AO against the pass's own depth and normals, multiplied into
   * the beauty pass. This is what makes a recess look recessed — without it a
   * chamfered joint and a painted line are the same picture, which is a large
   * part of why untextured geometry reads as primitives.
   */
  const occluded = (() => {
    if (!quality.ao) return colour;
    const occlusion = ao(
      scenePass.getTextureNode("depth"),
      scenePass.getTextureNode("normal"),
      camera,
    );
    occlusion.distanceExponent.value = 1.2;
    occlusion.distanceFallOff.value = 0.7;
    occlusion.radius.value = 0.32;
    occlusion.scale.value = 1.1;
    occlusion.thickness.value = 1.0;
    /**
     * `.r`, not the whole vec4.
     *
     * GTAO writes occlusion into the RED channel only; green and blue come back
     * zero. Multiplying the vec4 into the beauty pass therefore zeroes the green
     * and blue of every lit surface, and the entire room renders red — which
     * looks exactly like a lighting or palette bug and is neither.
     *
     * Two wrong guesses preceded this one (disable AO; wrong normal space).
     * What identified it was the symptom rather than the code: the cast was
     * uniform, it hit only the beauty channel, and bloom — which reads a
     * different buffer — was untouched. That combination only describes a
     * single-channel texture being consumed as colour.
     */
    return occlusion.getTextureNode().r.mul(colour);
  })();

  // Threshold at 0 because the input is the emissive buffer — everything in it
  // is meant to glow, so there is nothing to threshold out. Thresholding total
  // luminance instead is what makes a bright white panel bloom as hard as an
  // LED, which is the single fastest way to make a scene look dated.
  const bloomed = quality.bloom
    ? occluded.add(bloom(emissiveTex, quality.bloomStrength, 0.62, 0))
    : occluded;

  /**
   * Depth of field, kept deliberately shallow in effect.
   *
   * Focus sits on the command dais and the near consoles; the far wall and the
   * ceiling run soften slightly. The point is not a photographic bokeh — a
   * heavy blur on an interior reads as a miniature, which is the opposite of
   * the scale this room is trying to convey. It is there so the eye has
   * somewhere to rest and the back of the room recedes.
   */
  // `getViewZNode()`, not `getTextureNode('depth')`. DOF wants view-space Z,
  // and the depth attachment is non-linear device depth — feeding it straight
  // in produces a focal plane that sits almost on the near clip and blurs
  // essentially the whole room. Same class of mistake as the AO red channel:
  // the buffer exists and has the right shape, and means something else.
  //
  // focalLength 9 / bokeh 1.1 blurred the entire room including the viewport,
  // which is the miniature-model failure this effect is one parameter away from
  // at all times. The focal plane now sits on the far wall at ~21 units with a
  // long focal range and a small bokeh, so the near consoles and the ceiling
  // run soften by a few pixels and nothing else moves. If it is noticeable, it
  // is too strong.
  const composed = quality.dof
    ? dof(bloomed, scenePass.getViewZNode(), 19.0, 1.1, 0.32)
    : bloomed;

  post.outputNode = composed;

  return {
    post,
    dispose() {
      post.dispose();
    },
  };
}

/** Kept so callers do not have to import `float` for a one-off uniform tweak. */
export const one = float(1);
