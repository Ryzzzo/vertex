/**
 * The Machine — raymarched volumetric fog.
 *
 * v1 used six additive billboards with fbm in the fragment shader, and the
 * comment in that file argued they "look the same once the bloom has been over
 * it". That was true of the shot v1 was framing — a 450px-tall object seen from
 * one fixed angle — and it stops being true the moment the camera moves, for a
 * reason billboards cannot be tuned out of:
 *
 *   **A billboard has no depth, so it cannot be occluded by the object it is
 *   standing around.** It is either wholly in front of the plinth or wholly
 *   behind it. Real fog around a machine base is *both* — it fills the gap under
 *   the plinth, wraps the outside of the legs, and is hidden by the casting
 *   itself in between. That silhouette-interleaving is most of what makes fog
 *   read as a volume rather than as a texture hung in the scene, and it is
 *   exactly what a camera orbit puts under the viewer's nose.
 *
 * So this marches. The technique, in the order it matters:
 *
 * 1. **Depth-clamped ray.** The scene's depth buffer reconstructs a world
 *    position per pixel; the march runs from the camera to that point and stops.
 *    Occlusion is therefore free and exact — there is no sorting, no blend mode
 *    to get wrong, and no possible way for fog to draw over something in front
 *    of it. This is the entire reason for the rewrite.
 *
 * 2. **A 32³ 3D noise texture, not analytic fbm.** Two texture fetches replace
 *    roughly sixteen hash-and-smoothstep operations per octave pair. It is
 *    generated at init from a fixed seed — 128 KB of VRAM, 0 KB of bundle, and
 *    identical on every client. Analytic 3D value noise was the first version
 *    and cost about 2.4× the frame time for a visually indistinguishable result.
 *
 * 3. **Henyey-Greenstein phase.** Fog that is one flat tint is a smoke machine.
 *    Real vapour scatters forward, so it is brightest when you are looking
 *    *toward* a light through it and dimmest looking away. The HG term is what
 *    puts the bright rim on the fog on the lit side of the plinth and leaves the
 *    far side blue-grey, and it costs one `pow`.
 *
 * 4. **Beer-Lambert transmittance**, accumulated front to back, with the loop
 *    breaking once transmittance falls under 1%. Dense frames get cheaper, which
 *    is the opposite of how the billboard version behaved.
 *
 * 5. **Half-resolution, pinned to CSS pixels rather than device pixels.** Fog is
 *    low-frequency; there is nothing in it that survives to a retina pixel. Not
 *    scaling with `devicePixelRatio` is worth about 4× on the pass and is
 *    invisible. The upsample is a plain bilinear read — no bilateral filter,
 *    because the depth clamp means fog edges already coincide with geometry
 *    edges, and the one place it shows is against the plinth's top chamfer,
 *    where the bloom covers it.
 *
 * 6. **Blue-noise-ish dithered start offset.** A fixed step count bands hard
 *    across a floor plane. Jittering each pixel's first step by a hash of its
 *    coordinates converts the banding into per-pixel noise, which the film grain
 *    downstream is already supplying anyway.
 *
 * ── The ceiling this hit ─────────────────────────────────────────────────
 *
 * There is no shadowing of the fog by the machine. Doing it properly means a
 * secondary march toward each light from every sample — 24 × 6 more texture
 * fetches per pixel, which measured at roughly 4× the pass cost for an effect
 * that reference #2 does not visibly have. The substitute is a self-shadowing
 * term: density already accumulated along the view ray attenuates in-scatter for
 * samples behind it, so the far side of a thick patch is dimmer than the near
 * side. It reads correctly and it is one multiply. Light shafts are the thing
 * this file cannot do, and they are the honest gap.
 */

import * as THREE from "three";
import { Pass } from "postprocessing";

const MARCH_STEPS = 26;

/**
 * A 32³ tileable value-noise volume, three independent octaves packed into RGB.
 *
 * Packing octaves into channels rather than sampling one channel at three scales
 * means the fbm below is *one* fetch for three octaves. Tileability comes from
 * wrapping the lattice index, so `RepeatWrapping` never shows a seam.
 */
