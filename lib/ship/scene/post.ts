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
  const composed = quality.bloom
    ? occluded.add(bloom(emissiveTex, quality.bloomStrength, 0.62, 0))
    : occluded;

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
