"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  ARM_CATCH_DEG,
  ARM_HUB,
  ARM_R,
  ARM_RELEASE_DEG,
  arcTable,
  atDistance,
  FACE_Z,
  FACES,
  fullRoute,
  GATE_H,
  GATE_W,
  GATE_X,
  gearProfile,
  LAUNCH_X,
  MARBLE_R,
  MODULE_IDS,
  MODULE_WINDOWS,
  moduleAt,
  MODULES,
  PANEL_D,
  PANEL_H,
  PANEL_W,
  PLINTH_D,
  PLINTH_H,
  PLINTH_W,
  PLINTH_Y,
  RAIL_BOTTOM,
  RAIL_D,
  RAIL_TOP,
  RAIL_W,
  RAIL_X,
  roundRect,
  RUN_A,
  RUN_B,
  routeAt,
  RUN_C,
  sampleRun,
  SCREEN_H,
  SCREEN_W,
  SCREEN_X,
  SCREEN_Y,
  TRACK_Z,
  VIEW,
  type ModuleId,
  type Pt3,
  type Vec2,
} from "./machine-parts";

/**
 * The Machine — WebGL layer.
 *
 * three.js with no React Three Fiber, no Drei and no `postprocessing`. The
 * scene is mounted once and driven by scroll, which is exactly the case where
 * R3F's JSX ergonomics buy nothing and cost 85 kB gzipped; the post chain is
 * one fragment shader instead of an 84 kB import.
 *
 * Every dimension comes from `machine.ts` — the same module the server used to
 * write the SVG sitting underneath this canvas — so the drawing and the object
 * are the same object, and the build-in lands the parts exactly on the lines.
 *
 * What happens, in order:
 *
 *   build      the parts arrive from off-screen and seat into the drawing over
 *              about two seconds, once, on first paint. The machine builds
 *              itself, which is the thing the company does.
 *   idle       one gear turns a degree every three seconds. Fog drifts. The
 *              terminal cursor blinks. Nothing else moves.
 *   scroll     a marble runs the route: through the schema plate, the RLS gate,
 *              around the server-actions arm, across the terminal, into the
 *              deploy breech, and out of frame up the launch rail.
 *
 * Degradation is the parent's job (`Machine.tsx`). This module is never
 * imported at all under reduced motion, Save-Data, low device memory, a narrow
 * viewport, or missing WebGL 2, so three.js stays out of those bundles entirely
 * rather than loading and declining to run.
 */

// ── palette ─────────────────────────────────────────────────────────────
const INDIGO = new THREE.Color("#5e6ad2");
const VOID = new THREE.Color("#0a0a0b");
/** The only green on the object. It belongs to the terminal and to nothing else. */
const GREEN = "#3dd68c";

// ── easing, shared with the page's one CSS curve ────────────────────────
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** The JS reading of cubic-bezier(0.32, 0.72, 0, 1) — one curve for the site. */
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3.2);
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a || 1));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** A one-in one-out window, for anything that happens and then stops. */
const pulse = (v: number, a: number, b: number) => {
  const t = ramp(v, a, b);
  return Math.sin(t * Math.PI);
};

// ── procedural studio environment ───────────────────────────────────────
/**
 * Metal is a mirror; without something to reflect it renders as flat paint. The
 * brief budgeted 50–100 kB for an HDRI, and this is 0 kB instead: a 128×64 RGBA
 * float equirectangular map built in a loop — a soft key blob above and to the
 * left, a dim indigo fill below and in front, a cool kicker behind — run
 * through `PMREMGenerator` exactly as a loaded `.hdr` would be.
 *
 * It is the better trade. A studio HDRI *is* a gradient with a key light in it,
 * this one is authored to the same palette as the page rather than to whatever
 * room the photographer stood in, it costs no request on the critical path, and
 * it is deterministic, so the hero cannot look different because a CDN was slow.
 */
function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const W = 128;
  const H = 64;
  const data = new Float32Array(W * H * 4);

  /** A soft circular blob in equirect space, in radians. */
  const blob = (
    lon: number,
    lat: number,
    az: number,
    el: number,
    size: number,
  ) => {
    let dl = Math.abs(lon - az);
    if (dl > Math.PI) dl = Math.PI * 2 - dl;
    const d = Math.hypot(dl * Math.cos((lat + el) / 2), lat - el);
    return Math.max(0, 1 - d / size) ** 2;
  };

  for (let y = 0; y < H; y++) {
    // +π/2 at the top of the map, −π/2 at the bottom.
    const lat = (0.5 - (y + 0.5) / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const lon = ((x + 0.5) / W - 0.5) * Math.PI * 2;

      // Ground and sky. Near-black, because the room is a void.
      const up = Math.max(0, Math.sin(lat));
      let r = 0.012 + up * 0.03;
      let g = 0.013 + up * 0.033;
      let b = 0.018 + up * 0.045;

      // Key: high, left, in front. This is the highlight that runs down every
      // machined edge, and it is most of the reason the object reads as metal.
      const key = blob(lon, lat, -0.72, 0.82, 1.3);
      r += key * 5.4;
      g += key * 5.55;
      b += key * 5.9;

      // A broad soft box, front and above. Flat faces need something to *be*,
      // not only edges to catch: with the key alone every surface between
      // highlights read black and the rims blew out, which is a night
      // photograph of a machine rather than a lit one. This is the white card
      // a product photographer puts just out of frame, and it is doing most of
      // the work on the panel faces.
      const soft = blob(lon, lat, -0.95, 0.46, 2.3);
      r += soft * 1.05;
      g += soft * 1.1;
      b += soft * 1.24;

      // Kicker: low, right, behind. Separates the silhouette from the void.
      const kick = blob(lon, lat, 2.5, 0.16, 1.4);
      r += kick * 1.3;
      g += kick * 1.42;
      b += kick * 1.85;

      // Fill: the machine's own indigo, coming back at it off the fog.
      const fill = blob(lon, lat, 0.25, -0.55, 1.6);
      r += fill * INDIGO.r * 0.7;
      g += fill * INDIGO.g * 0.7;
      b += fill * INDIGO.b * 0.9;

      const i = (y * W + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 1;
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

/**
 * A brushed-metal roughness map. Fine horizontal streaks plus a little noise —
 * without it every panel has one roughness value everywhere, which is the
 * single clearest tell of an untextured render.
 */
function brushedRoughness(): THREE.CanvasTexture {
  const N = 256;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  // A fixed seed: the texture must be the same on every load and every client.
  let seed = 0x2f6e2b1;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const rows = new Float32Array(N);
  for (let y = 0; y < N; y++) rows[y] = rnd();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Streaks run along x, so the anisotropy and the map agree.
      // Shallow: a roughness map with real contrast reads as dirt on a dark
      // panel, not as a brush. ±0.09 around the material's own value is enough
      // to break the highlight up and invisible as texture.
      const streak = rows[y] * 0.55 + rows[(y + 1) % N] * 0.2;
      const grain = rnd() * 0.1;
      const v = Math.max(0, Math.min(1, 0.5 + (streak - 0.38) * 0.24 + (grain - 0.05)));
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(v * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.6, 1.6);
  return tex;
}

/**
 * The light behind the rack, as a gradient rather than a flat colour. A uniform
 * emissive plane behind five cut panels reads as a lightbox — every pocket the
 * same brightness, which is the one thing interior lighting never is. This puts
 * the source low and lets it fall off, so the bottom modules sit in it and the
 * top ones only catch it.
 */
function backlightTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, "#2b3ac8");
  grad.addColorStop(0.16, "#5e6ad2");
  grad.addColorStop(0.45, "#39408c");
  grad.addColorStop(0.8, "#1e2350");
  grad.addColorStop(1, "#141731");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  // Fall off at the sides too, so the light does not stop at an edge (Rule 3).
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, "rgba(0,0,0,0.85)");
  side.addColorStop(0.5, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,0,0,0.85)");
  g.fillStyle = side;
  g.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── volumetric base fog ─────────────────────────────────────────────────
/**
 * Four drifting billboards with fbm noise in the fragment shader. Not a
 * raymarch: at this scale a raymarched slab costs an order of magnitude more
 * and looks the same once the bloom has been over it.
 *
 * **Additive, not alpha.** The first pass blended them normally, and six
 * near-black quads at 0.5 alpha in front of the object composited into a solid
 * black wall that hid the entire machine — the render was correct and the frame
 * was empty. Additive is also the physically right model: fog is visible
 * because light scatters *in* it, so unlit fog must contribute nothing and lit
 * fog must glow. It cannot darken what is behind it, which means this class of
 * failure is now impossible rather than merely tuned away.
 */
const FOG_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uIndex;
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Billboard: cancel the view rotation so the quad always faces the camera.
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float drift = uTime * 0.021 + uIndex * 1.7;
    mv.xy += vec2(p.x + sin(drift) * 0.22, p.y);
    mv.z += 0.0;
    vHeight = uv.y;
    gl_Position = projectionMatrix * mv;
  }
