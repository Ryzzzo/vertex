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
import { gsap } from "gsap";
import {
  BloomEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  KernelSize,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  BlendFunction,
} from "postprocessing";
import { buildScore, initialCam, type CamState } from "./camera-score";
import { VolumetricFogPass } from "./volumetric-fog";
import { createMarbleWorld, type MarbleWorld } from "./marble-physics";

/**
 * The Machine — WebGL layer, v2.
 *
 * v1 rendered this object correctly into a 20%-width sidebar box. Everything
 * below is the same object at the scale it was designed for: a full-viewport
 * cinematic scene where the machine *is* the page and the copy is composited
 * into it.
 *
 * Every dimension still comes from `machine-parts.ts` — the same module the
 * server used to write the SVG sitting underneath this canvas — so the drawing
 * and the object remain the same object, and the build-in lands the parts
 * exactly on the lines.
 *
 * ── What changed from v1, and why ─────────────────────────────────────────
 *
 * **Framing.** The camera no longer has a fixed portrait aspect pinned by CSS.
 * It fills the viewport, and the machine is placed off-centre by moving the
 * *look-at target* rather than the object, so the composition can be reasoned
 * about in frame fractions instead of world coordinates.
 *
 * **Choreography.** A GSAP timeline (`camera-score.ts`) owns eleven channels
 * across seven keyframes. The loop calls `progress(p)`; nothing about the camera
 * is computed here any more.
 *
 * **Fog.** A depth-aware raymarch (`volumetric-fog.ts`) replaces v1's six
 * additive billboards, which could not be occluded by the object they surround.
 *
 * **Post.** `postprocessing`'s EffectComposer replaces the hand-rolled single
 * pass. The reason is not bloom quality — v1's sixteen-tap spiral was fine —
 * it is depth of field, which needs a circle-of-confusion pass, two bokeh
 * passes and a near/far split to not look like a blur filter. That is a day of
 * shader work the library has already done, and its EffectPass merges bloom, CA,
 * noise, vignette and tone mapping into one fragment shader anyway, so the pass
 * count barely moves.
 *
 * **Physics.** `marble-physics.ts`. Read its header for why the primary marble
 * is kinematic and the tray is not.
 *
 * **Sound.** Mechanical, muted by default, behind a toggle.
 *
 * Degradation is still the parent's job (`Machine.tsx`). This module is never
 * imported at all under reduced motion, Save-Data, low device memory, a narrow
 * viewport, or missing WebGL 2, so none of the above reaches those bundles.
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

      // Ground and sky. Near-black, because the room is a void — but not as
      // near-black as v1 had it. Metalness is 1 across the whole object, which
      // means every panel face is *entirely* reflected environment with no
      // diffuse term underneath. A room that is 0.012 grey produces a machine
      // that is 0.012 grey wherever it is not catching a highlight, and that is
      // the difference between "dark aluminium" and "black plastic". Doubling
      // the floor costs nothing and is what the object is actually made of.
      const up = Math.max(0, Math.sin(lat));
      let r = 0.026 + up * 0.055;
      let g = 0.028 + up * 0.06;
      let b = 0.035 + up * 0.078;

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
      /**
       * Size 1.85, not 2.7 — and the size matters more than the amplitude.
       *
       * A soft box wide enough to cover most of the upper hemisphere is not a
       * soft box, it is ambient light, and ambient light on a metal object is
       * the enemy of the whole shot: every face returns the same value however
       * it is angled, so the panels flatten and the machine reads as a CAD
       * render. Reference #2's tonal range comes from a *concentrated* card
       * upper-left with everything on the other side falling away, and the
       * falloff is the picture. Shrinking the card and pushing its amplitude up
       * gives the same total energy with a gradient across the object instead
       * of a wash over it.
       */
      const soft = blob(lon, lat, -0.95, 0.46, 1.85);
      r += soft * 2.7;
      g += soft * 2.8;
      b += soft * 3.05;

      // A second, dimmer card on the opposite side of the lens axis. One card
      // lights the faces it can see and leaves every face angled the other way
      // black, which on an object made entirely of flat panels at two or three
      // different angles reads as half the machine being switched off. This is
      // the fill card, and it is the last piece of the three-point setup a
      // product photographer would actually use.
      // Deliberately about a sixth of the key card's strength. A fill that
      // approaches the key erases the very falloff the key was shrunk to
      // create; this only stops the unlit side going to pure black.
      const fillCard = blob(lon, lat, 0.88, 0.3, 2.1);
      r += fillCard * 0.42;
      g += fillCard * 0.45;
      b += fillCard * 0.54;

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
 * **Removed in v2.** The billboard fog below has been replaced by the depth-
 * aware raymarch in `volumetric-fog.ts`.
 *
 * v1's comment argued that a raymarch "costs an order of magnitude more and
 * looks the same once the bloom has been over it", and at v1's framing that was
 * true. It stopped being true when the camera started moving: a billboard has no
 * depth, so it is either wholly in front of the plinth or wholly behind it,
 * never interleaved with it. Fog that cannot be occluded by the object it
 * surrounds reads as a texture the moment you orbit past it.
 *
 * Measured cost of the replacement is in `docs/machine-hero-decisions.md`.
 * The constants are kept here, unused, only long enough for the two to be
 * compared side by side in review; they go with the next commit.
 */
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
    // Aerial perspective, and it stays even though there is a real volumetric
    // now. The two are answering different questions: the raymarch is a *bank*
    // with a radial falloff around the plinth, so it says nothing at all about a
    // rail six units behind the camera's focus. This exponential says that.
    // Density is down from v1's 0.055 because the volumetric is now supplying
    // most of the depth cue and stacking both read as gauze.
    scene.fog = new THREE.FogExp2(0x090a0c, 0.031);

    /**
     * The camera's aspect is now the viewport's, not a constant. v1 pinned it to
     * 0.78 so the SVG viewBox and the frustum framed the identical rectangle,
     * which made the drawing→canvas handoff pixel-exact. That guarantee is worth
     * less than a full-bleed scene, so it has been traded deliberately: the SVG
     * still opens the shot, but it now cross-fades under a camera that is
     * already moving rather than swapping in place. The handoff reads as the
     * drawing coming to life instead of as a texture being replaced, which is
     * arguably what it should have been in v1 too.
     */
    const camera = new THREE.PerspectiveCamera(VIEW.fovDeg, 16 / 9, VIEW.near, VIEW.far);

    /** Every animated camera channel. Written by GSAP, read once per frame. */
    const cam: CamState = initialCam();
    const score = buildScore(gsap, cam);
    /** Set by measure(). Widens the vertical fov on narrow frames — see there. */
    let fovScale = 1;
    /** Set by measure(). Slides the machine across the frame by aspect. */
    let txBias = 0;
    /** The establishing shot, kept for the framing solve in measure(). */
    const home = initialCam();

    /**
     * Applies the score's spherical state to the camera.
     *
     * Kept as one function because the order matters and is easy to get wrong:
     * position, then `lookAt` (which overwrites rotation entirely), and only
     * then the roll, which has to be applied *along the view axis* afterwards
     * rather than baked into the up-vector — an `up` that is not perpendicular
     * to the view direction makes `lookAt` produce a skew, not a roll.
     */
    const applyCam = (mouseX: number, mouseY: number) => {
      const ce = Math.cos(cam.el);
      // The aspect bias rides on every keyframe, not only the establishing one,
      // so a portrait frame keeps the object clear of the callout rail for the
      // whole sequence rather than only at rest.
      const tx = cam.tx + txBias;
      camera.position.set(
        tx + Math.sin(cam.az) * ce * cam.radius,
        cam.ty + Math.sin(cam.el) * cam.radius,
        cam.tz + Math.cos(cam.az) * ce * cam.radius,
      );
      // Cursor parallax. Applied to the *camera* and not the object, so the
      // object's relationship to its own fog and shadows never shifts — moving
      // the machine instead is the version of this effect that reads as the
      // model sliding around inside the scene.
      camera.position.x += mouseX * 0.42;
      camera.position.y += mouseY * 0.3;
      camera.lookAt(tx, cam.ty, cam.tz);
      if (cam.roll !== 0) camera.rotateZ(cam.roll);
      const fov = cam.fov * fovScale;
      if (Math.abs(camera.fov - fov) > 1e-4) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    };

    const env = keep(studioEnvironment(renderer));
    scene.environment = env;

    // One directional key on top of the environment, so there are real cast
    // highlights and not only reflections. No second light: two lights on a
    // near-black object is where "engineered" turns into "rendered".
    // 3.1, up from v1's 2.1. The exposure that the whole scene is graded at is
    // now lower (0.46–0.80 against v1's effective ~0.86), because the emissives
    // and the fog needed reining in — and pulling exposure down takes the metal
    // with it. Putting the difference back as *light on the object* rather than
    // as exposure is what separates a lit machine from a lifted photograph: it
    // brightens the diffuse and the speculars without also brightening the void.
    const key = new THREE.DirectionalLight(0xdfe6f2, 2.45);
    key.position.set(-3.4, 5.6, 4.2);
    scene.add(key);

    /**
     * Real shadow mapping, which v1 did not have at all.
     *
     * At sidebar scale it was a defensible omission — a 450px-tall object lit by
     * an environment map reads fine without cast shadows, because there is
     * nowhere for a shadow to fall that anyone can see. At full viewport it is
     * the difference between an object standing on a plinth and an object
     * floating in front of one. The close-up keyframes are where it shows most:
     * without it, every panel is lit identically regardless of what is in front
     * of it, and five identically lit panels is a CAD render.
     *
     * `normalBias` rather than a large `bias`: this object is nothing but
     * chamfered edges meeting at shallow angles, which is precisely the geometry
     * a constant depth bias detaches shadows from. Offsetting along the normal
     * instead keeps contact shadows in contact.
     *
     * 1536², and the frustum is wrapped tight around the object rather than left
     * at the default ±5. Shadow texel density is map size over frustum area, so
     * halving the frustum is worth as much as doubling the map and costs
     * nothing.
     */
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.camera.left = -3.2;
    key.shadow.camera.right = 3.2;
    key.shadow.camera.top = 3.6;
    key.shadow.camera.bottom = -3.6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.022;
    key.shadow.radius = 3;
    /**
     * One indigo practical, low and in front — the machine's own light coming
     * back off the fog it is standing in. It is the second and last light.
     *
     * Pulled down hard from v1's 7.5. There is now a *real* volumetric in front
     * of this thing throwing indigo in-scatter across the lower half of the
     * frame, so the practical is no longer standing in for the fog's light — it
     * is stacking on top of it, and at v1's intensity the two together turned
     * every panel face lavender. Brushed aluminium that has gone blue is the
     * clearest possible signal that the lighting is doing the material's job.
     */
    const fillLight = new THREE.PointLight(INDIGO, 3.1, 7, 2);
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
          //
          // 1.85 in v2, up from 1.35. Metalness is 1, so *all* of the panel
          // face's colour is reflected environment — there is no diffuse term to
          // fall back on. At the lower exposure v2 grades at, 1.35 left the
          // faces reading as dark navy plastic; this is the number that decides
          // whether the object is aluminium or not.
          envMapIntensity: 1.85,
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

    // ── the hopper: a tray of loose marbles, simulated ────────────────
    /**
     * Fourteen marbles in a shallow machined tray on the head casting.
     *
     * This is where the rigid-body solver is actually spent, and it is spent
     * here rather than on the primary marble for reasons that are worth reading
     * in `marble-physics.ts` — briefly, a scrubbed timeline and a forward
     * integrator want incompatible things from the same object.
     *
     * What it buys, in order of how much it matters:
     *
     *   · **It cannot be faked.** Fourteen spheres settling into a pile against
     *     each other and a machined wall is the one thing on this page that a
     *     visitor who has seen a lot of websites has not seen approximated. The
     *     pile is also different on every reload, which no keyframe is.
     *   · **It makes the drag mean something.** Spinning the machine throws the
     *     marbles outward and they clatter down the far wall. Before this, drag
     *     rotated a static object; now it perturbs a system. That is the whole
     *     distance between Rule 4 and Rule 4a.
     *   · **It gives the deploy stage a physical consequence.** The launch
     *     jolts the tray, and a few marbles jump.
     *
     * Instanced, because fourteen draw calls for fourteen spheres on a page that
     * is already spending its budget on a raymarch is not a trade worth making.
     */
    const TRAY = {
      cx: 0,
      cy: RAIL_TOP + 0.06,
      cz: -0.02,
      w: 1.5,
      d: 0.46,
      wall: 0.16,
      r: MARBLE_R * 0.78,
      count: 14,
    } as const;

    const trayGroup = new THREE.Group();
    // The tray casting itself: a floor and four walls, machined from the same
    // aluminium as everything else.
    const trayFloor = new THREE.Mesh(
      keep(machined(shapeFrom(roundRect(TRAY.w + 0.18, TRAY.d + 0.18, 0.03, 3)), 0.05, 0.008)),
      matRail,
    );
    trayFloor.rotation.x = -Math.PI / 2;
    trayFloor.position.set(TRAY.cx, TRAY.cy, TRAY.cz);
    trayGroup.add(trayFloor);
    for (const [w, d, x, z] of [
      [TRAY.w + 0.18, 0.05, 0, TRAY.d / 2 + 0.045],
      [TRAY.w + 0.18, 0.05, 0, -TRAY.d / 2 - 0.045],
      [0.05, TRAY.d + 0.14, TRAY.w / 2 + 0.045, 0],
      [0.05, TRAY.d + 0.14, -TRAY.w / 2 - 0.045, 0],
    ] as const) {
      const wall = new THREE.Mesh(keep(slab(w, TRAY.wall, d, 0.012)), matRail);
      wall.position.set(TRAY.cx + x, TRAY.cy + TRAY.wall / 2, TRAY.cz + z);
      trayGroup.add(wall);
    }
    add(trayGroup, [0, 3.4, 0], 0.24);

    const looseGeo = keep(new THREE.SphereGeometry(TRAY.r, 16, 12));
    const loose = new THREE.InstancedMesh(looseGeo, matMarble, TRAY.count);
    loose.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    loose.frustumCulled = false;
    trayGroup.add(loose);

    let physics: MarbleWorld | null = null;
    try {
      physics = createMarbleWorld({ ...TRAY });
    } catch {
      // A solver that will not construct must not take the hero down with it.
      // Without physics the tray is simply full of marbles that do not move,
      // which is a worse hero and a working one.
      physics = null;
    }
    const loosePos = new Float32Array(TRAY.count * 3);
    const looseQuat = new Float32Array(TRAY.count * 4);
    const instMtx = new THREE.Matrix4();
    const instQ = new THREE.Quaternion();
    const instP = new THREE.Vector3();
    const ONE = new THREE.Vector3(1, 1, 1);

    // ── post ─────────────────────────────────────────────────────────
    /**
     * `postprocessing`'s composer, in this order:
     *
     *   RenderPass          → scene into a half-float buffer, MSAA on
     *   VolumetricFogPass   → depth-aware raymarch, composited (own file)
     *   EffectPass          → DOF · bloom · CA · noise · vignette · ACES
     *
     * The fog is its own Pass rather than an Effect inside the EffectPass, and
     * that placement is load-bearing: `BloomEffect` samples the buffer as it
     * *entered* the pass, so fog composited alongside it in the merged shader
     * would never bloom. Fog that does not bloom is fog with no glow around the
     * indigo, which is the entire look. Being a Pass puts it upstream, and the
     * bloom then sees lit vapour as light — which it is.
     *
     * Everything after the fog merges into one fragment shader. Five effects,
     * one pass, one dependent texture read, which is why the effect count here
     * is not the performance problem it looks like.
     */
    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 4,
    });
    composer.addPass(new RenderPass(scene, camera));

    const fogPass = new VolumetricFogPass(camera);
    composer.addPass(fogPass);

    /**
     * Depth of field. The single most expensive thing on the page and the reason
     * `postprocessing` was worth importing at all.
     *
     * `worldFocusDistance` is driven by the score's `focusY` — the camera
     * focuses on a *world height*, so a focus pull to the RLS module stays
     * focused on it however the camera orbits. Focusing on a fixed distance
     * instead makes every orbit a rack focus, which is nauseating.
     *
     * `resolutionScale` at 0.5: the CoC and bokeh passes are the cost, the sharp
     * region comes from the full-resolution input either way, and the blurred
     * region is by definition the part with no high frequencies to lose.
     */
    const dof = new DepthOfFieldEffect(camera, {
      worldFocusDistance: 10.6,
      worldFocusRange: 2.4,
      bokehScale: cam.bokeh,
      resolutionScale: 0.5,
    });

    /**
     * Bloom. `luminanceThreshold` sits just under where the LEDs and the screen
     * land after exposure and above where the brightest machined edge does —
     * the object's own specular highlights must not bloom or the whole thing
     * turns to fog. Everything that glows here is something that is actually
     * emitting.
     */
    const bloom = new BloomEffect({
      intensity: cam.bloom,
      // 0.94, and it took three passes to land there. The threshold has to sit
      // above the brightest *specular* on the machined edges and below the
      // emissives. Every value under it turned the chamfers into a glowing
      // wireframe — which is exactly what the close-up keyframes exposed and
      // the establishing shot hid, because the specular on a bevel gets hotter
      // the closer the camera is to it. A threshold tuned on a wide shot is a
      // threshold tuned on the easiest frame in the sequence.
      luminanceThreshold: 0.94,
      luminanceSmoothing: 0.12,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
      radius: 0.78,
    });

    /**
     * Chromatic aberration at roughly half a pixel at the frame edge.
     *
     * `radialModulation` is what separates "a sharp lens" from "a broken JPEG":
     * a real lens is corrected at the centre and drifts toward the corners, so
     * the offset has to scale with distance from centre. A uniform offset reads
     * as a mistake at any strength that is visible at all.
     */
    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(cam.ca, cam.ca * 0.6),
      radialModulation: true,
      modulationOffset: 0.15,
    });

    /**
     * Film grain at 2.4%. The cinema tell, and the cheapest one on the list.
     *
     * `BlendFunction.OVERLAY` rather than ADD: additive grain lifts the blacks,
     * and this page is mostly black. Overlay leaves the void alone and puts the
     * noise in the midtones, where actual film grain lives.
     */
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
    grain.blendMode.opacity.value = 0.024;

    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.62 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });

    composer.addPass(
      new EffectPass(camera, dof, bloom, chroma, grain, vignette, tone),
    );

    /**
     * Shadow flags, set by traversal rather than at each construction site.
     *
     * Everything solid casts and receives; anything that emits does neither. An
     * emissive plane that receives a shadow has a dark patch painted on a light
     * source, and one that casts blocks the light it is supposed to be — both
     * were visible in the first pass, the backlight throwing a hard rectangle
     * across the plinth. Detected by material type, so a part added later gets
     * the right answer without anyone remembering this rule.
     */
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      const emissive =
        (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial === true;
      m.castShadow = !emissive;
      m.receiveShadow = !emissive;
    });

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
      /**
       * Capped at 1.75 rather than v1's 2. The scene now carries a raymarch and
       * a depth-of-field pass, and both are fill-rate bound — the cost is
       * literally the pixel count. On a 3× phone panel the difference between
       * 1.75 and 2 is invisible under film grain and is about 30% of the frame
       * budget. This is the one place where "optimise for reaction" and
       * "optimise for bytes" point the same way: a 34fps hero has no reaction.
       */
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);

      // Full-bleed: the camera's aspect is whatever the viewport is.
      camera.aspect = w / h;

      /**
       * Framing compensation for narrow viewports.
       *
       * `PerspectiveCamera.fov` is *vertical*, so a 9:16 phone and a 21:9
       * monitor showing the same vertical fov show wildly different horizontal
       * extents — and this object is tall and thin, which is the worst case. At
       * 21:9 the machine ends up a sliver in an ocean of void; at 4:3 it is
       * cropped at the sides.
       *
       * The fix is to hold the *horizontal* extent roughly constant below 16:9
       * by widening the vertical fov as the frame narrows, which is what a
       * cinematographer changing lenses for a format would do. Above 16:9 the
       * vertical fov is left alone and the extra width is simply more room for
       * the copy, which is exactly what an ultrawide should get.
       */
      const REF = 16 / 9;
      const a = camera.aspect;
      fovScale = a < REF ? Math.min(1.42, REF / Math.max(a, 0.55)) : 1;
      camera.updateProjectionMatrix();

      /**
       * Where the machine sits across the frame, and the one number the CSS and
       * the camera have to agree on.
       *
       * They did not, briefly, and the bug is worth recording because it looks
       * like nothing: `--mx-machine-x` positions the SVG opener, while the
       * canvas is placed by the score's look-at `tx`. On a wide frame the two
       * happen to coincide, so moving the CSS variable to fix a portrait-tablet
       * collision moved the drawing and left the render exactly where it was —
       * and since the drawing is only on screen for the first two seconds, the
       * change appeared to do nothing at all rather than to half-work.
       *
       * Now one constant drives both: the fraction is chosen here, the camera
       * target is solved back from it through the frustum, and the custom
       * property is written from the same value so the drawing follows. The CSS
       * keeps its own media-query values purely for the no-JavaScript path.
       *
       * Below square, the machine goes left of centre rather than right: the
       * callout rail needs the right edge, and the object's silhouette is much
       * wider than its panel stack because the launch rail stands outboard.
       */
      const frameX = a >= 1 ? 0.65 : 0.38;
      const visH =
        2 * home.radius * Math.tan((((VIEW.fovDeg * fovScale) / 2) * Math.PI) / 180);
      txBias = -(frameX - 0.5) * visH * a - home.tx;
      stage.style.setProperty("--mx-machine-x", `${(frameX * 100).toFixed(1)}%`);

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
    /** Yaw at the previous frame and the frame before that, for ω and α. */
    let yawPrev = 0;
    let omegaPrev = 0;
    let ndcY = 99;
    /** Cursor position in NDC, smoothed in the loop, for camera parallax. */
    let mouseTX = 0;
    let mouseTY = 0;
    let mouseX = 0;
    let mouseY = 0;

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
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) {
        ndcY = 99;
        mouseTX = 0;
        mouseTY = 0;
      } else {
        mouseTX = nx;
        mouseTY = ndcY;
      }
      if (!dragging || e.pointerId !== dragId) return;
      /**
       * Wider than v1's ±0.42 rad. At sidebar scale a 24° swing was as much as
       * the composition could take; at full viewport the object is the scene and
       * the visitor expects to be able to walk around it. ±0.85 (≈49°) is where
       * the backlight plane starts to show its edge, which is the real limit.
       */
      yaw += (e.clientX - lastX) * 0.0052;
      yaw = Math.max(-0.85, Math.min(0.85, yaw));
      lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      dragging = false;
      dragId = -1;
      delete stage.dataset.mxGrab;
    };
    const onLeave = () => {
      ndcY = 99;
      mouseTX = 0;
      mouseTY = 0;
    };

    if (finePointer) {
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerleave", onLeave, { passive: true });
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
    }

    // ── sound ────────────────────────────────────────────────────────
    /**
     * Muted by default and behind a toggle, because audio that starts on its own
     * is the single most reliable way to make someone close a tab.
     *
     * Synthesised, not sampled. Three reasons, in order: no request and no
     * bytes; a click whose pitch and decay are parameters can be *the same
     * click* at five different weights, which a set of five mp3s cannot be
     * without sounding like a set of five mp3s; and the ambient bed is a filtered
     * noise loop, which is about nine lines here and about 400 KB as a file.
     *
     * The whole thing is built lazily on the first unmute, so a visitor who
     * never touches the toggle pays for none of it — not even an AudioContext,
     * which on some browsers is enough to light the "this tab is playing audio"
     * indicator and is exactly the kind of thing that gets a site distrusted.
     */
    let audio: {
      ctx: AudioContext;
      bus: GainNode;
      click(gain: number, pitch: number): void;
    } | null = null;
    let soundOn = false;

    const initAudio = () => {
      if (audio) return audio;
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const bus = ctx.createGain();
      bus.gain.value = 0;
      bus.connect(ctx.destination);

      // Ambient bed: brown-ish noise through a low-pass, plus a 52 Hz sine an
      // octave under the room tone. Together they read as a large machine idling
      // in a hall rather than as a synth pad.
      const N = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, N, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < N; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        ch[i] = last * 3.2;
      }
      // Crossfade the loop's own seam, or the bed ticks once every three seconds.
      const fade = Math.floor(ctx.sampleRate * 0.05);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        ch[i] = ch[i] * t + ch[N - fade + i] * (1 - t);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 340;
      lp.Q.value = 0.6;
      const hum = ctx.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 52;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.055;
      src.connect(lp).connect(bus);
      hum.connect(humGain).connect(bus);
      src.start();
      hum.start();

      /** One mechanical click: a short filtered noise burst with a fast decay. */
      const click = (gain: number, pitch: number) => {
        const now = ctx.currentTime;
        const len = 0.055;
        const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 7);
        }
        const s = ctx.createBufferSource();
        s.buffer = b;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = pitch;
        bp.Q.value = 2.4;
        const g = ctx.createGain();
        g.gain.value = gain;
        s.connect(bp).connect(g).connect(bus);
        s.start(now);
      };

      audio = { ctx, bus, click };
      return audio;
    };

    const soundBtn = stage.querySelector<HTMLButtonElement>(".mx-sound");
    const setSound = (on: boolean) => {
      soundOn = on;
      soundBtn?.setAttribute("aria-pressed", String(on));
      if (!on) {
        audio?.bus.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.14);
        return;
      }
      const a = initAudio();
      if (!a) return;
      void a.ctx.resume();
      a.bus.gain.setTargetAtTime(0.22, a.ctx.currentTime, 0.4);
    };
    const onSoundClick = () => setSound(!soundOn);
    soundBtn?.addEventListener("click", onSoundClick);
    soundBtn?.removeAttribute("hidden");

    // ── frame ────────────────────────────────────────────────────────
    const tmp = new THREE.Vector3();
    const BUILD_DUR = 1.15;
    /** Longest delay plus one part's travel, so uilt reaches 1 exactly as the last part seats. */
    const BUILD_TOTAL = BUILD_DUR + 1.25;
    let painted = false;
    let buildStart = -1;
    let lastBuilt = -1;
    /** Which module last rang, so a click fires on the crossing and not per frame. */
    let lastStage = -1;
    /** Latch for the launch knock and the tray jolt, reset on scroll-back. */
    let launchRung = false;
    /** Last written state of the copy's pointer-events attribute. */
    let lastCopyGone = false;
    const focusPt = new THREE.Vector3();

    /** Wall-clock of the previous frame, for a real dt rather than an assumed one. */
    let tPrev = -1;

    const draw = (time: number, forcedY?: number, forcedBuild?: number) => {
      const y = forcedY ?? window.scrollY;
      const p = clamp01((y - trackTop) / trackSpan);

      // A real delta, clamped. Physics and every damped follower below read it,
      // and assuming 1/60 is how a 120 Hz panel ends up with a camera that
      // settles twice as fast as it was authored to.
      const dt = tPrev < 0 ? 1 / 60 : Math.min(0.05, Math.max(1 / 240, time - tPrev));
      tPrev = time;

      // The entire camera, in one call. Eleven channels, seven keyframes, and
      // the only thing this loop knows about any of it is the scroll fraction.
      score.progress(p);

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
      fogPass.setTime(time);
      // Density is the score's channel, gated by the build so the volume fills
      // in as the object arrives rather than sitting there waiting for it.
      fogPass.setDensity(cam.fog * (0.25 + built * 0.9));
      /**
       * 2.35, not v1's 0.94.
       *
       * The interior glow escaping through the machined pockets is reference
       * #2's whole signature, and it very nearly got lost in v2: raising the
       * environment to make the aluminium read as aluminium also raised the
       * panel faces the light was meant to be contrasting *against*, and the
       * scene grades at a lower exposure than v1 to keep the emissives in
       * check. Both moves were right and both pushed the same way. Emissives
       * are `toneMapped: false`, so nothing else on the object goes with this
       * number — it moves the light and only the light.
       */
      (backlight.material as THREE.MeshBasicMaterial).color.setScalar(
        built * (2.35 + 0.14 * Math.sin(time * 0.7)),
      );
      fillLight.intensity = 6.5 * built;

      // ── the object: drag orbits, and it settles back on release
      if (!dragging) yaw *= Math.pow(0.955, dt * 60);
      root.rotation.y = yaw + Math.sin(time * 0.11) * 0.012;

      // ── physics
      /**
       * Angular velocity and acceleration of the machine's own frame, handed to
       * the solver so the tray marbles feel the spin. Differentiating the yaw
       * twice is noisy by nature, so both are low-passed — an un-smoothed α from
       * a pointer stream spikes hard enough on a single fast sample to fire the
       * marbles straight through the tray wall.
       */
      const omega = (root.rotation.y - yawPrev) / dt;
      const omegaS = omegaPrev + (omega - omegaPrev) * 0.35;
      const alpha = (omegaS - omegaPrev) / dt;
      yawPrev = root.rotation.y;
      omegaPrev = omegaS;

      if (physics) {
        physics.setPrimary(marble.position.x, marble.position.y, marble.position.z, dt);
        // A settled pile that nobody is touching costs nothing: the solver is
        // skipped entirely rather than stepped to produce the same numbers.
        if (!physics.asleep || Math.abs(omegaS) > 0.02 || Math.abs(alpha) > 0.4) {
          physics.step(dt, omegaS, alpha);
          physics.readInto(loosePos);
          physics.readQuatInto(looseQuat);
          for (let i = 0; i < TRAY.count; i++) {
            instP.set(loosePos[i * 3], loosePos[i * 3 + 1], loosePos[i * 3 + 2]);
            instQ.set(
              looseQuat[i * 4],
              looseQuat[i * 4 + 1],
              looseQuat[i * 4 + 2],
              looseQuat[i * 4 + 3],
            );
            loose.setMatrixAt(i, instMtx.compose(instP, instQ, ONE));
          }
          loose.instanceMatrix.needsUpdate = true;
        }
      }

      // ── sound
      if (soundOn && audio) {
        // One click per module boundary the marble crosses, pitched down the
        // stack so the descent is audible as a descent. Scrolling backwards
        // fires them too, which is correct: it is the same contact.
        if (active !== lastStage) {
          lastStage = active;
          audio.click(0.4, 2600 - active * 300);
        }
        // The launch: a heavier, lower knock, once.
        if (launch > 0.5 && !launchRung) {
          launchRung = true;
          audio.click(0.85, 900);
          physics?.jolt(0.9);
        }
        if (launch < 0.4) launchRung = false;
      } else if (launch > 0.5 && !launchRung) {
        // The jolt is not conditional on audio — it is a physical event.
        launchRung = true;
        physics?.jolt(0.9);
      } else if (launch < 0.4) {
        launchRung = false;
      }

      // ── camera, post, and the frame
      mouseX += (mouseTX - mouseX) * Math.min(1, dt * 4.5);
      mouseY += (mouseTY - mouseY) * Math.min(1, dt * 4.5);
      applyCam(mouseX, mouseY);

      // The focus plane is a world height from the score, converted to a
      // distance from wherever the camera actually ended up this frame — which
      // is why an orbit does not pull focus.
      focusPt.set(cam.tx + txBias, cam.focusY, cam.tz);
      dof.target = focusPt;
      dof.bokehScale = cam.bokeh * built;
      /**
       * The focus range has to tighten as the camera closes in, and getting
       * this wrong is why the first pass had a depth-of-field pass that
       * provably ran and visibly did nothing.
       *
       * `worldFocusRange` is the depth either side of the focal plane that
       * stays sharp, in world units. It was left at its 2.4 default — and this
       * object is only about one unit deep. Every part of the machine sat
       * inside the sharp band at every keyframe, so the effect was correct,
       * expensive, and a no-op. A planar subject gives depth of field nothing
       * to bite on unless the band is narrower than the subject.
       *
       * Tying it to the inverse of bokeh means the wide establishing shot keeps
       * almost everything sharp and the close-ups drop the far rail and the
       * launch mast out — which is what a real lens does when it opens up.
       *
       * It lives on the circle-of-confusion material rather than on the effect;
       * the effect only accepts it as a constructor option.
       */
      dof.cocMaterial.worldFocusRange = Math.max(
        0.55,
        3.6 / Math.max(0.5, cam.bokeh),
      );
      bloom.intensity = cam.bloom * (0.35 + built * 0.75) + power * 0.32;
      chroma.offset.set(cam.ca, cam.ca * 0.6);
      // Exposure rises as the object materialises, so the build reads as the
      // scene being lit rather than as parts fading in. It is applied in the fog
      // composite, upstream of the bloom — `renderer.toneMappingExposure` does
      // nothing at all here, and the note in `volumetric-fog.ts` explains why.
      fogPass.setExposure(0.46 + built * 0.34);

      // The copy fades on the score's own channel, so the overlay and the camera
      // can never disagree about whether this is still the establishing shot.
      stage.style.setProperty("--mx-copy-out", cam.copyOut.toFixed(3));
      // `pointer-events` cannot be interpolated, so the attribute flips once at
      // the halfway point rather than the CSS deriving it from the same number.
      const copyGone = cam.copyOut > 0.5;
      if (copyGone !== lastCopyGone) {
        lastCopyGone = copyGone;
        if (copyGone) stage.dataset.mxCopy = "out";
        else delete stage.dataset.mxCopy;
      }

      composer.render(dt);

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
        trackGroup,
        plinth,
        head,
        mods,
        marble,
        trayGroup,
        loose,
        composer,
        fogPass,
        cam,
        score,
      };
      /** A scratch buffer for the probes below. Dev builds only. */
      const probeTarget = new THREE.WebGLRenderTarget(2, 2, {
        samples: 4,
        type: THREE.HalfFloatType,
        depthBuffer: true,
      });
      const sizeProbe = () => {
        const r = frame.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 1.75);
        probeTarget.setSize(
          Math.max(2, Math.round(r.width * d)),
          Math.max(2, Math.round(r.height * d)),
        );
      };
      // Reads the render target back. The difference between "the scene is
      // dark" and "the scene never reached the texture the post pass samples"
      // is not visible from outside, and it is the only question worth asking
      // when a direct render looks right and a composited one does not.
      (window as unknown as Record<string, unknown>).__mxProbe = () => {
        sizeProbe();
        renderer.setRenderTarget(probeTarget);
        renderer.clear();
        renderer.render(scene, camera);
        // Unbind first. With `samples > 0` the scene lands in a multisample
        // renderbuffer and is only blitted into `target.texture` when the
        // target is switched away from; reading before that returns the
        // unresolved buffer, which is what made the first probe lie.
        renderer.setRenderTarget(null);
        const w = probeTarget.width;
        const h = probeTarget.height;
        const buf = new Uint16Array(4);
        const read = (fx: number, fy: number) => {
          renderer.readRenderTargetPixels(
            probeTarget,
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
        sizeProbe();
        renderer.setRenderTarget(probeTarget);
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
      delete stage.dataset.mxCopy;
      stage.style.removeProperty("--mx-built");
      stage.style.removeProperty("--mx-copy-out");

      soundBtn?.removeEventListener("click", onSoundClick);
      soundBtn?.setAttribute("hidden", "");
      // An AudioContext survives its React tree by design; StrictMode's double
      // mount would otherwise leave a second one running an oscillator forever.
      void audio?.ctx.close();
      audio = null;

      if (finePointer) {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      }

      score.kill();
      physics?.dispose();
      composer.dispose();
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