function noiseVolume(): THREE.Data3DTexture {
  const N = 32;
  const data = new Uint8Array(N * N * N * 4);

  let seed = 0x9e3779b1;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  /** One lattice per octave, at 1×, 2× and 4× the frequency. */
  const lattice = (n: number) => {
    const l = new Float32Array(n * n * n);
    for (let i = 0; i < l.length; i++) l[i] = rnd();
    return l;
  };
  const oct = [lattice(4), lattice(8), lattice(16)];
  const smooth = (t: number) => t * t * (3 - 2 * t);

  const sample = (l: Float32Array, n: number, x: number, y: number, z: number) => {
    const fx = x * n, fy = y * n, fz = z * n;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
    const tx = smooth(fx - x0), ty = smooth(fy - y0), tz = smooth(fz - z0);
    const at = (i: number, j: number, k: number) =>
      l[(((k % n) + n) % n) * n * n + (((j % n) + n) % n) * n + (((i % n) + n) % n)];
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const c00 = lerp(at(x0, y0, z0), at(x0 + 1, y0, z0), tx);
    const c10 = lerp(at(x0, y0 + 1, z0), at(x0 + 1, y0 + 1, z0), tx);
    const c01 = lerp(at(x0, y0, z0 + 1), at(x0 + 1, y0, z0 + 1), tx);
    const c11 = lerp(at(x0, y0 + 1, z0 + 1), at(x0 + 1, y0 + 1, z0 + 1), tx);
    return lerp(lerp(c00, c10, ty), lerp(c01, c11, ty), tz);
  };

  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const u = x / N, v = y / N, w = z / N;
        const i = (z * N * N + y * N + x) * 4;
        data[i] = sample(oct[0], 4, u, v, w) * 255;
        data[i + 1] = sample(oct[1], 8, u, v, w) * 255;
        data[i + 2] = sample(oct[2], 16, u, v, w) * 255;
        data[i + 3] = 255;
      }
    }
  }

  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

/**
 * GLSL ES 3.00, declared in full, on a `RawShaderMaterial`.
 *
 * `sampler3D` does not exist in GLSL ES 1.00, so the noise volume forces
 * version 300 whatever else happens. Reaching for `THREE.GLSL3` on an ordinary
 * `ShaderMaterial` was the first attempt and it does not compile: the
 * `gl_FragColor` → `pc_fragColor` shim three injects for GLSL1 shaders is not
 * applied on the GLSL3 path, so the old name is genuinely undeclared there and
 * the whole pass silently produced nothing — while the page still reported a
 * flattering 238 fps median, because a shader that fails to compile is a very
 * fast shader. Worth remembering as a measurement trap, not just a bug.
 *
 * Raw, with `in`/`out` and the two attributes written out by hand, is the
 * version with no version-specific behaviour to be wrong about.
 */
const MARCH_FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;

out vec4 fragColor;

uniform sampler2D tDepth;
uniform sampler3D tNoise;
uniform mat4  uProjInv;
uniform mat4  uCamWorld;
uniform vec3  uCamPos;
uniform vec2  uResolution;
uniform float uTime;
uniform float uDensity;
uniform float uNear;
uniform float uFar;
/** Three in-scattering sources: the machine's interior glow, top to bottom. */
uniform vec3  uLightPos[3];
uniform vec3  uLightCol[3];
uniform vec3  uKeyDir;
uniform vec3  uKeyCol;
uniform float uFloorY;

in vec2 vUv;

/** Three octaves in one fetch — see noiseVolume(). */
float fbm(vec3 p) {
  vec3 n = texture(tNoise, p).rgb;
  return n.r * 0.56 + n.g * 0.3 + n.b * 0.14;
}

/**
 * Density field. A ground layer that falls off exponentially with height, thick
 * around the plinth and thinning outward, modulated by drifting noise and warped
 * by a second, slower noise lookup so the structure churns instead of sliding.
 */