`;

const FOG_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIndex;
  uniform float uOpacity;
  uniform vec3  uTint;
  uniform vec3  uBase;
  varying vec2 vUv;
  varying float vHeight;

  // Value noise, three octaves. Enough structure to read as vapour, cheap
  // enough that six of these cost nothing.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    return noise(p) * 0.55 + noise(p * 2.03) * 0.28 + noise(p * 4.11) * 0.17;
  }

  void main() {
    vec2 q = vUv * vec2(2.6, 1.5);
    q.x += uTime * 0.014 + uIndex * 3.1;
    q.y -= uTime * 0.006;
    float n = fbm(q);
    n = smoothstep(0.26, 0.95, n);

    // Soft on all four edges, and heaviest at the bottom, so it reads as
    // something lying on the floor rather than a sheet hung in the air.
    float edge = smoothstep(0.0, 0.42, vUv.x) * smoothstep(1.0, 0.58, vUv.x);
    edge *= smoothstep(0.0, 0.26, vUv.y) * smoothstep(0.92, 0.3, vUv.y);
    float a = min(1.0, n * edge * uOpacity);
    if (a <= 0.003) discard;

    // Lit from inside the machine: indigo low and central, cool grey above.
    // Fog that is one flat colour is smoke-machine, not cinema.
    vec3 col = mix(uBase, uTint, smoothstep(0.7, 0.0, vHeight) * 0.9);
    // NOT premultiplied. Additive blending already scales the colour by the
    // alpha it is handed, so premultiplying here squared the coverage and the
    // fog contributed under one percent of what it should have — present in
    // the buffer, invisible on screen.
    gl_FragColor = vec4(col * (0.8 + n * 1.1), a);
  }
`;

