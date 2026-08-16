"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  buildStack,
  PLATE_T,
  POSE_ZOOM,
  SLAB_D,
  SLAB_W,
  stackBounds,
  STROKE_CLASSES,
  type StrokeClass,
} from "./exploded-stack";

/**
 * The Exploded Stack — WebGL layer.
 *
 * three.js with no React Three Fiber, no Drei and no `postprocessing`. The
 * scene is mounted once and driven by scroll, which is the exact case where
 * R3F's JSX ergonomics buy nothing and cost 85 kB gzipped; the post pass is
 * forty lines of GLSL instead of an 84 kB import. Everything it draws comes
 * from `exploded-stack.ts`, the same module the server used to write the SVG
 * sitting underneath this canvas.
 *
 * The narrative, in one axis of motion:
 *
 *   rest      five layers held apart, faces transparent, hairline linework —
 *             a wireframe assembly drawing, and the frame every client sees
 *   exploded   each layer clears the others and takes its label
 *   seated     flush, opaque, lit from the upper left — one solid object
 *
 * Which is the argument the copy makes at `app/v2/page.tsx:70`: it comes
 * apart, you can see every layer, it goes back together, one piece.
 *
 * Degradation is handled by the parent (`ExplodedStack.tsx`) — this module is
 * never imported at all under reduced motion, Save-Data, low device memory, a
 * narrow viewport, or missing WebGL 2, so three.js stays out of those bundles
 * entirely rather than loading and declining to run.
 */

// ── palette, matched to direction-a.css ─────────────────────────────────
const GROUND = new THREE.Color("#08090a");
const INK = new THREE.Color("#f7f8f8");
const ACCENT = new THREE.Color("#8b95ea");
/**
 * Face colours. Near the ground but not equal to it, so the object reads as a
 * near-black solid rather than as line art floating on black — and far enough
 * apart that a lit top face is unmistakably a surface. The first pass sat at
 * #2b3242 and read as a black hole with white edges: the seated state is where
 * the material has to do all the work, and there is nothing else in frame to
 * carry it.
 */
const FACE_DARK = new THREE.Color("#141821");
const FACE_LIT = new THREE.Color("#454f68");

/**
 * Per-class line weight, calibrated against the SVG rather than copied from it.
 *
 * A native WebGL line is one device pixel wide — 0.5 CSS px at DPR 2 — and
 * `gl.lineWidth` above 1 is a no-op on every platform that matters. The SVG's
 * strokes are 0.6–1.0 CSS px. So the ink a class puts down is
 * `width × opacity`, and matching the drawing means roughly doubling the
 * alphas, not reusing them. Getting this wrong is what made the first canvas
 * frame read fainter than the fallback it was supposed to improve on.
 */
const CLASS_ALPHA: Record<StrokeClass, number> = {
  edge: 1,
  detail: 0.62,
  accent: 0.95,
  construction: 0.3,
  grid: 0.2,
};

/**
 * How much each class survives the resolve. Construction work and the ground
 * grid drop back as the object becomes material — the drawing stays faintly
 * overlaid on the artifact rather than vanishing, which is the move igloo.inc
 * makes and the reason its scroll state still reads as engineered.
 */
const CLASS_RESOLVE_FADE: Record<StrokeClass, number> = {
  edge: 1.15,
  detail: 0.75,
  accent: 1,
  construction: 0.22,
  grid: 0.12,
};

// ── shared GLSL ─────────────────────────────────────────────────────────

/** Radial falloff so the ground grid dissolves instead of ending (Rule 3). */
const FADE_CHUNK = /* glsl */ `
  float radialFade(vec2 ndc) {
    return 1.0 - smoothstep(0.35, 1.05, length(ndc * vec2(0.82, 1.0)));
  }
`;

const LINE_VERT = /* glsl */ `
  varying vec2 vNdc;
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec4 clip = projectionMatrix * mv;
    vNdc = clip.xy / clip.w;
    vDepth = -mv.z;
    gl_Position = clip;
  }
`;