float density(vec3 p) {
  // 1.45, not the 0.62 this started at. At 0.62 the volume still had 9% alpha
  // at the top of the frame, which is not a fog bank — it is gauze over the
  // whole shot, and it read as the render being out of focus rather than as
  // atmosphere. A bank has to end.
  float h = exp(-max(0.0, p.y - uFloorY) * 1.45);
  if (h < 0.004) return 0.0;

  // Radial falloff, so the volume is a bank around the object rather than a slab
  // filling the world. Squared distance keeps it cheap and the edge soft.
  // Tightened from (0.3, 0.34) × 0.55: the wider version reached the bottom
  // corners of the frame at full strength, which is weather rather than a bank
  // standing around a machine.
  float r = dot(p.xz * vec2(0.36, 0.40), p.xz * vec2(0.36, 0.40));
  float bank = exp(-r * 0.82);

  /**
   * 0.55, not the 0.085 this started at — the single most consequential number
   * in the file.
   *
   * The noise volume tiles over 1/scale world units. At 0.085 that is a
   * period of nearly twelve units, and the machine is three units wide: the
   * entire fog bank sat inside a quarter of one noise period, so the field was
   * essentially constant across it. The result rendered as a smooth blue pool —
   * correct raymarching, correct scattering, and no structure whatsoever, which
   * from the outside is indistinguishable from the glow a bloom pass would have
   * given for free. At 0.55 the period is about 1.8 units and there are two or
   * three billows across the plinth, which is what the reference has.
   *
   * Worth stating plainly: the physics was right for three iterations while the
   * thing that made it *look* like fog was a single frequency constant.
   */
  vec3 q = p * 0.55;
  // Domain warp. Without it the fbm reads as a moving texture; with it the
  // billows fold into each other, which is the difference between vapour and
  // marble paper.
  vec3 w = texture(tNoise, q * 0.31 + vec3(0.0, uTime * 0.011, uTime * 0.008)).rgb - 0.5;
  q += w * 0.55;
  q.y -= uTime * 0.021;
  q.x += uTime * 0.012;

  float n = fbm(q);
  // A narrower window than the first pass used (0.34→0.86). Widening the dead
  // zone at the bottom is what puts *gaps* in the bank; without them the noise
  // modulates a slab instead of breaking it into billows, and the silhouette
  // of the fog against the void is the part the eye reads first.
  // The window and the scale below were bracketed rather than reasoned to:
  // 0.44/0.62 was a solid lavender bank, 0.52/0.40 was almost nothing. Fog has a
  // narrow band between "weather" and "invisible" and it is not where intuition
  // puts it — the useful range for this shot spans about 1.5× in density.
  n = smoothstep(0.47, 0.94, n);
  return n * h * bank * uDensity * 0.54;
}

/** Henyey-Greenstein. g > 0 scatters forward, which is what water vapour does. */
float hg(float cosT, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * 3.14159265 * pow(1.0 + g2 - 2.0 * g * cosT, 1.5));
}

/** Reconstructs a world position from the depth buffer. */
vec3 worldFromDepth(vec2 uv, float d) {
  vec4 clip = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 view = uProjInv * clip;
  view /= view.w;
  return (uCamWorld * view).xyz;
}

