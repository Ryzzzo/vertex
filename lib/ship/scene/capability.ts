/**
 * Which rendering tier this client gets, decided before three is imported.
 *
 * Three tiers, and only the middle one is invisible to the visitor:
 *
 *   A  webgpu   WebGPU backend. Full scene, full node post chain.
 *   B  webgl2   WebGPURenderer's automatic WebGL2 backend. Same TSL source
 *               lowered to GLSL; fewer lights, half-resolution composite.
 *   C  none     No canvas at all. The room's SVG drawing plus its DOM content.
 *               `three` is never requested — asserted in the capture harness.
 *
 * This module deliberately does NOT import three. It runs before the dynamic
 * import decision, so a Tier C client never pays for the renderer chunk.
 *
 * `three/addons/capabilities/WebGPU.js` does the same adapter check but with a
 * top-level `await`, which makes every importer async. Ours is a plain function
 * for that reason, not because the addon is wrong.
 */

export type Tier = "webgpu" | "webgl2" | "none";

export type Capability = {
  tier: Tier;
  /** True when the tier was forced by `?gl=`, so the HUD can say so. */
  forced: boolean;
  /** True when the client asked for reduced motion. Always implies Tier C. */
  reducedMotion: boolean;
  /** Why this tier was chosen. Surfaced in the capture harness report. */
  reason: string;
};

/**
 * `?gl=webgpu` · `?gl=webgl2` · `?gl=none`
 *
 * Forcing the WebGL2 backend has to be routine rather than a pre-launch check.
 * Compute shaders and storage buffers silently do nothing on that backend — no
 * error, the page just renders without whatever the pass contributed — and this
 * machine is an RTX 5060 on Chrome, so it will never surface that path by
 * accident. Nothing in this build is load-bearing in a compute shader, and this
 * override is how that stays true.
 */
function forcedTier(): Tier | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("gl");
  return v === "webgpu" || v === "webgl2" || v === "none" ? v : null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** Does a WebGL2 context actually come back? Cheap, synchronous, disposable. */
function hasWebGL2(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export async function detectCapability(): Promise<Capability> {
  const reducedMotion = prefersReducedMotion();
  const forced = forcedTier();

  if (forced) {
    return {
      tier: forced,
      forced: true,
      reducedMotion,
      reason: `forced by ?gl=${forced}`,
    };
  }

  // Reduced motion skips the effect rather than slowing it. For a scene whose
  // whole content is motion, skipping means not starting the renderer at all —
  // a paused rAF loop still costs battery.
  if (reducedMotion) {
    return {
      tier: "none",
      forced: false,
      reducedMotion,
      reason: "prefers-reduced-motion: reduce",
    };
  }

  // Four cores or 2 GB of reported memory is a device that will not enjoy this.
  // Both hints are advisory and absent on Safari, so a missing value is never
  // read as a failure.
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem <= 2) {
    return {
      tier: "none",
      forced: false,
      reducedMotion,
      reason: `deviceMemory ${mem}GB`,
    };
  }

  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const adapter = await (
        navigator as unknown as {
          gpu: { requestAdapter(): Promise<unknown | null> };
        }
      ).gpu.requestAdapter();
      if (adapter) {
        return {
          tier: "webgpu",
          forced: false,
          reducedMotion,
          reason: "WebGPU adapter available",
        };
      }
    } catch {
      // Fall through to WebGL2. An adapter request that throws is a device
      // problem, not a reason to show nothing.
    }
  }

  if (hasWebGL2()) {
    return {
      tier: "webgl2",
      forced: false,
      reducedMotion,
      reason: "no WebGPU adapter; WebGL2 context available",
    };
  }

  return {
    tier: "none",
    forced: false,
    reducedMotion,
    reason: "no WebGPU adapter and no WebGL2 context",
  };
}