const LINE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uAlpha;
  uniform float uFadeEdges;
  uniform float uDepthDim;
  uniform float uDepthMid;
  varying vec2 vNdc;
  varying float vDepth;
  ${FADE_CHUNK}
  void main() {
    float a = uAlpha;
    a *= mix(1.0, radialFade(vNdc), uFadeEdges);
    // Aerial perspective: the far corner of an isometric drawing sits back.
    // Cheap, and it is most of what stops a line drawing reading as flat.
    a *= mix(1.0, 1.0 - clamp((vDepth - uDepthMid) * uDepthDim, -0.35, 0.45), 1.0);
    if (a <= 0.002) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

const PLATE_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vNdc;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vNdc = clip.xy / clip.w;
    gl_Position = clip;
  }
`;

/**
 * Faces, and the schematic→material transition.
 *
 * The transition is an ordered 4×4 Bayer dither rather than a blended alpha,
 * for one structural reason: a transparent surface that writes depth still
 * occludes the lines behind it, so a fading fill would hide the wireframe long
 * before it looked solid. Discarding by threshold means depth is written
 * exactly where the surface has actually materialised — hidden-line removal
 * arrives at the same rate as the material does, with no sorting, no second
 * pass, and no pop at a threshold.
 */
const PLATE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uDark;
  uniform vec3  uLit;
  uniform vec3  uLightDir;
  uniform float uResolve;
  uniform float uHighlight;
  varying vec3 vNormal;
  varying vec2 vNdc;
  ${FADE_CHUNK}

  float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    // Canonical 4×4 ordered dither, unrolled — no array indexing by a
    // non-constant, which some drivers still refuse to compile.
    float t = 0.0;
    if (i ==  0) t =  0.0; else if (i ==  1) t =  8.0; else if (i ==  2) t =  2.0;
    else if (i ==  3) t = 10.0; else if (i ==  4) t = 12.0; else if (i ==  5) t =  4.0;
    else if (i ==  6) t = 14.0; else if (i ==  7) t =  6.0; else if (i ==  8) t =  3.0;
    else if (i ==  9) t = 11.0; else if (i == 10) t =  1.0; else if (i == 11) t =  9.0;
    else if (i == 12) t = 15.0; else if (i == 13) t =  7.0; else if (i == 14) t = 13.0;
    else t = 5.0;
    return (t + 0.5) / 16.0;
  }

  void main() {
    // Cover is the resolve alone. Folding the radial falloff in here left the
    // frame's outer regions permanently dithered — visible speckle across the
    // top face at full resolve. Softening the object's edge is the CSS mask's
    // job, and it does it without punching holes in the material.
    if (bayer4(gl_FragCoord.xy) >= uResolve) discard;

    vec3 N = normalize(vNormal);
    float lambert = max(dot(N, normalize(uLightDir)), 0.0);
    // One directional light from the upper left plus a low ambient. No second
    // light: two lights on a near-black object is where "engineered" turns
    // into "rendered".
    vec3 col = mix(uDark, uLit, 0.18 + 0.82 * lambert);
    // Rim, so the silhouette keeps the hairline it had as a drawing.
    float rim = pow(1.0 - abs(N.z), 3.0);
    col += uLit * rim * 0.22;
    col += uLit * uHighlight * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * The post pass: a bright-pass bloom, a vignette and film grain, in one
 * fullscreen fragment shader. The `postprocessing` library does this for
 * 83.9 kB gzipped; this is the part of it the scene actually uses.
 */
const POST_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform vec2  uTexel;
  uniform float uTime;
  uniform float uBloom;
  uniform float uRadius;
  uniform float uGrain;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(tScene, vUv);

    // Twelve taps on a golden-angle spiral. A spiral rather than a ring
    // because a ring at this tap count bands visibly on straight hairlines,
    // which is the only kind of edge this scene has.
    vec3 glow = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float f = (float(i) + 0.5) / 12.0;
      float ang = float(i) * 2.39996323;
      vec2 off = vec2(cos(ang), sin(ang)) * sqrt(f) * uRadius;
      vec4 s = texture2D(tScene, vUv + off * uTexel);
      glow += max(s.rgb - 0.26, 0.0);
    }
    glow *= uBloom / 12.0;

    vec3 col = base.rgb + glow;
    float alpha = base.a + dot(glow, vec3(0.333));

    // Light: the canvas already carries a radial mask in CSS and the grid
    // fades in its own shader. Three stacked falloffs ate the construction
    // field entirely on the first pass.
    vec2 q = vUv - 0.5;
    float vig = 1.0 - dot(q, q) * 0.45;
    col *= vig;
    alpha *= vig;

    // Grain last, on both channels, so it does not read as a layer sitting
    // over the object.
    float n = fract(sin(dot(vUv * 2048.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    float g = (n - 0.5) * uGrain;
    col += g;
    alpha = clamp(alpha + g * 0.5, 0.0, 1.0);

    gl_FragColor = vec4(max(col, 0.0), alpha);

    // The only colour-space conversion in the pipeline, and it belongs here.
    // three converts every THREE.Color from sRGB into the linear working
    // space, but a raw ShaderMaterial gets no output encoding unless it asks
    // for one — so without this the scene's linear values are handed to the
    // canvas as though they were already sRGB, and every surface renders far
    // darker than it was authored. The render target stays linear so the
    // bloom sums light rather than gamma.
    #include <colorspace_fragment>
  }
`;