/** Interleaved-gradient noise. Cheaper than a blue-noise texture, same job. */
float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  float d = texture(tDepth, vUv).x;
  vec3 scenePos = worldFromDepth(vUv, d);
  vec3 ray = scenePos - uCamPos;
  float sceneDist = length(ray);
  vec3 dir = ray / max(sceneDist, 1e-4);

  // Where nothing was drawn the reconstruction lands on the far plane, so the
  // same expression handles "march to the object" and "march into the void".
  float far = min(sceneDist, 26.0);
  // Nothing interesting happens in the first few units — the camera is never
  // inside the bank — so the march starts where the volume can actually be.
  float start = 2.0;
  if (far <= start) { fragColor = vec4(0.0); return; }

  float stepLen = (far - start) / float(${MARCH_STEPS});
  float t = start + stepLen * dither(gl_FragCoord.xy);

  vec3  scatter = vec3(0.0);
  float trans = 1.0;
  // Self-shadowing proxy: density already crossed on this ray. See the header —
  // this stands in for a per-sample light march that costs 4× and is not
  // visible in the reference.
  float behind = 0.0;

  for (int i = 0; i < ${MARCH_STEPS}; i++) {
    vec3 p = uCamPos + dir * t;
    float dens = density(p);

    if (dens > 0.002) {
      vec3 lit = vec3(0.0);

      // The machine's own light, coming back off the vapour it is standing in.
      for (int l = 0; l < 3; l++) {
        vec3 toL = uLightPos[l] - p;
        float dist2 = dot(toL, toL);
        float phase = hg(dot(normalize(toL), dir), 0.42);
        lit += uLightCol[l] * phase / (1.0 + dist2 * 0.34);
      }

      // The key, as a directional term. Backscatter is deliberately weak: a
      // fog bank lit evenly from every side has no form.
      lit += uKeyCol * hg(dot(uKeyDir, dir), 0.24) * 0.9;

      // 0.55, down from 1.35. The self-shadow proxy is standing in for a light
      // march, and at 1.35 it was extinguishing in-scatter faster than the
      // transmittance term was extinguishing the background — so the bank got
      // *darker* than the void it sat in, which is the one thing lit fog never
      // does. It has to shade the far side, not black it out.
      lit *= exp(-behind * 0.55);

      float absorb = dens * stepLen;
      // Energy-conserving integration rather than a running sum: the closed form
      // for a constant-density segment. A plain accumulate blows out the near
      // samples and is why hand-rolled fog so often looks like milk.
      scatter += lit * trans * (1.0 - exp(-absorb)) ;
      trans *= exp(-absorb);
      behind += absorb;

      if (trans < 0.01) break;
    }
    t += stepLen;
  }

  // Straight alpha. The composite below multiplies the scene by transmittance
  // and adds the scatter, which is the physically correct order and means fog
  // can both dim what is behind it and glow — the billboard version could only
  // ever do one of those.
  fragColor = vec4(scatter, 1.0 - trans);
}
`;

/**
 * The composite, and the scene's exposure control.
 *
 * Exposure lives here rather than on the renderer, and that is not tidiness —
 * `renderer.toneMappingExposure` is *inert* in this pipeline. three only
 * compiles the `tonemapping_fragment` chunk into a material when
 * `renderer.toneMapping !== NoToneMapping`, and tone mapping is deliberately
 * off on the renderer because `ToneMappingEffect` is doing it in post. So the
 * exposure line that looked like it was controlling the scene was controlling
 * nothing, every emissive surface was arriving at the bloom threshold at full
 * strength, and the object read as backlit plastic. It cost a full round of
 * "why is the metal blue" before the shader chunk explained itself.
 *
 * Applying it here also puts it *upstream of the bloom*, which is where it has
 * to be: `luminanceThreshold` is meaningless if the exposure that decides what
 * crosses it is applied afterwards.
 */
const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tFog;
uniform float uExposure;
varying vec2 vUv;
void main() {
  vec4 scene = texture2D(tScene, vUv);
  vec4 fog = texture2D(tFog, vUv);
  // Beer-Lambert composite: scene attenuated by transmittance, plus in-scatter.
  // Both terms exposed together, so the fog cannot drift relative to the object
  // as the build ramps the exposure up.
  vec3 col = (scene.rgb * (1.0 - fog.a) + fog.rgb) * uExposure;
  gl_FragColor = vec4(col, max(scene.a, fog.a));
}
`;

