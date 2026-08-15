"use client";

import { useEffect, useRef } from "react";
import { buildClouds, buildSeeds, SHAPE_ORDER } from "./instrument-shapes";

/**
 * The particle instrument.
 *
 * One WebGL 2 context, one point-cloud buffer set, one animation frame loop.
 * Four objects morph in sequence — storefront → laptop → dashboard → receipt —
 * each one bursting outward, draining across the viewport on a curved path,
 * and reforming on the opposite side. That drift is the argument: the business
 * you already have becomes the thing that gets built, becomes the thing you
 * run, becomes what it pays out.
 *
 * The canvas is `position: fixed`, so it contributes no layout and cannot
 * shift anything. Everything it needs from the page — where the hero ends,
 * where the rail starts and stops — is measured once and re-measured on
 * resize, never per frame. The only per-frame read is `window.scrollY`, which
 * does not force layout.
 *
 * Degradation, in order of severity:
 *   reduced motion              → no context, no loop, static SVG figures
 *   no WebGL 2 / Save-Data      → same
 *   narrow viewport             → 4,500 points at DPR 1.5 instead of 16,000 at 2
 *
 * The unanimated state is the correct one: the page ships with the SVG figures
 * visible and the rig hides them only once it has a live context.
 */

const VERT = `#version 300 es
precision highp float;

in vec2 aFrom;
in vec2 aTo;
in vec3 aSeed;

uniform float uT;
uniform float uScale;
uniform float uAspect;
uniform vec2  uFromC;
uniform vec2  uToC;
uniform float uTime;
uniform float uIntro;
uniform vec2  uPointer;
uniform float uPointerK;
uniform float uPointSize;

out float vFly;

void main() {
  // Per-particle stagger, so the cloud leaves and arrives over a window
  // rather than as a single sheet.
  float t = clamp((uT - aSeed.x * 0.32) / 0.68, 0.0, 1.0);

  // Long-tail ease-out, kept in the same family as the site's single CSS
  // curve — cubic-bezier(0.32, 0.72, 0, 1) — rather than a second feel.
  float e = 1.0 - pow(1.0 - t, 3.2);

  vec2 A = aFrom * uScale + uFromC;
  vec2 B = aTo   * uScale + uToC;

  // Quadratic Bezier doing three jobs at once. Pushed radially out of the
  // source shape it reads as a contained burst; carried past the midpoint it
  // reads as a drain across the viewport; scattered per particle it stops the
  // cloud collapsing into a ribbon.
  vec2 radial = normalize(aFrom + vec2(1e-4, 1e-4));
  vec2 C = (A + B) * 0.5
         + radial * (0.62 * uScale)
         + vec2(0.0, (aSeed.y - 0.5) * 1.15 * uScale)
         + vec2(sin(aSeed.z * 43.0) * 0.30 * uScale, 0.0);

  float u = 1.0 - e;
  vec2 P = u * u * A + 2.0 * u * e * C + e * e * B;

  // Peaks at mid-flight. Drives colour, size and alpha together, so the burst
  // lights up and cools as it reforms.
  float fly = 4.0 * e * (1.0 - e);

  // Idle breathing — felt rather than seen. Stops a held object reading as a
  // still image without adding a second kind of motion.
  P += vec2(sin(uTime * 0.7 + aSeed.z * 31.0), cos(uTime * 0.55 + aSeed.y * 27.0))
     * 0.0055 * (1.0 - fly);

  // Rule 4: the cloud yields to the pointer. Pure displacement, no state, so
  // it needs no spring to come back and costs nothing when the pointer stops.
  vec2 d = P - uPointer;
  P += normalize(d + vec2(1e-4)) * uPointerK * exp(-dot(d, d) * 11.0);

  // Arrival. The cloud converges out of a scatter on first paint.
  vec2 scatter = vec2((aSeed.z - 0.5) * 3.2 * uAspect, (aSeed.y - 0.5) * 2.6);
  P = mix(scatter, P, uIntro);

  vFly = fly;
  gl_PointSize = uPointSize * (0.8 + 0.75 * fly);
  gl_Position = vec4(P.x / uAspect, P.y, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;

in float vFly;

uniform vec3  uSettled;
uniform vec3  uHot;
uniform float uAlpha;

out vec4 fragColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.25, 0.015, dot(c, c));
  vec3 col = mix(uSettled, uHot, clamp(vFly * 1.35, 0.0, 1.0));
  fragColor = vec4(col, a * uAlpha * mix(0.55, 1.0, vFly));
}`;