// ── easing, shared with the page's one CSS curve ────────────────────────
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** The JS reading of cubic-bezier(0.32, 0.72, 0, 1) — one curve for the site. */
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3.2);
/** Normalised position of `v` within [a, b]. */
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a || 1));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The scroll score. Four movements over the hero's own track: hold the
 * drawing, come apart, hold apart, seat and resolve.
 */
function score(p: number) {
  return {
    separate: ease(ramp(p, 0.08, 0.44)) * (1 - ease(ramp(p, 0.62, 0.92))),
    resolve: ease(ramp(p, 0.66, 0.95)),
    // Callouts are part of the drawing, so they are on from the first frame —
    // matching what a client with no canvas sees — and they leave as the
    // object stops being a drawing and becomes a material thing.
    labels: 1 - ease(ramp(p, 0.62, 0.86)),
  };
}

export default function ExplodedStackGL() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const frame = host?.parentElement;
    const stage = frame?.parentElement;
    if (!host || !frame || !stage) return;

    // The canvas is created here rather than rendered by React, and it is not
    // a style preference. Teardown ends in `forceContextLoss()`, which
    // permanently poisons the element it ran on — a canvas whose context has
    // been force-lost can never be given another. React reuses the same DOM
    // node across StrictMode's mount → unmount → mount, so a JSX canvas comes
    // back dead on the second mount and the hero silently stays an SVG in
    // development. Owning the element means every effect run gets a virgin one.
    const canvas = document.createElement("canvas");
    canvas.className = "xs-canvas";
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
    renderer.setClearColor(GROUND, 0);

    // ── scene ────────────────────────────────────────────────────────
    const stack = buildStack();
    const b = stackBounds(stack, ["rest", "exploded"]);
    const Z_REST = POSE_ZOOM.rest;
    const Z_SEAT = POSE_ZOOM.seated;
    const scene = new THREE.Scene();

    // True isometric: an orthographic camera on the (1,1,1) diagonal with
    // world +Y up. Identical to `projectIso`, which is why the SVG underneath
    // and this canvas land on the same pixels.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 40);
    camera.position.set(12, 12, 12);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    scene.add(root);

    const disposables: { dispose(): void }[] = [];

    const lineMaterial = (cls: StrokeClass, fadeEdges: boolean) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: cls === "accent" ? ACCENT.clone() : INK.clone() },
          uAlpha: { value: CLASS_ALPHA[cls] },
          uFadeEdges: { value: fadeEdges ? 1 : 0 },
          uDepthDim: { value: 0.07 },
          uDepthMid: { value: 20.8 },
        },
      });
      disposables.push(m);
      return m;
    };

    const lines = (segs: number[], m: THREE.ShaderMaterial) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
      disposables.push(g);
      return new THREE.LineSegments(g, m);
    };

    // World furniture: the ground grid and the dimension work. Never lifts.
    const worldMats: Partial<Record<StrokeClass, THREE.ShaderMaterial>> = {};
    for (const cls of STROKE_CLASSES) {
      const segs = stack.world[cls];
      if (!segs.length) continue;
      const m = lineMaterial(cls, true);
      worldMats[cls] = m;
      root.add(lines(segs, m));
    }

    // Plates.
    const plateBox = new THREE.BoxGeometry(SLAB_W, PLATE_T, SLAB_D);
    // Origin at the underside, so a plate's height is its `y` and nothing has
    // to compensate for half a thickness anywhere else.
    plateBox.translate(0, PLATE_T / 2, 0);
    disposables.push(plateBox);

    const plates = stack.plates.map((p) => {
      const group = new THREE.Group();
      group.position.y = p.restY;
      root.add(group);

      const faceMat = new THREE.ShaderMaterial({
        vertexShader: PLATE_VERT,
        fragmentShader: PLATE_FRAG,
        // Faces are pushed back so the edge lines sitting on them stay crisp
        // instead of fighting for the same depth.
        polygonOffset: true,
        polygonOffsetFactor: 1.6,
        polygonOffsetUnits: 1.6,
        uniforms: {
          uDark: { value: FACE_DARK.clone() },
          uLit: { value: FACE_LIT.clone() },
          uLightDir: { value: new THREE.Vector3(-0.55, 0.78, 0.31).normalize() },
          uResolve: { value: 0 },
          uHighlight: { value: 0 },
        },
      });
      disposables.push(faceMat);
      group.add(new THREE.Mesh(plateBox, faceMat));

      const mats: Partial<Record<StrokeClass, THREE.ShaderMaterial>> = {};
      for (const cls of STROKE_CLASSES) {
        const segs = p.segments[cls];
        if (!segs.length) continue;
        const m = lineMaterial(cls, false);
        mats[cls] = m;
        group.add(lines(segs, m));
      }

      return { meta: p, group, faceMat, mats, hover: 0 };
    });

    // ── post pass ────────────────────────────────────────────────────
    const target = new THREE.WebGLRenderTarget(2, 2, {
      samples: 4,
      type: THREE.HalfFloatType,
    });
    disposables.push(target);

    const postMat = new THREE.ShaderMaterial({
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
        uBloom: { value: 1.15 },
        uRadius: { value: 5.5 },
        uGrain: { value: 0.026 },
      },
    });
    disposables.push(postMat);
    const postGeo = new THREE.PlaneGeometry(2, 2);
    disposables.push(postGeo);
    const postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(postGeo, postMat));
    const postCam = new THREE.Camera();

    // ── measurement, on resize only ──────────────────────────────────
    // The single per-frame read is `window.scrollY`, which does not force
    // layout. Everything else here is cached until the box changes.
    const labelEls = Array.from(
      stage.querySelectorAll<HTMLElement>(".xs-label"),
    );
    let w = 0;
    let h = 0;
    let dpr = 1;
    let trackTop = 0;
    let trackSpan = 1;
    let baseHalfW = 1;
    let baseHalfH = 1;
    let camX = 0;
    let camY = 0;

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      target.setSize(Math.round(w * dpr), Math.round(h * dpr));
      postMat.uniforms.uTexel.value.set(1 / (w * dpr), 1 / (h * dpr));

      // Fit the drawing's full extent — bounded over the exploded pose too —
      // so the frame never has to grow and the object never appears to shrink.
      // The per-frame zoom is applied on top of this, in `draw`.
      const boxAspect = b.width / b.height;
      const viewAspect = w / h;
      baseHalfW = b.width / 2;
      baseHalfH = b.height / 2;
      if (viewAspect > boxAspect) baseHalfW = baseHalfH * viewAspect;
      else baseHalfH = baseHalfW / viewAspect;
      camX = (b.minX + b.maxX) / 2;
      // projectIso negates y, so the camera's up is the drawing's -y.
      camY = -(b.minY + b.maxY) / 2;

      const track = document.getElementById("da-hero");
      if (track) {
        const r = track.getBoundingClientRect();
        trackTop = r.top + window.scrollY;
        // The sticky stage stops moving once the track's tail passes, so the
        // usable scroll distance is the track minus one viewport.
        trackSpan = Math.max(1, r.height - window.innerHeight);
      }
    };

    // ── pointer: Rule 4 ──────────────────────────────────────────────
    // Fine pointers only. On touch this would compete with the page scroll,
    // and a hero that eats a swipe is a hero that traps scroll.
    let dragging = false;
    let dragId = -1;
    let lastX = 0;
    let lastY = 0;
    let yaw = 0;
    let pitch = 0;
    let ndcX = 99;
    let ndcY = 99;

    const onDown = (e: PointerEvent) => {
      if (!finePointer || e.button !== 0) return;
      dragging = true;
      dragId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      stage.dataset.xsGrab = "on";
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (!dragging || e.pointerId !== dragId) return;
      yaw += (e.clientX - lastX) * 0.0045;
      pitch += (e.clientY - lastY) * 0.003;
      pitch = Math.max(-0.34, Math.min(0.34, pitch));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      dragging = false;
      dragId = -1;
      delete stage.dataset.xsGrab;
    };
    const onLeave = () => {
      ndcX = 99;
      ndcY = 99;
    };

    if (finePointer) {
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerleave", onLeave, { passive: true });
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
    }

    // ── frame ────────────────────────────────────────────────────────
    const tmp = new THREE.Vector3();
    let painted = false;

    const draw = (time: number, forcedY?: number) => {
      const y = forcedY ?? window.scrollY;
      const p = clamp01((y - trackTop) / trackSpan);
      const s = score(p);

      // Borrow the exploded pose's headroom while the stack is not using it,
      // give it back as the stack separates into it, and take more of it once
      // the object collapses to a slab — otherwise the arrival reads as the
      // object shrinking away rather than as it becoming one thing.
      const zoom = lerp(lerp(Z_REST, 1, s.separate), Z_SEAT, s.resolve);
      camera.left = camX - baseHalfW / zoom;
      camera.right = camX + baseHalfW / zoom;
      camera.top = camY + baseHalfH / zoom;
      camera.bottom = camY - baseHalfH / zoom;
      camera.updateProjectionMatrix();

      // Idle: about four degrees over eight seconds and back. A breath, not a
      // turntable — and it yields to the pointer rather than fighting it.
      const settle = dragging ? 0 : 1;
      if (!dragging) {
        yaw *= 0.94;
        pitch *= 0.94;
      }
      root.rotation.y = yaw + Math.sin(time * 0.785) * 0.07 * settle;
      root.rotation.x = pitch;

      // Hover: lift the nearest plate and brighten its edge. Projecting five
      // centres is cheaper and steadier than a raycast, and it cannot pick a
      // plate the pointer is not actually over.
      let nearest = -1;
      let nearestD = 0.34;
      if (finePointer && ndcX < 9) {
        plates.forEach((pl, i) => {
          tmp.set(0, PLATE_T / 2, 0);
          pl.group.localToWorld(tmp);
          tmp.project(camera);
          const d = Math.hypot(tmp.x - ndcX, tmp.y - ndcY);
          if (d < nearestD) {
            nearestD = d;
            nearest = i;
          }
        });
      }

      for (let i = 0; i < plates.length; i++) {
        const pl = plates[i];
        const m = pl.meta;
        // Rest → exploded → seated, on one axis, through one curve.
        const spread = lerp(m.restY, m.explodedY, s.separate);
        const base = lerp(spread, m.seatedY, s.resolve);
        pl.hover += ((i === nearest ? 1 : 0) - pl.hover) * 0.18;
        // The lift is suppressed as the object seats: once it is one solid
        // piece, pulling a layer out of it would argue the opposite thing.
        pl.group.position.y = base + pl.hover * 0.055 * (1 - s.resolve);

        pl.faceMat.uniforms.uResolve.value = s.resolve;
        pl.faceMat.uniforms.uHighlight.value = pl.hover * (1 - s.resolve) * 0.5;

        for (const cls of STROKE_CLASSES) {
          const mat = pl.mats[cls];
          if (!mat) continue;
          let a = CLASS_ALPHA[cls] * lerp(1, CLASS_RESOLVE_FADE[cls], s.resolve);
          // A layer's own contents come up as it clears the others, so the
          // rest pose reads as one focal face over four ghosted ones.
          if (cls === "detail" || cls === "accent" || cls === "construction") {
            const focus = i === plates.length - 1 ? 1 : 0.32;
            a *= lerp(focus, 1, s.separate);
          }
          if (cls === "edge") a *= 1 + pl.hover * 0.5;
          mat.uniforms.uAlpha.value = a;
        }
      }

      for (const cls of STROKE_CLASSES) {
        const mat = worldMats[cls];
        if (!mat) continue;
        mat.uniforms.uAlpha.value =
          CLASS_ALPHA[cls] * lerp(1, CLASS_RESOLVE_FADE[cls], s.resolve);
      }

      // Labels ride their plates. Percentages of the stage box, written as the
      // same custom properties the server set, so the two modes agree and no
      // layout is read or written per frame.
      for (let i = 0; i < labelEls.length; i++) {
        const el = labelEls[i];
        const pl = plates[i];
        if (!pl) continue;
        tmp.set(SLAB_W / 2 + 0.16, PLATE_T / 2, -SLAB_D / 2);
        pl.group.localToWorld(tmp);
        tmp.project(camera);
        // Only the vertical: the callout column is pinned to the stage's right
        // edge, so horizontal position is a layout decision, not a projection.
        el.style.setProperty("--xs-ly", String(((1 - tmp.y) / 2) * 100));
        el.style.setProperty("--xs-ldy", "0");
        el.style.setProperty("--xs-on", String(clamp01(s.labels * 1.25 - i * 0.05)));
      }

      postMat.uniforms.uTime.value = time;
      postMat.uniforms.uRadius.value = 4.2 + s.resolve * 2.6;
      postMat.uniforms.uBloom.value = 0.85 + s.resolve * 0.7;

      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(postScene, postCam);

      // The SVG stays visible until a frame has actually reached the canvas.
      // If the loop never runs — throttled tab, lost context, a driver that
      // gives up — the page keeps the drawing rather than an empty column.
      if (!painted) {
        painted = true;
        stage.dataset.xsMode = "canvas";
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
    const track = document.getElementById("da-hero");
    if (track) io.observe(track);
    else startLoop();

    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener("visibilitychange", onVisibility);

    // A reduced-motion preference set mid-session takes effect immediately:
    // the loop stops and the drawing comes back.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReduced = () => {
      if (!reduced.matches) return;
      stopLoop();
      painted = false;
      delete stage.dataset.xsMode;
    };
    reduced.addEventListener("change", onReduced);

    // Dev-only single-frame hook. It is the only reason this work is
    // verifiable: a headless browser can force a frame at a chosen scroll
    // position without waiting on requestAnimationFrame.
    if (DEV) {
      (window as unknown as Record<string, unknown>).__xsDraw = (
        scrollY?: number,
        t = 3,
      ) => {
        measure();
        draw(t, scrollY);
        return { trackTop, trackSpan, p: clamp01(((scrollY ?? window.scrollY) - trackTop) / trackSpan) };
      };
    }

    startLoop();

    return () => {
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReduced);
      if (finePointer) {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      }
      delete stage.dataset.xsMode;
      delete stage.dataset.xsGrab;
      for (const el of labelEls) {
        el.style.removeProperty("--xs-on");
      }
      if (DEV) delete (window as unknown as Record<string, unknown>).__xsDraw;
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  // `display: contents`, so the canvas the effect appends is laid out by the
  // stage exactly as if it were a direct child.
  return <div ref={hostRef} className="xs-gl-host" />;
}