/** GLSL1, for the composite — an ordinary ShaderMaterial with no 3D sampler. */
const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** GLSL3 raw, for the march. Attributes declared by hand — see MARCH_FRAG. */
const QUAD_VERT_300 = /* glsl */ `
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * A `postprocessing` Pass that renders the march at half resolution into its own
 * target and then composites it over the scene at full resolution.
 *
 * Two draws in one pass rather than two passes, because the intermediate is
 * never wanted by anything else and a separate pass would mean a second
 * full-resolution buffer for no reason.
 */
export class VolumetricFogPass extends Pass {
  private fogTarget: THREE.WebGLRenderTarget;
  private marchMat: THREE.ShaderMaterial;
  private compositeMat: THREE.ShaderMaterial;
  private noise: THREE.Data3DTexture;
  private camera3D: THREE.PerspectiveCamera;
  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private quad: THREE.Mesh;

  constructor(camera: THREE.PerspectiveCamera) {
    super("VolumetricFogPass");
    this.needsSwap = true;
    this.needsDepthTexture = true;
    this.camera3D = camera;
    this.noise = noiseVolume();

    this.fogTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });

    this.marchMat = new THREE.RawShaderMaterial({
      vertexShader: QUAD_VERT_300,
      fragmentShader: MARCH_FRAG,
      glslVersion: THREE.GLSL3,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDepth: { value: null },
        tNoise: { value: this.noise },
        uProjInv: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uDensity: { value: 1 },
        uNear: { value: 0.5 },
        uFar: { value: 44 },
        uLightPos: {
          value: [
            new THREE.Vector3(0, 1.4, -0.35),
            new THREE.Vector3(0, -0.6, -0.35),
            new THREE.Vector3(0, -2.0, 0.1),
          ],
        },
        /**
         * Scaled hard — roughly 7× the first pass.
         *
         * The Henyey-Greenstein term is normalised by 4π, as it must be to
         * conserve energy, so its peak is about 0.34 and its average across a
         * hemisphere is nearer 0.1. Multiply that by an inverse-square falloff
         * and by the accumulated transmittance and an in-scatter figure built
         * from unit-intensity lights lands around 0.02, against an alpha of
         * 0.5 — fog that dims the scene by half and glows by two percent, which
         * is a neutral density filter, not vapour. Physically correct radiance
         * needs physically plausible source intensities to go with it, and
         * these are the machine's interior at close range.
         */
        /**
         * Desaturated well off the machine's own indigo, and that is the point.
         *
         * Lighting the vapour with the accent colour at full chroma produced a
         * solid lavender bank — the same failure as the metal earlier, one layer
         * out. Real vapour is grey; it takes a *tint* from what is lighting it
         * and never the full hue. These are the accent mixed roughly halfway to
         * a cool grey, which reads as blue-lit fog rather than as blue fog. The
         * indigo the eye actually reads comes from the bloom around the pockets
         * behind it, not from the volume.
         */
        uLightCol: {
          value: [
            new THREE.Color(0x8b93c8).multiplyScalar(11),
            new THREE.Color(0x7b84c2).multiplyScalar(15),
            new THREE.Color(0x949ddb).multiplyScalar(20),
          ],
        },
        uKeyDir: { value: new THREE.Vector3(-3.4, 5.6, 4.2).normalize() },
        uKeyCol: { value: new THREE.Color(0xa8b4c8).multiplyScalar(3.0) },
        uFloorY: { value: -2.62 },
      },
    });

    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: null },
        tFog: { value: this.fogTarget.texture },
        uExposure: { value: 1 },
      },
    });

    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.marchMat);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
  }

  /** Driven per frame by the camera score. */
  setDensity(v: number) {
    this.marchMat.uniforms.uDensity.value = v;
  }
  setTime(t: number) {
    this.marchMat.uniforms.uTime.value = t;
  }
  /** Scene exposure, applied here because the renderer's is inert — see above. */
  setExposure(v: number) {
    this.compositeMat.uniforms.uExposure.value = v;
  }

  /**
   * The composer hands the depth texture to every pass that asked for one. The
   * base signature also carries a `depthPacking` argument, which is deliberately
   * not declared: this pass reads the hardware depth attachment directly and has
   * no path that would honour RGBA packing, so accepting the parameter would
   * imply support that does not exist.
   */
  override setDepthTexture(depthTexture: THREE.Texture): void {
    this.marchMat.uniforms.tDepth.value = depthTexture;
  }

  override setSize(width: number, height: number): void {
    // Half of the CSS size, not of the device size — see the header. `width` and
    // `height` arrive here already multiplied by the composer's pixel ratio, so
    // the divisor absorbs it and the fog buffer stays the same on a retina panel
    // as on a 1× one.
    const scale = 0.5 / Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(width * scale));
    const h = Math.max(2, Math.round(height * scale));
    this.fogTarget.setSize(w, h);
    this.marchMat.uniforms.uResolution.value.set(w, h);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget,
    outputBuffer: THREE.WebGLRenderTarget,
  ): void {
    const u = this.marchMat.uniforms;
    const cam = this.camera3D;

    cam.updateMatrixWorld();
    u.uProjInv.value.copy(cam.projectionMatrixInverse);
    u.uCamWorld.value.copy(cam.matrixWorld);
    u.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;

    // 1 — the march, at half resolution.
    this.quad.material = this.marchMat;
    renderer.setRenderTarget(this.fogTarget);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCam);

    // 2 — the composite, at full resolution, into whatever comes next.
    this.compositeMat.uniforms.tScene.value = inputBuffer.texture;
    this.quad.material = this.compositeMat;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCam);
  }

  override dispose(): void {
    this.fogTarget.dispose();
    this.marchMat.dispose();
    this.compositeMat.dispose();
    this.noise.dispose();
    this.quad.geometry.dispose();
    super.dispose();
  }
}
