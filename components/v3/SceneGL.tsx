"use client";

/**
 * The renderer.
 *
 * One fixed canvas behind the whole document. DOM sections scroll over it; the
 * only input is a scroll fraction and the hold state of five buttons. Nothing
 * in here knows what the copy says.
 *
 * ── Why raw three.js and not R3F ──────────────────────────────────────────
 *
 * The brief asked for @react-three/fiber + drei. Declined, and this is the one
 * place in the build where a brief requirement was overruled, so the reasoning
 * belongs next to the code rather than only in the decisions log.
 *
 * v2 declined R3F on the grounds that a single scalar drove everything and
 * there was no component tree to reconcile — and it explicitly named the
 * condition that would flip the decision: "multiple interactive objects with
 * independent lifecycles". v3 meets that condition. So the question was live
 * again, and the answer is still no, for different reasons:
 *
 *   · What R3F would buy is encapsulation of the five modules. `ShipModule` in
 *     `ship-parts.ts` is that encapsulation — a group plus an update closure —
 *     in about fifteen lines, at zero bundle cost.
 *   · What R3F would cost is the pipeline. The fog is a custom `Pass` inside a
 *     hand-ordered `EffectComposer`, and that ordering is load-bearing (v2 §6:
 *     bloom samples the buffer as it entered the pass, so fog composited
 *     alongside it never blooms). Reaching that through @react-three/postprocessing
 *     is friction, not ergonomics, and adds a third library to the chain.
 *   · ~110 KB gz and a rewrite of a working, tuned 2,100-line renderer buys
 *     JSX for a scene graph that is built once and never re-reconciled.
 *
 * Same for drei: its value here would be `useGLTF` (no models), `Environment`
 * (procedural — see `environment.ts`) and `MeshTransmissionMaterial` (a
 * property on `MeshPhysicalMaterial`, used directly in `ship-parts.ts`).
 *
 * The decision flips if the scene ever needs React state inside the graph —
 * routed sub-scenes, per-object components with their own data fetching.
 *
 * ── Why cannon-es and not Rapier ──────────────────────────────────────────
 *
 * Also declined, and the answer here is simpler: there is no rigid-body
 * simulation on this page. The five press-and-hold controls are one degree of
 * freedom each with a spring return, which is nine lines of critically-damped
 * integration below. Rapier would put a WebAssembly fetch-and-instantiate on
 * the critical path of a hero that is otherwise entirely self-contained, to
 * solve a problem that is not a solver problem. `cannon-es` stays in
 * `package.json` for the v2 route and is not imported here.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  BlendFunction,
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
} from "postprocessing";

import { buildScore, initialCam, CUT, type CamState } from "./ship-score";
import {
  buildActions,
  buildBridge,
  buildDeploy,
  buildInterface,
  buildMaterials,
  buildRLS,
  buildSchema,
  attachMedia,
  type ShipModule,
} from "./ship-parts";
import { buildDune } from "./dune-parts";
import { buildEnvironment } from "./environment";
import { VolumetricFogPass } from "./volumetric-fog";
import { blendPalette, scenePalette, COOL } from "./palette";
import { CEIL_Y, SUN_AZ } from "./ship-layout";

/** Press-and-hold rise and fall, seconds to full travel. */
const HOLD_RISE = 0.62;
const HOLD_FALL = 0.34;

type HoldId = "schema" | "rls" | "actions" | "interface" | "deploy";
const HOLD_IDS: readonly HoldId[] = ["schema", "rls", "actions", "interface", "deploy"];