/** Shapes rest alternately right / left of centre. This is the side-to-side. */
const side = (i: number) => (i % 2 === 0 ? 1 : -1);

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3.2);

/** Ramp from 0 at `a` to 1 at `b`, both directions handled by the caller. */
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a || 1));

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function InstrumentRig() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── capability gate ──────────────────────────────────────────────
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (conn?.saveData) return;

    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof mem === "number" && mem > 0 && mem < 2) return;

    const DEV = process.env.NODE_ENV !== "production";

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: true,
      // Dev only, so a single frame can be drawn and inspected outside the
      // animation loop. Off in production, where it costs a buffer copy.
      preserveDrawingBuffer: DEV,
    });
    if (!gl) return;

    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const COUNT = narrow ? 4500 : 16000;
    const MAX_DPR = narrow ? 1.5 : 2;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // ── programme ────────────────────────────────────────────────────
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aFrom");
    gl.bindAttribLocation(prog, 1, "aTo");
    gl.bindAttribLocation(prog, 2, "aSeed");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uT = u("uT");
    const uScale = u("uScale");
    const uAspect = u("uAspect");
    const uFromC = u("uFromC");
    const uToC = u("uToC");
    const uTime = u("uTime");
    const uIntro = u("uIntro");
    const uPointer = u("uPointer");
    const uPointerK = u("uPointerK");
    const uPointSize = u("uPointSize");
    const uAlpha = u("uAlpha");

    gl.uniform3f(u("uSettled"), 0.84, 0.87, 0.94);
    gl.uniform3f(u("uHot"), 0.55, 0.6, 1.0);

    // ── buffers ──────────────────────────────────────────────────────
    const clouds = buildClouds(COUNT).map((data) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    });
    const seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, buildSeeds(COUNT), gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

    let boundPair = -1;
    const bindPair = (i: number) => {
      if (boundPair === i) return;
      boundPair = i;
      gl.bindBuffer(gl.ARRAY_BUFFER, clouds[i]);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, clouds[Math.min(i + 1, clouds.length - 1)]);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    };
    bindPair(0);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    // Additive over a near-black ground gives the instrument its glow without
    // a filter — no blur, no shadow, nothing re-rasterising per frame.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    // ── page geometry, measured on resize only ───────────────────────
    let vw = 0;
    let vh = 0;
    let aspect = 1;
    let dpr = 1;
    let proofTop = 0;
    let railTop = 0;
    let railEnd = 0;

    const measure = () => {
      vw = canvas.clientWidth || window.innerWidth;
      vh = canvas.clientHeight || window.innerHeight;
      aspect = vw / Math.max(1, vh);
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      const y = window.scrollY;
      const proof = document.getElementById("da-proof");
      const rail = document.getElementById("da-rail");
      proofTop = proof ? proof.getBoundingClientRect().top + y : 0;
      if (rail) {
        const r = rail.getBoundingClientRect();
        railTop = r.top + y;
        railEnd = railTop + r.height;
      }
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);

    // ── pointer ──────────────────────────────────────────────────────
    let px = 99;
    let py = 99;
    const onPointer = (e: PointerEvent) => {
      px = ((e.clientX / Math.max(1, vw)) * 2 - 1) * aspect;
      py = -((e.clientY / Math.max(1, vh)) * 2 - 1);
    };
    const onPointerLeave = () => {
      px = 99;
      py = 99;
    };
    if (finePointer) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    }

    // ── loop ─────────────────────────────────────────────────────────
    const STAGES = SHAPE_ORDER.length - 1;
    const scaleFor = () => (narrow ? 0.3 : 0.44);
    const sideMag = () => (narrow ? 0.3 : 0.45);
    const centreY = () => (narrow ? 0.26 : 0.0);

    let raf = 0;
    let running = false;
    let start = 0;
    let painted = false;

    /**
     * One frame. Split out of the loop so a single frame can be drawn on
     * demand — which is how this gets verified in a browser whose tab is
     * throttled and never fires requestAnimationFrame.
     */
    const draw = (time: number, forcedY?: number) => {
      const intro = ease(time / 1.15);
      const y = forcedY ?? window.scrollY;

      // Visibility. The rig owns the hero and the rail; the proof band in
      // between is deliberately un-theatrical, so the cloud clears out of it.
      let alpha: number;
      if (y < proofTop - vh) {
        alpha = 1;
      } else if (y < railTop - vh) {
        alpha = 1 - ramp(y, proofTop - vh, proofTop - vh * 0.45);
      } else {
        alpha = ramp(y, railTop - vh * 0.95, railTop - vh * 0.4);
      }
      if (railEnd > 0 && y > railEnd - vh * 1.4) {
        alpha *= 1 - ramp(y, railEnd - vh * 1.4, railEnd - vh * 0.7);
      }
      alpha = clamp01(alpha) * intro;

      if (alpha <= 0.002) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }

      // Morph progress. Each of the three transitions holds, moves, settles,
      // so the copy beside it has time to be read.
      const span = Math.max(1, railEnd - railTop - vh);
      const p = clamp01((y - railTop) / span) * STAGES;
      const idx = Math.min(STAGES - 1, Math.floor(p));
      const local = p - idx;
      const t = clamp01((local - 0.28) / 0.5);

      bindPair(idx);

      const sc = scaleFor();
      const mag = sideMag() * aspect;
      const cy = centreY();

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, t);
      gl.uniform1f(uAspect, aspect);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uIntro, intro);
      gl.uniform2f(uFromC, side(idx) * mag, cy);
      gl.uniform2f(uToC, side(idx + 1) * mag, cy);
      gl.uniform2f(uPointer, px, py);
      gl.uniform1f(uPointerK, finePointer ? 0.055 : 0);

      // Ghost twin first — a larger, fainter copy behind the crisp cloud, so
      // the object sits in an atmosphere rather than on the page (Rule 3).
      gl.uniform1f(uScale, sc * 1.5);
      gl.uniform1f(uPointSize, dpr * (narrow ? 1.7 : 2.0) * 2.1);
      gl.uniform1f(uAlpha, alpha * 0.1);
      gl.drawArrays(gl.POINTS, 0, COUNT);

      gl.uniform1f(uScale, sc);
      gl.uniform1f(uPointSize, dpr * (narrow ? 1.7 : 2.0));
      gl.uniform1f(uAlpha, alpha);
      gl.drawArrays(gl.POINTS, 0, COUNT);

      // The SVG figures stay visible until a frame has actually reached the
      // canvas. If the loop never runs — throttled tab, frozen renderer, a
      // driver that drops the context — the page keeps the drawn diagram
      // rather than an empty column.
      if (!painted) {
        painted = true;
        document.documentElement.dataset.daMode = "canvas";
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!start) start = now;
      draw((now - start) / 1000);
    };

    if (DEV) {
      (window as unknown as Record<string, unknown>).__daDraw = (
        y?: number,
        t = 3,
      ) => {
        measure();
        draw(t, y);
        return { railTop, railEnd, vh, scrolled: y ?? window.scrollY };
      };
    }

    const startLoop = () => {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    // The loop only runs while the rig's own territory is on screen.
    let visible = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (visible += e.isIntersecting ? 1 : -1));
        visible = Math.max(0, visible);
        if (visible > 0) startLoop();
        else stopLoop();
      },
      { rootMargin: "20% 0px" },
    );
    ["da-hero", "da-proof", "da-rail"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });

    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener("visibilitychange", onVisibility);

    // A reduced-motion preference set mid-session takes effect immediately.
    const onReduced = () => {
      if (reduced.matches) {
        stopLoop();
        gl.clear(gl.COLOR_BUFFER_BIT);
        painted = false;
        delete document.documentElement.dataset.daMode;
      }
    };
    reduced.addEventListener("change", onReduced);

    startLoop();

    return () => {
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReduced);
      if (finePointer) {
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerleave", onPointerLeave);
      }
      delete document.documentElement.dataset.daMode;
      if (DEV) delete (window as unknown as Record<string, unknown>).__daDraw;
      clouds.forEach((b) => gl.deleteBuffer(b));
      gl.deleteBuffer(seedBuf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} className="da-canvas" aria-hidden="true" />;
}