// ── post: bloom, ACES, vignette, grain ──────────────────────────────────
const POST_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform vec2  uTexel;
  uniform float uTime;
  uniform float uBloom;
  uniform float uRadius;
  uniform float uGrain;
  uniform float uExposure;
  varying vec2 vUv;

  // ACES filmic, Narkowicz's fit. Tone mapping has to happen here rather than
  // in the materials because three skips it when rendering to a target — and
  // it has to happen after the bloom, so the glow sums real light rather than
  // already-compressed light.
  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    vec4 base = texture2D(tScene, vUv);

    // Sixteen taps on a golden-angle spiral, two radii. A ring at this count
    // bands visibly on the straight machined edges this scene is made of.
    vec3 glow = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float f = (float(i) + 0.5) / 16.0;
      float ang = float(i) * 2.39996323;
      vec2 off = vec2(cos(ang), sin(ang)) * sqrt(f) * uRadius;
      glow += max(texture2D(tScene, vUv + off * uTexel).rgb - 0.55, 0.0);
      glow += max(texture2D(tScene, vUv - off * uTexel * 2.4).rgb - 0.9, 0.0) * 0.5;
    }
    glow *= uBloom / 16.0;

    vec3 col = (base.rgb + glow) * uExposure;
    float alpha = base.a + dot(glow, vec3(0.28));

    col = aces(col);

    vec2 q = vUv - 0.5;
    float vig = 1.0 - dot(q, q) * 0.62;
    col *= vig;
    alpha *= vig;

    float n = fract(sin(dot(vUv * 2048.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    float g = (n - 0.5) * uGrain;
    col += g;
    alpha = clamp(alpha + g * 0.4, 0.0, 1.0);

    gl_FragColor = vec4(max(col, 0.0), alpha);

    // The only colour-space conversion in the pipeline, and it belongs here: a
    // raw ShaderMaterial gets no output encoding unless it asks for one, so
    // without this the scene's linear values reach the canvas as though they
    // were already sRGB and every surface renders far too dark.
    #include <colorspace_fragment>
  }
`;

// ── helpers ─────────────────────────────────────────────────────────────

/** A `THREE.Shape` from the same polyline both renderers draw. */
function shapeFrom(pts: readonly Vec2[], ox = 0, oy = 0): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0] + ox, pts[0][1] + oy);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0] + ox, pts[i][1] + oy);
  s.closePath();
  return s;
}

function pathFrom(pts: readonly Vec2[], ox = 0, oy = 0): THREE.Path {
  const p = new THREE.Path();
  p.moveTo(pts[0][0] + ox, pts[0][1] + oy);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0] + ox, pts[i][1] + oy);
  p.closePath();
  return p;
}

/** Chamfered extrusion. The bevel is what catches the key light on every edge. */
function machined(shape: THREE.Shape, depth: number, bevel = 0.008) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
}

/** Rounded-box helper for rails, plinths and anything without a hole in it. */
function slab(w: number, h: number, d: number, r = 0.02) {
  const g = machined(shapeFrom(roundRect(w, h, r, 3)), d);
  g.translate(0, 0, -d / 2);
  return g;
}

type Birth = {
  obj: THREE.Object3D;
  from: THREE.Vector3;
  rot: number;
  delay: number;
};

export default function MachineGL() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const frame = host?.parentElement;
    const stage = frame?.parentElement;
    if (!host || !frame || !stage) return;

    // The canvas is created here rather than rendered by React, and it is not a
    // style preference. Teardown ends in `forceContextLoss()`, which
    // permanently poisons the element it ran on. React reuses the same DOM node
    // across StrictMode's mount → unmount → mount, so a JSX canvas comes back
    // dead on the second mount and the hero silently stays an SVG in
    // development. Owning the element means every effect run gets a virgin one.
    const canvas = document.createElement("canvas");
    canvas.className = "mx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const DEV = process.env.NODE_ENV !== "production";
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false, // the render target carries the MSAA instead
        powerPreference: "high-performance",
        preserveDrawingBuffer: DEV,
      });
    } catch {
      return;
    }
    renderer.setClearColor(VOID, 0);

    const disposables: { dispose(): void }[] = [];
    const keep = <T extends { dispose(): void }>(x: T) => {
      disposables.push(x);
      return x;
    };

    // ── scene, camera, environment ───────────────────────────────────
    const scene = new THREE.Scene();
    // Aerial perspective. The back of the object has to sit back, and on a
    // near-black ground this is the cheapest way to say so.
    scene.fog = new THREE.FogExp2(0x090a0c, 0.055);

    const camera = new THREE.PerspectiveCamera(
      VIEW.fovDeg,
      VIEW.aspect,
      VIEW.near,
      VIEW.far,
    );
    camera.position.set(...(VIEW.eye as unknown as [number, number, number]));
    camera.lookAt(...(VIEW.target as unknown as [number, number, number]));

    const env = keep(studioEnvironment(renderer));
    scene.environment = env;

    // One directional key on top of the environment, so there are real cast
    // highlights and not only reflections. No second light: two lights on a
    // near-black object is where "engineered" turns into "rendered".
    const key = new THREE.DirectionalLight(0xdfe6f2, 2.1);
    key.position.set(-3.4, 5.6, 4.2);
    scene.add(key);
    // One indigo practical, low and in front — the machine's own light coming
    // back off the fog it is standing in. It is the second and last light.
    const fillLight = new THREE.PointLight(INDIGO, 7.5, 8, 2);
    fillLight.position.set(0, -1.7, 1.1);
    scene.add(fillLight);

    const rough = keep(brushedRoughness());

    // ── materials ────────────────────────────────────────────────────
    const metal = (
      color: number,
      roughness: number,
      opts: Partial<THREE.MeshPhysicalMaterialParameters> = {},
    ) =>
      keep(
        new THREE.MeshPhysicalMaterial({
          color,
          metalness: 1,
          roughness,
          roughnessMap: rough,
          // Well above 1. The environment is a near-black room with one key in
          // it, which is physically what the scene is; at unit intensity the
          // metal returns almost nothing and the object reads as a silhouette.
          // Pushing the environment is the same move a product photographer
          // makes with a white card, and it is cheaper than a second light.
          envMapIntensity: 1.35,
          ...opts,
        }),
      );

    /**
     * Anodised aluminium for the panel faces, with `anisotropy` turned up:
     * `MeshStandardMaterial` gave a perfectly circular highlight on every
     * bevel, which reads as chrome-plated plastic. Anisotropy stretches the
     * highlight along the brush direction, and it is the single change that
     * made these read as machined rather than moulded.
     */
    const matPanel = metal(0x7b828c, 0.42, { anisotropy: 0.7, anisotropyRotation: 0 });
    const matRail = metal(0xaeb5bf, 0.3, { anisotropy: 0.55 });
    const matPlinth = metal(0x5b626b, 0.5);
    const matGear = metal(0x8a9099, 0.52);
    // Near-black steel, and the one part of the object that is not aluminium:
    // the track has to read against the panels it runs over, and a bright rail
    // on a bright panel is a rail nobody can follow.
    const matTrack = metal(0x7c838d, 0.22);
    const matTrackSmooth = metal(0x7c838d, 0.24, { roughnessMap: null });
    const matFastener = metal(0xd2d7de, 0.28);
    /**
     * The same steel without the roughness map. On a torus or a cone the map's
     * UVs compress to nothing at the poles, so neighbouring pixels sample wildly
     * different roughness and throw single-pixel specular fireflies — which the
     * bloom then turns into a white starburst hanging off the inlet. Small
     * curved parts get a plain material; flat machined faces keep the brush.
     */
    const matSmooth = metal(0xaeb5bf, 0.34, { roughnessMap: null });
    // Gunmetal, and the only place on the object where the brief's #1C1E22
    // belongs: a pocket floor is anodised, a machined face is not.
    const matPocket = keep(
      new THREE.MeshPhysicalMaterial({
        color: 0x1c1e22,
        metalness: 0.72,
        roughness: 0.58,
        roughnessMap: rough,
        envMapIntensity: 1.15,
      }),
    );
    const matMarble = keep(
      new THREE.MeshPhysicalMaterial({
        color: 0x0d0e10,
        metalness: 0,
        roughness: 0.42,
        clearcoat: 0.9,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.3,
      }),
    );

    const matLed = keep(
      new THREE.MeshBasicMaterial({ color: INDIGO.clone(), toneMapped: false }),
    );
    const matFlame = keep(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffb570),
        toneMapped: false,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    // ── the terminal screen ──────────────────────────────────────────
    /**
     * A canvas texture, redrawn only when the line changes. The words on it are
     * also real text in the DOM under the stage (`MachineReadout`), which is
     * what keeps this the decoration and that the content — never bake text
     * into a picture and call it typography (WCAG 1.4.5).
     */
    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 512;
    screenCanvas.height = 200;
    const sctx = screenCanvas.getContext("2d")!;
    const screenTex = keep(new THREE.CanvasTexture(screenCanvas));
    screenTex.colorSpace = THREE.SRGBColorSpace;
    const matScreen = keep(
      new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
    );

    let screenLine = "";
    let screenCursor = false;
    let screenPower = -1;
    const drawScreen = (line: string, cursor: boolean, power: number) => {
      const g = sctx;
      g.fillStyle = "#04120c";
      g.fillRect(0, 0, 512, 200);
      if (power > 0.02) {
        g.globalAlpha = power;
        // Scanlines. Two pixels on, two off — the thing that says "a display"
        // rather than "a green rectangle".
        g.fillStyle = "rgba(61,214,140,0.055)";
        for (let y = 0; y < 200; y += 4) g.fillRect(0, y, 512, 2);
        g.fillStyle = GREEN;
        g.font = "600 27px ui-monospace, SFMono-Regular, Menlo, monospace";
        g.fillText("VX · READY", 26, 48);
        g.font = "400 25px ui-monospace, SFMono-Regular, Menlo, monospace";
        g.fillStyle = "#8ef0bd";
        g.fillText(line.slice(0, 30), 26, 106);
        g.fillStyle = "rgba(61,214,140,0.55)";
        g.fillRect(26, 138, 300, 2);
        if (cursor) {
          g.fillStyle = GREEN;
          g.fillRect(26, 156, 15, 24);
        }
        g.globalAlpha = 1;
      }
      screenTex.needsUpdate = true;
    };
    drawScreen("", false, 0);

    // ── the object ───────────────────────────────────────────────────
    const root = new THREE.Group();
    scene.add(root);

    const births: Birth[] = [];
    const add = (
      obj: THREE.Object3D,
      from: [number, number, number],
      delay: number,
      rot = 0,
    ) => {
      root.add(obj);
      births.push({ obj, from: new THREE.Vector3(...from), rot, delay });
      return obj;
    };

    // Plinth — arrives first, from below, because everything else stands on it.
    // ExtrudeGeometry builds in XY and extrudes along +Z, so a horizontal slab
    // is the same geometry laid down. Rotating beats writing a second builder.
    const plinth = new THREE.Group();
    const plinthBody = new THREE.Mesh(
      keep(
        machined(shapeFrom(roundRect(PLINTH_W, PLINTH_D, 0.05, 3)), PLINTH_H, 0.018),
      ),
      matPlinth,
    );
    plinthBody.rotation.x = -Math.PI / 2;
    plinthBody.position.y = PLINTH_Y - PLINTH_H;
    plinth.add(plinthBody);
    const plinthFoot = new THREE.Mesh(
      keep(
        machined(
          shapeFrom(roundRect(PLINTH_W + 0.16, PLINTH_D + 0.16, 0.06, 3)),
          0.12,
          0.014,
        ),
      ),
      matPlinth,
    );
    plinthFoot.rotation.x = -Math.PI / 2;
    plinthFoot.position.y = PLINTH_Y - PLINTH_H;
    plinth.add(plinthFoot);
    add(plinth, [0, -2.2, 0], 0);

    // Uprights.
    const railGeo = keep(slab(RAIL_W, RAIL_TOP - RAIL_BOTTOM, RAIL_D, 0.03));
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, matRail);
      rail.position.set(sx * RAIL_X, (RAIL_TOP + RAIL_BOTTOM) / 2, 0);
      add(rail, [sx * 3.4, 0, 0], 0.12);
    }

    // Head casting and the funnel that feeds the first slot.
    const head = new THREE.Mesh(
      keep(slab(PANEL_W + 0.24, 0.26, RAIL_D, 0.03)),
      matRail,
    );
    head.position.set(0, RAIL_TOP - 0.12, 0);
    add(head, [0, 2.6, 0], 0.2);

    /**
     * The light behind everything. One emissive plane, occluded by the panels,
     * so light only escapes where the object actually has an opening — the gaps
     * between modules and the pockets machined through them. That is reference
     * #3's move, and it is why the machine reads as lit from within rather than
     * as having glowing stickers on it.
     */
    const backlightTex = keep(backlightTexture());
    const backlight = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(PANEL_W + 0.3, 4.9)),
      keep(
        new THREE.MeshBasicMaterial({
          map: backlightTex,
          color: new THREE.Color(1, 1, 1),
          toneMapped: false,
        }),
      ),
    );
    backlight.position.set(0, 0, -0.34);
    add(backlight, [0, 0, -1.6], 0.28);

    // ── modules ──────────────────────────────────────────────────────
    type Mod = {
      id: ModuleId;
      group: THREE.Group;
      led: THREE.Mesh;
      y: number;
      hover: number;
    };

    const fastenerGeo = keep(new THREE.CylinderGeometry(0.022, 0.022, 0.028, 10));
    const ledGeo = keep(new THREE.CircleGeometry(0.028, 12));

    const mods: Mod[] = MODULES.map((m, i) => {
      const g = new THREE.Group();
      g.position.y = m.y;
      const face = FACES[m.id];

      // The panel: one extrusion, with every through-pocket as a real hole. The
      // holes are why the backlight reads — a texture could fake the look but
      // not the occlusion, and occlusion is the whole effect.
      const shape = shapeFrom(roundRect(PANEL_W, PANEL_H, 0.055, 4));
      for (const p of face.pockets) {
        shape.holes.push(pathFrom(roundRect(p.w, p.h, p.r, 3), p.x, p.y));
      }
      const panelGeo = keep(machined(shape, PANEL_D, 0.009));
      panelGeo.translate(0, 0, FACE_Z - PANEL_D);
      const panel = new THREE.Mesh(panelGeo, matPanel);
      g.add(panel);

      // Blind pockets get a floor set back behind the opening; through pockets
      // get nothing, and the light comes out.
      for (const p of face.pockets) {
        if (p.through) continue;
        const floor = new THREE.Mesh(
          keep(machined(shapeFrom(roundRect(p.w, p.h, p.r, 3), p.x, p.y), 0.02, 0.004)),
          matPocket,
        );
        floor.position.z = FACE_Z - 0.06;
        g.add(floor);
      }

      const screws = new THREE.InstancedMesh(fastenerGeo, matFastener, face.fasteners.length);
      const mtx = new THREE.Matrix4();
      face.fasteners.forEach((f, k) => {
        mtx.makeRotationX(Math.PI / 2);
        mtx.setPosition(f[0], f[1], FACE_Z + 0.006);
        screws.setMatrixAt(k, mtx);
      });
      screws.instanceMatrix.needsUpdate = true;
      g.add(screws);

      const ledMesh = new THREE.Mesh(ledGeo, matLed.clone());
      keep(ledMesh.material as THREE.Material);
      ledMesh.position.set(PANEL_W / 2 - 0.2, PANEL_H / 2 - 0.15, FACE_Z + 0.012);
      g.add(ledMesh);

      // Panels arrive from alternating sides, which reads as assembly rather
      // than as a curtain falling.
      add(g, [(i % 2 ? 1 : -1) * 3.6, m.y + 0.4, 0.9], 0.34 + i * 0.11, (i % 2 ? 1 : -1) * 0.5);
      return { id: m.id, group: g, led: ledMesh, y: m.y, hover: 0 };
    });

    const modOf = (id: ModuleId) => mods[MODULE_IDS.indexOf(id)];

    // ── the mechanisms ───────────────────────────────────────────────

    // Schema: the slot plate slides a few millimetres as the marble drops
    // through it — the plate accepting the shape, which is the whole metaphor.
    const schemaPlate = new THREE.Mesh(
      keep(slab(PANEL_W - 0.3, 0.05, 0.06, 0.02)),
      matRail,
    );
    schemaPlate.position.set(0, -0.28, FACE_Z + 0.05);
    modOf("schema").group.add(schemaPlate);

    // RLS: two shutters that part. They always pass in the demo, because the
    // hero is not the place to argue that the product sometimes says no.
    const shutterGeo = keep(slab(GATE_W / 2 + 0.012, GATE_H + 0.05, 0.05, 0.014));
    const shutters = [-1, 1].map((s) => {
      const sh = new THREE.Mesh(shutterGeo, matRail);
      sh.position.set(GATE_X + (s * (GATE_W / 2 + 0.012)) / 2, -0.02, FACE_Z + 0.045);
      modOf("rls").group.add(sh);
      return { mesh: sh, dir: s, home: sh.position.x };
    });

    // Server actions: the arm, its hub, and two gears. The small gear is the
    // one that turns when nothing is happening.
    const armGroup = new THREE.Group();
    armGroup.position.set(ARM_HUB[0], ARM_HUB[1], FACE_Z + 0.075);
    const armBar = new THREE.Mesh(
      keep(slab(ARM_R + 0.2, 0.085, 0.05, 0.035)),
      matRail,
    );
    armBar.position.x = (ARM_R + 0.2) / 2 - 0.08;
    armGroup.add(armBar);
    const cup = new THREE.Mesh(
      keep(new THREE.TorusGeometry(MARBLE_R + 0.022, 0.02, 6, 14, Math.PI * 1.4)),
      matSmooth,
    );
    cup.position.x = ARM_R;
    cup.rotation.z = -Math.PI * 0.3;
    armGroup.add(cup);
    modOf("actions").group.add(armGroup);

    const hub = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.078, 0.078, 0.07, 18)),
      matSmooth,
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.set(ARM_HUB[0], ARM_HUB[1], FACE_Z + 0.04);
    modOf("actions").group.add(hub);

    // Sitting proud of the face, in the recesses, the way a real drive train is
    // mounted. Behind the panel they were a starburst seen through a hole.
    const gearBig = new THREE.Mesh(
      keep(machined(shapeFrom(gearProfile(0.185, 18)), 0.045, 0.005)),
      matGear,
    );
    gearBig.position.set(-0.72, 0, FACE_Z - 0.01);
    modOf("actions").group.add(gearBig);
    const gearSmall = new THREE.Mesh(
      keep(machined(shapeFrom(gearProfile(0.125, 13)), 0.045, 0.005)),
      matGear,
    );
    gearSmall.position.set(0.72, 0.02, FACE_Z - 0.01);
    modOf("actions").group.add(gearSmall);

    // Interface: the recessed screen.
    const screenMesh = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H)),
      matScreen,
    );
    screenMesh.position.set(SCREEN_X, SCREEN_Y, FACE_Z + 0.004);
    modOf("interface").group.add(screenMesh);
    const bezel = new THREE.Mesh(
      keep(
        machined(
          shapeFrom(roundRect(SCREEN_W + 0.09, SCREEN_H + 0.09, 0.03, 3)),
          0.03,
          0.008,
        ),
      ),
      matPanel,
    );
    bezel.position.set(SCREEN_X, SCREEN_Y, FACE_Z - 0.01);
    modOf("interface").group.add(bezel);

    // Deploy: the breech ring the marble drops into before it leaves.
    const breech = new THREE.Mesh(
      keep(new THREE.TorusGeometry(0.115, 0.028, 8, 22)),
      matSmooth,
    );
    breech.position.set(0.5, -0.02, FACE_Z + 0.03);
    modOf("deploy").group.add(breech);

    // ── track ────────────────────────────────────────────────────────
    const railTube = (run: Pt3[], dz: number) => {
      const curve = new THREE.CatmullRomCurve3(
        sampleRun(run, 5).map((p) => new THREE.Vector3(p[0], p[1], p[2] + dz)),
      );
      return keep(new THREE.TubeGeometry(curve, 90, 0.014, 5, false));
    };
    const trackGroup = new THREE.Group();
    /**
     * Sleepers between the two rails, every ~0.11 units. Two bare tubes read as
     * a pair of cables draped over the machine; the ties are what make it a
     * track, and at one instanced draw for the whole machine they are free.
     */
    const tieGeo = keep(new THREE.CylinderGeometry(0.009, 0.009, 0.14, 6));
    const ties: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const dir = new THREE.Vector3();
    for (const run of [RUN_A, RUN_B]) {
      for (const dz of [-0.055, 0.055]) {
        trackGroup.add(new THREE.Mesh(railTube(run, dz), matTrackSmooth));
      }
      const pts = sampleRun(run, 7);
      for (let i = 0; i < pts.length; i += 3) {
        const a = pts[i];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        // A tie is a cylinder across the track, so it lies along z and its own
        // axis has to be turned onto that from the geometry's default +Y.
        dir.set(0, 0, 1);
        q.setFromUnitVectors(up, dir);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(a[0], a[1], a[2]),
          q,
          new THREE.Vector3(1, 1, 1),
        );
        void b;
        ties.push(m);
      }
    }
    const tieMesh = new THREE.InstancedMesh(tieGeo, matTrack, ties.length);
    ties.forEach((m, i) => tieMesh.setMatrixAt(i, m));
    tieMesh.instanceMatrix.needsUpdate = true;
    trackGroup.add(tieMesh);

    /**
     * The launch rail is a barrel, not a pair of rails. As two thin tubes it
     * read as a cable hanging down the side of the machine with a lampshade on
     * top — the single worst thing in the frame. A closed tube with brackets
     * back to the upright says "this is where it leaves from" without a label.
     */
    const barrelCurve = new THREE.CatmullRomCurve3(
      sampleRun(RUN_C, 5).map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    trackGroup.add(
      new THREE.Mesh(
        keep(new THREE.TubeGeometry(barrelCurve, 40, 0.055, 10, false)),
        matSmooth,
      ),
    );
    for (const by of [-1.15, 0.35, 1.75]) {
      const bracket = new THREE.Mesh(keep(slab(0.34, 0.06, 0.07, 0.02)), matRail);
      bracket.position.set((LAUNCH_X + RAIL_X) / 2 + 0.06, by, TRACK_Z - 0.02);
      trackGroup.add(bracket);
    }

    // The hopper at the mouth. A collar rather than the pair of angled bars the
    // first pass had, which read as antennae rather than as an inlet.
    // Short and wide. A tall cone up here read as a pendant lamp, which is what
    // an isolated cone on a thin stem always reads as.
    const matShell = keep(
      new THREE.MeshPhysicalMaterial({
        color: 0xaeb5bf,
        metalness: 1,
        roughness: 0.42,
        envMapIntensity: 1.35,
        side: THREE.DoubleSide,
      }),
    );
    const hopper = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.19, 0.095, 0.15, 18, 1, true)),
      matShell,
    );
    hopper.position.set(RUN_A[0][0], RAIL_TOP + 0.2, TRACK_Z);
    trackGroup.add(hopper);
    const collar = new THREE.Mesh(
      keep(new THREE.TorusGeometry(0.19, 0.014, 8, 22)),
      matSmooth,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(RUN_A[0][0], RAIL_TOP + 0.275, TRACK_Z);
    trackGroup.add(collar);
    // A stub back to the head casting, so the inlet is mounted rather than
    // floating above the machine on nothing.
    const inletArm = new THREE.Mesh(keep(slab(0.5, 0.055, 0.07, 0.02)), matRail);
    inletArm.position.set(RUN_A[0][0] + 0.22, RAIL_TOP + 0.14, TRACK_Z - 0.03);
    trackGroup.add(inletArm);

    const cowl = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.095, 0.075, 0.16, 16, 1, true)),
      matShell,
    );
    cowl.position.set(LAUNCH_X, RAIL_TOP + 0.34, TRACK_Z);
    trackGroup.add(cowl);
    add(trackGroup, [0, 2.4, 0.8], 1.02);

    // ── the marble, and what it becomes ──────────────────────────────
    const marble = new THREE.Group();
    const ball = new THREE.Mesh(
      keep(new THREE.SphereGeometry(MARBLE_R, 22, 16)),
      matMarble,
    );
    marble.add(ball);
    // The rocket the marble turns into at Deploy. Hidden until then, and gone
    // once it has left, so nothing about it is visible during the other four.
    const rocket = new THREE.Group();
    const body = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(MARBLE_R * 0.62, MARBLE_R * 0.72, 0.2, 14)),
      matRail,
    );
    rocket.add(body);
    const nose = new THREE.Mesh(
      keep(new THREE.ConeGeometry(MARBLE_R * 0.62, 0.12, 14)),
      matRail,
    );
    nose.position.y = 0.16;
    rocket.add(nose);
    const flame = new THREE.Mesh(
      keep(new THREE.ConeGeometry(MARBLE_R * 0.52, 0.3, 12)),
      matFlame,
    );
    flame.position.y = -0.24;
    flame.rotation.x = Math.PI;
    rocket.add(flame);
    rocket.scale.setScalar(0);
    marble.add(rocket);
    root.add(marble);

    // ── fog ──────────────────────────────────────────────────────────
    const fogGeo = keep(new THREE.PlaneGeometry(3.5, 2.3));
    const fogMats: THREE.ShaderMaterial[] = [];
    const fogGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const m = keep(
        new THREE.ShaderMaterial({
          vertexShader: FOG_VERT,
          fragmentShader: FOG_FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uTime: { value: 0 },
            uIndex: { value: i * 1.31 },
            uOpacity: { value: 0 },
            uTint: { value: INDIGO.clone().multiplyScalar(0.72) },
            uBase: { value: new THREE.Color(0x2a3240) },
          },
        }),
      );
      fogMats.push(m);
      const q = new THREE.Mesh(fogGeo, m);
      // Kept low and forward. Fog belongs around the base of the object, and a
      // quad that reaches the middle modules is a haze over the product shot.
      q.position.set((i - 1.5) * 0.52, PLINTH_Y + 0.16 + (i % 2) * 0.18, 0.75 + (i % 2) * 0.45);
      q.renderOrder = 10 + i;
      fogGroup.add(q);
    }
    scene.add(fogGroup);

    // ── post ─────────────────────────────────────────────────────────
    const target = keep(
      new THREE.WebGLRenderTarget(2, 2, {
        samples: 4,
        type: THREE.HalfFloatType,
        depthBuffer: true,
        stencilBuffer: false,
      }),
    );
    const postMat = keep(
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
        `,
        fragmentShader: POST_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tScene: { value: target.texture },
          uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
          uTime: { value: 0 },
          uBloom: { value: 1.5 },
          uRadius: { value: 5.0 },
          uGrain: { value: 0.016 },
          uExposure: { value: 0.86 },
        },
      }),
    );
    const postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), postMat));
    const postCam = new THREE.Camera();

    // ── the route, arc-length parameterised ──────────────────────────
    const route = fullRoute();
    const table = arcTable(route.pts);
    const uAt = (i: number) => table.cum[i] / table.total;
    const U_ARM_FROM = uAt(route.armFrom);
    const U_ARM_TO = uAt(route.armTo);
    const U_LAUNCH = uAt(route.launchFrom);

    // ── measurement, on resize only ──────────────────────────────────
    // The single per-frame read is `window.scrollY`, which does not force
    // layout. Everything else here is cached until the box changes.
    const calloutEls = Array.from(stage.querySelectorAll<HTMLElement>(".mx-callout"));
    const readoutEl = stage.querySelector<HTMLElement>(".mx-readout-text");
    let trackTop = 0;
    let trackSpan = 1;

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      target.setSize(Math.round(w * dpr), Math.round(h * dpr));
      postMat.uniforms.uTexel.value.set(1 / (w * dpr), 1 / (h * dpr));

      // The frame's aspect is pinned to the camera's by CSS, so there is
      // nothing to fit — which is the whole reason the SVG and the canvas frame
      // the same rectangle at every width.
      camera.aspect = VIEW.aspect;
      camera.updateProjectionMatrix();

      const el = document.getElementById("da-hero");
      if (el) {
        const r = el.getBoundingClientRect();
        trackTop = r.top + window.scrollY;
        // The sticky stage stops moving once the track's tail passes, so the
        // usable scroll distance is the track minus one viewport.
        trackSpan = Math.max(1, r.height - window.innerHeight);
      }
    };

    // ── pointer: Rule 4 ──────────────────────────────────────────────
    // Fine pointers only. On touch this would compete with the page scroll, and
    // a hero that eats a swipe is a hero that traps scroll.
    let dragging = false;
    let dragId = -1;
    let lastX = 0;
    let yaw = 0;
    let ndcY = 99;

    const onDown = (e: PointerEvent) => {
      if (!finePointer || e.button !== 0) return;
      dragging = true;
      dragId = e.pointerId;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      stage.dataset.mxGrab = "on";
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (e.clientX < rect.left || e.clientX > rect.right) ndcY = 99;
      if (!dragging || e.pointerId !== dragId) return;
      yaw += (e.clientX - lastX) * 0.004;
      yaw = Math.max(-0.42, Math.min(0.42, yaw));
      lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      dragging = false;
      dragId = -1;
      delete stage.dataset.mxGrab;
    };
    const onLeave = () => (ndcY = 99);

    if (finePointer) {
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerleave", onLeave, { passive: true });
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
    }

    // ── frame ────────────────────────────────────────────────────────
    const tmp = new THREE.Vector3();
    const BUILD_DUR = 1.15;
    /** Longest delay plus one part's travel, so uilt reaches 1 exactly as the last part seats. */
    const BUILD_TOTAL = BUILD_DUR + 1.25;
    let painted = false;
    let buildStart = -1;
    let lastBuilt = -1;

    const draw = (time: number, forcedY?: number, forcedBuild?: number) => {
      const y = forcedY ?? window.scrollY;
      const p = clamp01((y - trackTop) / trackSpan);

      // ── the build. Once, on first paint, and never replayed on scroll.
      if (buildStart < 0) buildStart = time;
      // One clock for the whole build. `forcedBuild` winds it rather than
      // overriding the finished fraction, so a forced frame moves the parts as
      // well as the exposure — a hook that only fades cannot show the sequence
      // it exists to let you look at.
      const buildTime =
        forcedBuild != null ? forcedBuild * BUILD_TOTAL : time - buildStart;
      const built = clamp01(buildTime / BUILD_TOTAL);

      // The drawing is held at full strength until the object has actually
      // materialised, then settles to a ghost over it. Flipping to the canvas
      // on frame one — which is what "fallback until the first frame paints"
      // literally says — showed a near-empty frame while the parts were still
      // off-screen, which is worse than the drawing it replaced. The rule is
      // right; the threshold was wrong. The handoff is the build, not a frame.
      if (Math.abs(built - lastBuilt) > 0.02 || built === 1) {
        lastBuilt = built;
        stage.style.setProperty("--mx-built", String(Math.round(built * 100) / 100));
      }
      for (const bth of births) {
        const b = ease(ramp(buildTime, bth.delay, bth.delay + BUILD_DUR));
        const home = bth.obj.userData.home as THREE.Vector3 | undefined;
        if (!home) {
          bth.obj.userData.home = bth.obj.position.clone();
        }
        const h = bth.obj.userData.home as THREE.Vector3;
        const bz = lerp(bth.from.z, h.z, b);
        bth.obj.position.set(lerp(bth.from.x, h.x, b), lerp(bth.from.y, h.y, b), bz);
        bth.obj.rotation.z = lerp(bth.rot, 0, b);
        // Recorded so a hover lift can add to the build's z rather than
        // overwrite it — the two write the same channel on the same frame.
        bth.obj.userData.bz = bz;
      }

      // ── the marble's progress along the route
      const u = routeAt(p);
      const pos = atDistance(table, u);
      marble.position.set(pos[0], pos[1], pos[2]);
      // Held back until the build has finished seating the track it runs on.
      marble.visible = built > 0.55;

      // ── idle: one gear, one degree, every three seconds
      gearSmall.rotation.z = time * 0.00582;
      // The big gear is geared to it, and turns the other way. Nobody will
      // consciously notice; everybody would notice if it did not.
      gearBig.rotation.z = -time * 0.00582 * (13 / 18);

      // ── stage responses, all driven by where the marble actually is
      // Schema: the plate takes the hit as the marble passes through it. Every
      // window below comes off the route, so moving a control point moves the
      // mechanism with it rather than leaving it firing at nothing.
      const w0 = MODULE_WINDOWS[0];
      const w1 = MODULE_WINDOWS[1];
      schemaPlate.position.y =
        -0.28 - pulse(u, w0.from, lerp(w0.from, w0.to, 0.55)) * 0.024;

      // RLS: the shutters part ahead of the marble and close behind it.
      const gate =
        ramp(u, w1.from - 0.05, w1.from + 0.02) * (1 - ramp(u, w1.to - 0.02, w1.to + 0.05));
      for (const sh of shutters) {
        sh.mesh.position.x = sh.home + sh.dir * gate * (GATE_W / 2 + 0.03);
      }

      // Server actions: the arm carries the marble through the arc, which means
      // the arm angle is not animated — it is read off the marble's position,
      // so the cup cannot arrive a frame late.
      const armU = clamp01((u - U_ARM_FROM) / (U_ARM_TO - U_ARM_FROM || 1));
      const armDeg = lerp(ARM_CATCH_DEG, ARM_RELEASE_DEG, armU);
      armGroup.rotation.z = ((u < U_ARM_FROM ? ARM_CATCH_DEG : armDeg) * Math.PI) / 180;
      // Inertia: past the release the arm keeps going and settles back.
      if (u > U_ARM_TO) {
        const back = ease(ramp(u, U_ARM_TO, U_ARM_TO + 0.1));
        armGroup.rotation.z =
          ((lerp(ARM_RELEASE_DEG, ARM_CATCH_DEG + 360, back) * Math.PI) / 180);
      }

      // Interface: the screen powers up as the marble lands on it and stays lit.
      const iw = MODULE_WINDOWS[3];
      const power = ease(ramp(u, iw.from - 0.04, iw.from + 0.06));
      const active = moduleAt(u);
      const line = MODULES[active].readout;
      const blink = Math.floor(time * 1.6) % 2 === 0;
      // The texture is re-uploaded only when something on it actually changed.
      // Redrawing a 512×200 canvas every frame to animate a fade is a whole
      // texture upload per frame for a value nobody can see move that finely.
      if (
        line !== screenLine ||
        blink !== screenCursor ||
        Math.abs(power - screenPower) > 0.04
      ) {
        screenLine = line;
        screenCursor = blink;
        screenPower = power;
        drawScreen(line, blink, power);
      }
      if (readoutEl && readoutEl.textContent !== line) readoutEl.textContent = line;

      // Deploy: the marble becomes something that leaves.
      const launch = ramp(u, U_LAUNCH - 0.02, U_LAUNCH + 0.03);
      rocket.scale.setScalar(launch);
      ball.scale.setScalar(1 - launch);
      matFlame.opacity = launch * (0.35 + 0.4 * Math.abs(Math.sin(time * 22)));
      flame.scale.y = 0.7 + Math.abs(Math.sin(time * 17)) * 0.6;

      // ── module state: LED, hover lift, and which callout is showing
      let nearest = -1;
      if (finePointer && ndcY < 9 && !dragging) {
        let best = 0.16;
        mods.forEach((mo, i) => {
          tmp.set(0, 0, FACE_Z);
          mo.group.localToWorld(tmp);
          tmp.project(camera);
          const d = Math.abs(tmp.y - ndcY);
          if (d < best) {
            best = d;
            nearest = i;
          }
        });
      }
      const forced = stage.dataset.mxHover;
      if (forced) nearest = MODULE_IDS.indexOf(forced as ModuleId);

      mods.forEach((mo, i) => {
        mo.hover += ((i === nearest ? 1 : 0) - mo.hover) * 0.16;
        mo.group.position.z =
          ((mo.group.userData.bz as number) ?? 0) + mo.hover * 0.06;
        // The LED runs off three things: it is alive once built, it brightens
        // for the stage the marble is in, and it brightens for hover.
        const stageOn = i === active ? 1 : 0;
        const lit = 0.24 + stageOn * (0.5 + 0.5 * Math.sin(time * 3.1)) * 0.66 + mo.hover * 0.5;
        (mo.led.material as THREE.MeshBasicMaterial).color
          .copy(INDIGO)
          .multiplyScalar(built * Math.min(1.6, lit));
        const el = calloutEls[i];
        if (el) {
          const on = mo.hover > 0.5 ? "1" : "";
          if ((el.dataset.mxOn ?? "") !== on) {
            if (on) el.dataset.mxOn = on;
            else delete el.dataset.mxOn;
          }
          el.style.setProperty("--mx-live", String(Math.max(mo.hover, stageOn * 0.85)));
        }
      });

      // ── atmosphere
      for (const m of fogMats) {
        m.uniforms.uTime.value = time;
        m.uniforms.uOpacity.value = built * 1.35;
      }
      (backlight.material as THREE.MeshBasicMaterial).color.setScalar(
        built * (0.94 + 0.06 * Math.sin(time * 0.7)),
      );
      fillLight.intensity = 6.5 * built;

      // ── camera: drag orbits, and it settles back on release
      if (!dragging) yaw *= 0.955;
      root.rotation.y = yaw + Math.sin(time * 0.11) * 0.012;

      postMat.uniforms.uTime.value = time;
      postMat.uniforms.uBloom.value = 1.2 + power * 0.5;
      postMat.uniforms.uExposure.value = 0.54 + built * 0.32;

      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(postScene, postCam);

      // The drawing stays visible until a frame has actually reached the
      // canvas. If the loop never runs — throttled tab, lost context, a driver
      // that gives up — the page keeps the drawing rather than an empty column.
      if (!painted) {
        painted = true;
        stage.dataset.mxMode = "canvas";
      }
    };

    measure();

    let raf = 0;
    let running = false;
    let t0 = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!t0) t0 = now;
      draw((now - t0) / 1000);
    };
    const startLoop = () => {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    ro.observe(document.documentElement);

    // The loop only runs while the hero is on screen.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? startLoop() : stopLoop()),
      { rootMargin: "15% 0px" },
    );
    const heroEl = document.getElementById("da-hero");
    if (heroEl) io.observe(heroEl);

    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener("visibilitychange", onVisibility);

    // Hover and focus on a callout drive the object, so the keyboard path gets
    // the same response the mouse does.
    const onCalloutIn = (e: Event) => {
      const el = (e.target as Element).closest<HTMLElement>(".mx-callout");
      if (el?.dataset.module) stage.dataset.mxHover = el.dataset.module;
    };
    const onCalloutOut = () => delete stage.dataset.mxHover;
    for (const el of calloutEls) {
      el.addEventListener("pointerenter", onCalloutIn);
      el.addEventListener("pointerleave", onCalloutOut);
      el.addEventListener("focusin", onCalloutIn);
      el.addEventListener("focusout", onCalloutOut);
    }

    // A reduced-motion preference set mid-session takes effect immediately: the
    // loop stops and the drawing comes back.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReduced = () => {
      if (!reduced.matches) return;
      stopLoop();
      painted = false;
      delete stage.dataset.mxMode;
    };
    reduced.addEventListener("change", onReduced);

    // Dev-only single-frame hook. It is the only reason this work is
    // verifiable: a headless browser can force a frame at a chosen scroll
    // position without waiting on requestAnimationFrame.
    if (DEV) {
      // Everything the scene knows about itself, for a headless browser to
      // read back. Diagnosing a dark frame by adjusting numbers and looking
      // again is how a day disappears.
      // Renders the scene straight to the canvas with no post pass, which is
      // the only way to tell "the scene is empty" from "the post pass ate it".
      (window as unknown as Record<string, unknown>).__mxRaw = () => {
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(scene, camera);
        return JSON.parse(JSON.stringify(renderer.info.render));
      };
      // Named handles on the scene, so a headless browser can switch one thing
      // off and re-render rather than infer which object is in the way.
      (window as unknown as Record<string, unknown>).__mxRefs = {
        scene,
        camera,
        root,
        backlight,
        fogGroup,
        trackGroup,
        plinth,
        head,
        mods,
        marble,
      };
      // Reads the render target back. The difference between "the scene is
      // dark" and "the scene never reached the texture the post pass samples"
      // is not visible from outside, and it is the only question worth asking
      // when a direct render looks right and a composited one does not.
      (window as unknown as Record<string, unknown>).__mxProbe = () => {
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene, camera);
        // Unbind first. With `samples > 0` the scene lands in a multisample
        // renderbuffer and is only blitted into `target.texture` when the
        // target is switched away from; reading before that returns the
        // unresolved buffer, which is what made the first probe lie.
        renderer.setRenderTarget(null);
        const w = target.width;
        const h = target.height;
        const buf = new Uint16Array(4);
        const read = (fx: number, fy: number) => {
          renderer.readRenderTargetPixels(
            target,
            Math.round(w * fx),
            Math.round(h * fy),
            1,
            1,
            buf,
          );
          // Half-float comes back as raw 16-bit; the magnitude is what matters.
          return Array.from(buf);
        };
        const out = {
          size: [w, h],
          centre: read(0.5, 0.5),
          panel: read(0.45, 0.62),
          void: read(0.06, 0.94),
        };
        return out;
      };
      (window as unknown as Record<string, unknown>).__mxDebug = () => {
        renderer.info.autoReset = false;
        renderer.info.reset();
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene, camera);
        const sceneInfo = JSON.parse(JSON.stringify(renderer.info.render));
        renderer.info.autoReset = true;
        const objs: unknown[] = [];
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const g = m.geometry;
          g.computeBoundingSphere();
          const bs = g.boundingSphere;
          objs.push({
            type: m.material.constructor.name,
            verts: g.attributes.position?.count ?? 0,
            nan: !bs || !Number.isFinite(bs.radius),
            r: bs ? Math.round(bs.radius * 1000) / 1000 : null,
            visible: m.visible,
            world: m
              .getWorldPosition(new THREE.Vector3())
              .toArray()
              .map((n) => Math.round(n * 100) / 100),
          });
        });
        return { info: sceneInfo, objs };
      };
      // Stops the loop and owns the frame. The first version left the loop
      // running and rewound `buildStart` to fake a finished build, so the very
      // next rAF frame recomputed `built` from a start time in the future,
      // clamped it to zero, and painted the machine disassembled and
      // off-screen. Every capture taken through it was of a state the site
      // never shows. A single-frame hook has to be the only thing drawing.
      (window as unknown as Record<string, unknown>).__mxDraw = (
        scrollY?: number,
        t = 6,
        build = 1,
      ) => {
        stopLoop();
        measure();
        draw(t, scrollY, build);
        return {
          trackTop,
          trackSpan,
          p: clamp01(((scrollY ?? window.scrollY) - trackTop) / trackSpan),
        };
      };
      (window as unknown as Record<string, unknown>).__mxResume = () => startLoop();
    }

    startLoop();

    return () => {
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReduced);
      for (const el of calloutEls) {
        el.removeEventListener("pointerenter", onCalloutIn);
        el.removeEventListener("pointerleave", onCalloutOut);
        el.removeEventListener("focusin", onCalloutIn);
        el.removeEventListener("focusout", onCalloutOut);
        delete el.dataset.mxOn;
        el.style.removeProperty("--mx-live");
      }
      delete stage.dataset.mxMode;
      delete stage.dataset.mxGrab;
      delete stage.dataset.mxHover;
      stage.style.removeProperty("--mx-built");
      if (DEV) {
        for (const k of [
          "__mxDraw",
          "__mxResume",
          "__mxDebug",
          "__mxRaw",
          "__mxProbe",
          "__mxRefs",
        ]) {
          delete (window as unknown as Record<string, unknown>)[k];
        }
      }
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  // `display: contents`, so the canvas the effect appends is laid out by the
  // stage exactly as if it were a direct child.
  return <div ref={hostRef} className="mx-gl-host" />;
}