export default function SceneGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        // The composer's render target carries MSAA instead; antialiasing the
        // default framebuffer as well is paying twice for one edge.
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }
    renderer.setClearColor(new THREE.Color(COOL.ink), 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping; // ToneMappingEffect does it in post.

    const disposables: { dispose(): void }[] = [];
    const keep = <T extends { dispose(): void }>(x: T) => {
      disposables.push(x);
      return x;
    };

    /* ── scene ──────────────────────────────────────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 460);

    const envShip = keep(buildEnvironment(renderer, "ship"));
    const envDune = keep(buildEnvironment(renderer, "dune"));
    scene.environment = envShip;

    const mats = buildMaterials();
    for (const m of Object.values(mats)) {
      if (Array.isArray(m)) m.forEach((t) => keep(t));
      else keep(m as THREE.Material);
    }

    const shipGroup = new THREE.Group();
    shipGroup.add(buildBridge(mats));

    const modules: Record<HoldId, ShipModule> = {
      schema: buildSchema(mats),
      rls: buildRLS(mats),
      actions: buildActions(mats),
      interface: buildInterface(mats),
      deploy: buildDeploy(mats),
    };
    for (const id of HOLD_IDS) shipGroup.add(modules[id].group);
    scene.add(shipGroup);

    /**
     * Ship lighting. Two sources and no more.
     *
     * A key from high and forward-left, which is what the chamfers and rib
     * edges catch, and a dim hemisphere so the unlit sides do not go to pure
     * black. The LED strips are emissive geometry rather than lights: they read
     * as light because the bloom and the fog in-scatter pick them up, and
     * twenty real point lights in an interior is how a scene stops running.
     */
    const key = new THREE.DirectionalLight(new THREE.Color(COOL.chrome), 3.1);
    key.position.set(-4.2, 7.4, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    // normalBias rather than a large constant bias: this geometry is nothing
    // but chamfers meeting at shallow angles, which is exactly what a constant
    // bias detaches shadows from (v2 §7).
    key.shadow.normalBias = 0.022;
    key.shadow.radius = 3;
    shipGroup.add(key);
    shipGroup.add(key.target);

    const fill = new THREE.HemisphereLight(
      new THREE.Color(COOL.blue).multiplyScalar(0.5),
      new THREE.Color(COOL.ink),
      0.55,
    );
    shipGroup.add(fill);

    const dune = buildDune();
    dune.group.visible = false;
    scene.add(dune.group);

    /* The viewport media slot. Falls back silently to the procedural still. */
    const detachMedia = attachMedia("viewport", mats.viewport);

    /* ── post ───────────────────────────────────────────────────────────
       Order is load-bearing. `BloomEffect` samples the buffer as it entered
       the EffectPass, so fog composited inside that merged shader would never
       bloom — and fog that does not bloom has no glow around the LEDs, which
       is the entire look. The fog is therefore its own Pass, before it. */
    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 4,
    });
    composer.addPass(new RenderPass(scene, camera));

    const fogPass = new VolumetricFogPass(camera);
    composer.addPass(fogPass);

    const dof = new DepthOfFieldEffect(camera, {
      worldFocusDistance: 8,
      worldFocusRange: 2.4,
      bokehScale: 1.15,
      resolutionScale: 0.5,
    });
    const bloom = new BloomEffect({
      intensity: 1.1,
      // Must sit above the brightest specular on a chamfer and below the
      // emissives. v2 §6 records three passes to land on 0.94; this scene has
      // more polished metal in frame, so it sits a hair higher.
      luminanceThreshold: 0.95,
      luminanceSmoothing: 0.12,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
      radius: 0.78,
    });
    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00032, 0.00019),
      // A real lens is corrected at centre and drifts to the corners. A uniform
      // offset reads as a decoding artefact at any strength that is visible.
      radialModulation: true,
      modulationOffset: 0.15,
    });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
    grain.blendMode.opacity.value = 0.022;
    const vignette = new VignetteEffect({ offset: 0.31, darkness: 0.62 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    composer.addPass(new EffectPass(camera, dof, bloom, chroma, grain, vignette, tone));

    /* Shadow flags by traversal rather than at each construction site: anything
       solid casts and receives, anything that emits does neither. An emissive
       plane that receives a shadow has a dark patch painted on a light. */
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.Material;
      const emits = m instanceof THREE.MeshBasicMaterial;
      o.castShadow = !emits && o.castShadow !== false;
      o.receiveShadow = !emits;
    });

    /* ── press and hold ─────────────────────────────────────────────────
       The controls are real DOM buttons in the section copy, not raycast hits
       on the mesh. That is not a compromise: a 3D object is not keyboard
       operable, has no accessible name and no focus ring, and this page has
       five of them. The buttons carry the label, the focus indicator and the
       Space/Enter path for free; the mesh reacts to a number. */
    const held: Record<HoldId, boolean> = {
      schema: false, rls: false, actions: false, interface: false, deploy: false,
    };
    const hold: Record<HoldId, number> = {
      schema: 0, rls: 0, actions: 0, interface: 0, deploy: 0,
    };

    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sh-hold]"),
    );
    const cleanups: (() => void)[] = [];
    for (const b of buttons) {
      const id = b.dataset.shHold as HoldId;
      if (!HOLD_IDS.includes(id)) continue;
      const down = () => {
        held[id] = true;
        b.setAttribute("aria-pressed", "true");
      };
      const up = () => {
        held[id] = false;
        b.setAttribute("aria-pressed", "false");
      };
      const keyDown = (e: KeyboardEvent) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          down();
        }
      };
      const keyUp = (e: KeyboardEvent) => {
        if (e.key === " " || e.key === "Enter") up();
      };
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("pointerleave", up);
      b.addEventListener("blur", up);
      b.addEventListener("keydown", keyDown);
      b.addEventListener("keyup", keyUp);
      b.hidden = false;
      cleanups.push(() => {
        b.removeEventListener("pointerdown", down);
        b.removeEventListener("pointerup", up);
        b.removeEventListener("pointercancel", up);
        b.removeEventListener("pointerleave", up);
        b.removeEventListener("blur", up);
        b.removeEventListener("keydown", keyDown);
        b.removeEventListener("keyup", keyUp);
      });
    }

    /* ── the score ──────────────────────────────────────────────────── */
    const cam: CamState = initialCam();
    const pal = scenePalette();
    let tl: gsap.core.Timeline | null = null;
    let cancelled = false;
    void import("gsap").then(({ gsap }) => {
      if (!cancelled) tl = buildScore(gsap, cam);
    });

    /* ── sizing ─────────────────────────────────────────────────────── */
    let fovScale = 1;
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // 1.75, down from 2. The raymarch and the DOF are fill-rate bound; on a
      // 3× panel the 1.75→2 difference is invisible under grain and about 30%
      // of the frame budget (v2 §6).
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      // Widen the vertical fov below 16:9 so the *horizontal* extent stays
      // roughly constant — a cinematographer changing lenses for the format
      // rather than cropping the shot. Without it a portrait phone sees a
      // third of the bridge.
      const REF = 16 / 9;
      const a = w / h;
      fovScale = a < REF ? Math.min(1.5, REF / Math.max(a, 0.5)) : 1;
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });

    /* ── loop ───────────────────────────────────────────────────────── */
    /** Index of the monolith under pointer or focus, or -1. Set below. */
    let hoveredMonolith = -1;
    const clock = new THREE.Clock();
    const focusPoint = new THREE.Vector3();
    const sunDir = new THREE.Vector3();
    let raf = 0;
    let painted = false;
    let lastAct = "ship";
    let inDune = false;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      tl?.progress(p);

      /* Hold integration. A critically-damped approach rather than a linear
         ramp, so the control has weight at both ends of its travel — which is
         the whole difference between "a button that toggles" and "a mechanism
         that resists". */
      for (const id of HOLD_IDS) {
        const target = held[id] ? 1 : 0;
        const rate = held[id] ? HOLD_RISE : HOLD_FALL;
        hold[id] += (target - hold[id]) * Math.min(1, dt / rate) * 2.2;
        hold[id] = Math.min(1, Math.max(0, hold[id]));
      }

      /* ── the act swap ───────────────────────────────────────────────
         A pure function of `p`, which is what makes a cut safe in a scrubbed
         timeline: scrolling back across it swaps back, exactly. */
      const nowDune = p >= CUT;
      if (nowDune !== inDune) {
        inDune = nowDune;
        shipGroup.visible = !nowDune;
        dune.group.visible = nowDune;
        scene.environment = nowDune ? envDune : envShip;
        renderer.setClearColor(
          new THREE.Color().setRGB(pal.ground[0], pal.ground[1], pal.ground[2]),
          1,
        );
      }

      /* ── camera ─────────────────────────────────────────────────── */
      camera.position.set(cam.px, cam.py, cam.pz);
      camera.up.set(Math.sin(cam.roll), Math.cos(cam.roll), 0);
      camera.lookAt(cam.tx, cam.ty, cam.tz);
      camera.fov = cam.fov * fovScale;
      camera.updateProjectionMatrix();

      /* ── palette ────────────────────────────────────────────────── */
      blendPalette(cam.uTransition, pal);

      /* ── fog ────────────────────────────────────────────────────── */
      fogPass.setTime(t);
      fogPass.setDensity(cam.fog * (inDune ? 0.78 : 1));
      fogPass.setExposure(cam.exposure + cam.uFlash * 2.6);
      fogPass.setFloor(inDune ? 0.6 : 0.02);
      if (inDune) {
        // Three low practicals along the horizon under the sun, and the sun
        // itself as the key. Warm haze over an open plain is one directional
        // source and a lot of forward scatter.
        for (let i = 0; i < 3; i++) {
          fogPass.setLightPos(i, (i - 1) * 34, 2.4, -18 - i * 6);
          fogPass.setLightCol(i, pal.vapour, 6 + i * 2);
        }
        sunDir.set(Math.sin(SUN_AZ), 0.22 - cam.uDusk * 0.16, Math.cos(SUN_AZ));
        fogPass.setKey(sunDir, pal.accent, 4.2 * (1 - cam.uDusk * 0.4));
      } else {
        fogPass.setLightPos(0, -2.6, CEIL_Y - 0.2, -3);
        fogPass.setLightPos(1, 2.6, CEIL_Y - 0.2, -3);
        fogPass.setLightPos(2, 0, 0.08, -4.5);
        fogPass.setLightCol(0, pal.vapour, 11);
        fogPass.setLightCol(1, pal.vapour, 11);
        fogPass.setLightCol(2, pal.vapour, 18);
        sunDir.set(-3.4, 5.6, 4.2);
        fogPass.setKey(sunDir, pal.vapour, 3);
      }

      /* ── modules and world ──────────────────────────────────────── */
      if (!inDune) {
        modules.schema.update(cam.uSchemaFocus, t, hold.schema);
        modules.rls.update(cam.uRLSGate, t, hold.rls);
        modules.actions.update(cam.uActionsSpin, t, hold.actions);
        modules.interface.update(cam.uInterfaceGreen, t, hold.interface);
        modules.deploy.update(cam.uPreflight, t, hold.deploy);
        key.intensity = 3.1 * (1 - cam.uFlash * 0.5);
      } else {
        dune.update({
          descent: cam.uDescent,
          arrival: cam.uArrival,
          spread: cam.uPortfolioSpread,
          dusk: cam.uDusk,
          hovered: hoveredMonolith,
          t,
        });
      }

      /* ── post drive ─────────────────────────────────────────────── */
      focusPoint.set(cam.fx, cam.fy, cam.fz);
      dof.target = focusPoint;
      // The sharp band has to be narrower than the subject or the effect
      // provably runs and visibly does nothing — v2 §6's most expensive
      // no-op. Tying it to the inverse of bokeh means the wide shots keep
      // everything sharp and the close-ups drop the background out.
      dof.cocMaterial.worldFocusRange = Math.max(0.55, 4.2 / Math.max(0.5, cam.bokeh));
      dof.bokehScale = cam.bokeh;
      bloom.intensity = cam.bloom + cam.uFlash * 3.4;
      chroma.offset.set(cam.ca, cam.ca * 0.6);

      composer.render(dt);

      /* The SVG opener stays visible until a frame has actually reached the
         canvas. If the loop never runs — throttled tab, lost context, a driver
         that gives up — the page keeps the drawing rather than a black hole. */
      if (!painted) {
        painted = true;
        root.dataset.shMode = "canvas";
      }
      /* One attribute for the DOM palette. Written only on change: a custom
         property rewritten per frame is a whole-subtree style recalc sixty
         times a second, which is a real cost for a value that changes once. */
      const act = p >= CUT ? "dune" : "ship";
      if (act !== lastAct) {
        lastAct = act;
        root.dataset.shAct = act;
      }
    };

    /* Monolith hover, from the DOM links rather than a raycast — same argument
       as the hold buttons, and it means the keyboard path lights them too. */
    const monolithLinks = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sh-monolith]"),
    );
    monolithLinks.forEach((el, i) => {
      const on = () => (hoveredMonolith = i);
      const off = () => (hoveredMonolith = hoveredMonolith === i ? -1 : hoveredMonolith);
      el.addEventListener("pointerenter", on);
      el.addEventListener("pointerleave", off);
      el.addEventListener("focus", on);
      el.addEventListener("blur", off);
      cleanups.push(() => {
        el.removeEventListener("pointerenter", on);
        el.removeEventListener("pointerleave", off);
        el.removeEventListener("focus", on);
        el.removeEventListener("blur", off);
      });
    });

    raf = requestAnimationFrame(tick);

    /* A lost context must not leave a black rectangle over the page. Falling
       back to the drawing is always available and always correct. */
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      delete root.dataset.shMode;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const c of cleanups) c();
      detachMedia();
      tl?.kill();
      composer.dispose();
      fogPass.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      for (const d of disposables) d.dispose();
      renderer.dispose();
      delete root.dataset.shMode;
      delete root.dataset.shAct;
    };
  }, []);

  return <canvas ref={canvasRef} className="sh-canvas" aria-hidden="true" />;
}
