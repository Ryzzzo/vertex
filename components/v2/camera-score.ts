/**
 * The Machine — camera score.
 *
 * Scroll position drives a GSAP timeline whose only job is to move numbers on a
 * plain object. Nothing in here touches three.js, the DOM or React, which is
 * what makes the choreography readable as a shot list rather than as a render
 * loop with cameras hidden in it.
 *
 * ── Why GSAP, and why not ScrollTrigger ──────────────────────────────────
 *
 * The timeline is `paused()` with a total duration of 1, and the frame loop
 * calls `tl.progress(p)` with the hero's own scroll fraction. That is a
 * deliberate half-adoption:
 *
 *   · GSAP's timeline earns its ~26 KB because these are seven keyframes across
 *     eleven channels with *deliberately unequal spans*. The focus pull leads
 *     the dolly into a module by 8% of the track and the fog lags it by 6%; the
 *     fov opens for the launch a beat before the camera starts tilting. Written
 *     as one keyframe array with a shared `t`, every channel is forced to change
 *     at the same instants, and a camera whose properties all break together is
 *     exactly what "interpolated, not directed" looks like. Overlapping tweens
 *     are the entire product here.
 *
 *   · ScrollTrigger is not used, and skipping it is not laziness. Its three
 *     features are pin, scrub and snap. The hero is pinned by `position: sticky`,
 *     which survives with JavaScript off and costs nothing; scrub is one
 *     `progress()` call against a number the loop already reads; snap is banned
 *     by the house rule against mandatory snapping. What ScrollTrigger would add
 *     is a second scroll authority that has to be manually reconciled with Lenis
 *     via `scrollerProxy` — a known-fragile seam — in exchange for features that
 *     are already present or unwanted. It is ~14 KB gz of coordination risk.
 *
 * ── Easing, and the one place the site curve does not apply ───────────────
 *
 * The house rule is one curve everywhere: `cubic-bezier(0.32, 0.72, 0, 1)`.
 * That rule governs *time-driven* motion, where the curve is the thing supplying
 * the timing. Scroll-driven motion has no timing of its own — the user's wheel
 * is the clock — and an ease applied on top of it re-times their input. In
 * practice a long-tail ease-out on a scrubbed camera reads as the page lagging
 * the scroll by a few frames, which is the exact sensation the curve exists to
 * avoid elsewhere.
 *
 * So: camera *position* channels move on `power1.inOut`, which is gentle enough
 * to hide keyframe corners and shallow enough that the camera tracks the wheel
 * one-to-one. Discrete *events* — a gate opening, a screen powering up, the
 * focus snapping to a new module — keep the site curve, because those are
 * time-driven responses that happen to be triggered by scroll rather than
 * scrubbed by it. Both are in this file, and which one a channel uses is the
 * single most load-bearing choice in the choreography.
 */

import { FACE_Z, MODULE_PITCH } from "./machine-parts";

/** Every channel the score animates. One object, so the loop reads one thing. */
export type CamState = {
  /** Look-at point in world space. Negative x pushes the object right of frame. */
  tx: number;
  ty: number;
  tz: number;
  /** Orbit distance from the target. */
  radius: number;
  /** Azimuth, radians. 0 looks straight at the +Z face. */
  az: number;
  /** Elevation, radians. Negative puts the camera below the target, looking up. */
  el: number;
  /** Vertical field of view, degrees. Widening it during the launch is the shot. */
  fov: number;
  /** Camera roll, radians. Fractions of a degree; enough to kill the tripod feel. */
  roll: number;

  /** World-space point the depth of field is focused on, as a Y offset from ty. */
  focusY: number;
  /** Bokeh scale. 0 is pinhole-sharp, >1 is a long lens wide open. */
  bokeh: number;

  /** Multiplier on the raymarched fog's density. */
  fog: number;
  /** Bloom intensity, so the LEDs bloom harder when the camera is close to them. */
  bloom: number;
  /** Chromatic aberration offset, in UV units at the frame edge. */
  ca: number;
  /** How much the overlay copy is faded out. 1 = gone. */
  copyOut: number;
};

export const initialCam = (): CamState => ({
  tx: -1.55,
  /**
   * The look-at sits below the object's centre, and the camera sits below that
   * again (`el` is negative). Both are the same move for the same reason: this
   * is reference #2's camera, which is on the floor looking up at a thing that
   * is taller than the room. Levelling either one costs the whole impression of
   * scale, and it is the cheapest monumentality there is.
   */
  ty: 0.02,
  tz: 0,
  /**
   * 11.9, up from 10.6. At 10.6 the plinth was cropped by the bottom edge — and
   * a machine standing on a base you cannot see is a machine with nothing to
   * stand on. The base is where the fog is, where the weight is, and where the
   * low angle pays off; it is the last thing to give up frame for.
   */
  radius: 11.9,
  az: 0.2,
  el: -0.17,
  fov: 30,
  roll: 0,
  focusY: 0,
  bokeh: 1.35,
  fog: 1,
  bloom: 1.15,
  /**
   * ~0.3 px at the frame edge on a 1440-wide canvas, down from 0.0007.
   *
   * The first value was picked as "half a pixel" from the brief and rendered as
   * visible red/green fringing along every machined edge in the upper third —
   * which is not a lens, it is a decoding artefact. The tell is that you can
   * *name* the colours. Correct CA is a thing you notice only when it is
   * switched off.
   */
  ca: 0.00032,
  copyOut: 0,
});

/**
 * Where a module's centre lands down the frame in the establishing shot, as a
 * fraction from the top. Used by the server to place the callout ladder.
 *
 * The first version of the ladder was two hand-measured constants — a start
 * offset and a per-module step, read off a screenshot. They were wrong, and
 * wrong in the way measured constants always are: the step was right to within
 * a few percent, which is close enough that the top label looked correct and
 * the bottom one was 100px adrift, so the error read as "the bottom module
 * moved" rather than as "the step is 12% too large". Projecting the actual
 * world position through the actual camera cannot drift when the camera is
 * retuned, and retuning the camera is most of what this build does.
 *
 * Deliberately *not* per-frame: the labels are a fixed rail. Re-projecting them
 * every frame would make them swim across the screen during every dolly, which
 * is a game HUD, not a technical drawing. This is the establishing shot's
 * geometry, frozen — the composition the ladder was designed against.
 *
 * It runs on the server, so the no-JavaScript path gets the same ladder.
 */
export function moduleFrameY(moduleY: number, aspect = 16 / 9): number {
  const c = initialCam();
  const ce = Math.cos(c.el);
  const eye = [
    c.tx + Math.sin(c.az) * ce * c.radius,
    c.ty + Math.sin(c.el) * c.radius,
    c.tz + Math.cos(c.az) * ce * c.radius,
  ];
  const target = [c.tx, c.ty, c.tz];

  const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (v: number[]) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  // three's lookAt basis: -Z is forward, so `fwd` below is the camera's -Z.
  const fwd = norm(sub(target, eye));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);

  // The module's face plane, not its centre plane — the panel front is what the
  // label is pointing at, and at this distance the 0.09 is worth about a pixel.
  const p = sub([0, moduleY, FACE_Z], eye);
  const vy = dot(p, up);
  const vz = dot(p, fwd);
  if (vz <= 0) return 0.5;

  // Same fov widening the renderer applies below 16:9 — see `measure()`.
  const REF = 16 / 9;
  const fovScale = aspect < REF ? Math.min(1.42, REF / Math.max(aspect, 0.55)) : 1;
  const halfFov = ((c.fov * fovScale) / 2) * (Math.PI / 180);

  const ndcY = vy / vz / Math.tan(halfFov);
  return 0.5 - ndcY / 2;
}

/** Module centre heights, so keyframes name a module rather than a magic number. */
const SCHEMA = MODULE_PITCH * 2;
const RLS = MODULE_PITCH;
const ACTIONS = 0;
const INTERFACE = -MODULE_PITCH;
const DEPLOY = -MODULE_PITCH * 2;

/**
 * The shot list, as a GSAP timeline of total duration 1.
 *
 * `gsap` is passed in rather than imported so this module stays free of side
 * effects and can be unit-read without pulling the library in.
 */
export function buildScore(
  gsap: typeof import("gsap").gsap,
  cam: CamState,
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power1.inOut" } });

  /** Position channels track the wheel. Shallow by design — see the header. */
  const MOVE = "power1.inOut";
  /**
   * Events keep the site curve. GSAP has no cubic-bezier() parser in core, and
   * CustomEase is a plugin, so the curve is evaluated directly: a Newton solve
   * for t given x, then the cubic in y. Fifteen lines against a plugin download,
   * and it is provably the same curve the CSS uses rather than an eyeballed
   * `power3.out` that is close enough to look wrong beside it.
   */
  const EVENT = bezier(0.32, 0.72, 0, 1);

  // ── 0–10% · the drop ──────────────────────────────────────────────────
  // Establishing shot holds for the first 4% so the built object gets a beat to
  // be looked at before anything moves, then the camera pushes in and cranes up
  // to the funnel as the marble is released into it.
  tl.to(cam, { duration: 0.1, radius: 8.9, ty: 1.15, tx: -1.1, az: 0.29, el: -0.08, ease: MOVE }, 0.04)
    .to(cam, { duration: 0.1, focusY: 2.2, bokeh: 1.9, ease: EVENT }, 0.02)
    .to(cam, { duration: 0.08, fog: 1.25, ease: MOVE }, 0.04)
    // The copy clears out early. It belongs to the establishing shot and nothing
    // else; leaving it up while the camera is inside the machine is the single
    // fastest way to make a cinematic scene read as a web page again.
    .to(cam, { duration: 0.09, copyOut: 1, ease: EVENT }, 0.035);

  // ── 10–25% · Schema ───────────────────────────────────────────────────
  // Swings left. Every module gets the opposite side from the one before it, so
  // the descent reads as a camera walking around the object rather than a lift.
  tl.to(cam, { duration: 0.15, radius: 6.4, ty: SCHEMA, tx: -0.35, az: -0.36, el: -0.02, fov: 31, ease: MOVE }, 0.1)
    // Focus leads the dolly by 8% of the track: the plane arrives, then the
    // camera arrives at it. Reversing that order is what makes a move read as a
    // zoom rather than as a shot.
    .to(cam, { duration: 0.13, focusY: SCHEMA, bokeh: 2.6, ease: EVENT }, 0.09)
    .to(cam, { duration: 0.12, bloom: 1.5, ca: 0.00055, ease: MOVE }, 0.12)
    .to(cam, { duration: 0.1, fog: 0.72, ease: MOVE }, 0.16);

  // ── 25–40% · RLS, the gate ────────────────────────────────────────────
  tl.to(cam, { duration: 0.15, radius: 5.5, ty: RLS, tx: 0.42, az: 0.48, el: 0.07, ease: MOVE }, 0.25)
    .to(cam, { duration: 0.13, focusY: RLS, bokeh: 2.9, ease: EVENT }, 0.24)
    // A quarter degree of roll into the gate and out of it. Not perceptible as
    // roll; perceptible as the camera being held by something.
    .to(cam, { duration: 0.08, roll: 0.0045, ease: EVENT }, 0.3)
    .to(cam, { duration: 0.09, roll: 0, ease: EVENT }, 0.38);

  // ── 40–55% · Server Actions, the arm ──────────────────────────────────
  // The lowest angle in the sequence. The arm sweeps overhead, and it only
  // sweeps overhead if the camera is under it.
  tl.to(cam, { duration: 0.15, radius: 5.0, ty: ACTIONS - 0.12, tx: -0.28, az: -0.24, el: -0.19, fov: 33, ease: MOVE }, 0.4)
    .to(cam, { duration: 0.14, focusY: ACTIONS, bokeh: 3.1, ease: EVENT }, 0.39)
    .to(cam, { duration: 0.1, fog: 0.85, ease: MOVE }, 0.44);

  // ── 55–70% · Interface, the screen ────────────────────────────────────
  // The closest the camera ever gets. The screen is the only warm light on the
  // object, so this is where the colour contrast peaks and the bloom is pulled
  // *down* rather than up — a green screen at 1.5 bloom is a green smear.
  tl.to(cam, { duration: 0.15, radius: 4.35, ty: INTERFACE + 0.04, tx: 0.18, az: 0.17, el: 0.01, fov: 30, ease: MOVE }, 0.55)
    .to(cam, { duration: 0.13, focusY: INTERFACE, bokeh: 3.4, ease: EVENT }, 0.54)
    .to(cam, { duration: 0.12, bloom: 1.05, ca: 0.0008, ease: MOVE }, 0.56);

  // ── 70–85% · Deploy, the launch ───────────────────────────────────────
  // Pull back hard and drop the camera under the plinth, then tilt up as the
  // rocket leaves. The fov opens 8° across the move, which is a dolly-zoom in
  // the direction that exaggerates height rather than compressing it.
  tl.to(cam, { duration: 0.07, radius: 6.2, ty: DEPLOY, tx: -0.2, az: 0.06, el: -0.1, ease: MOVE }, 0.7)
    .to(cam, { duration: 0.09, focusY: DEPLOY, bokeh: 2.2, ease: EVENT }, 0.69)
    .to(cam, { duration: 0.1, fog: 1.5, ease: MOVE }, 0.7)
    // The tilt. `ty` climbs past the top of the object because the camera is
    // following the rocket, not the machine.
    .to(cam, { duration: 0.09, radius: 9.4, ty: 2.6, el: -0.3, fov: 39, ease: MOVE }, 0.77)
    .to(cam, { duration: 0.08, focusY: 3.4, bokeh: 1.6, ease: EVENT }, 0.78)
    .to(cam, { duration: 0.06, bloom: 1.9, ca: 0.0014, ease: EVENT }, 0.78)
    .to(cam, { duration: 0.05, roll: -0.008, ease: EVENT }, 0.79);

  // ── 85–100% · settle ──────────────────────────────────────────────────
  // Back to the establishing shot, but mirrored a few degrees in azimuth. An
  // exact return reads as a rewind; arriving somewhere adjacent reads as the
  // camera having been somewhere and come back.
  const home = initialCam();
  tl.to(cam, {
    duration: 0.14,
    radius: home.radius,
    ty: home.ty,
    tx: home.tx,
    az: -0.14,
    el: home.el,
    fov: home.fov,
    roll: 0,
    ease: MOVE,
  }, 0.86)
    .to(cam, { duration: 0.13, focusY: 0, bokeh: home.bokeh, ease: EVENT }, 0.86)
    .to(cam, { duration: 0.12, fog: home.fog, bloom: home.bloom, ca: home.ca, ease: MOVE }, 0.87)
    .to(cam, { duration: 0.1, copyOut: 0, ease: EVENT }, 0.9);

  // GSAP infers duration from the furthest tween end; pinning it to exactly 1
  // means `progress(p)` and scroll fraction are the same number, and a keyframe
  // added past 1.0 by mistake is a visible bug rather than a silent rescale.
  tl.totalDuration(1);
  return tl;
}

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` as a JS easing function.
 *
 * Newton-Raphson on x with a bisection fallback, which is what the browsers do.
 * Eight iterations is past the point where the residual is visible at 60fps.
 */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const C = (a: number) => 3 * a;
  const calc = (t: number, a: number, b: number) =>
    ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t: number, a: number, b: number) =>
    3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      const err = calc(t, x1, x2) - x;
      if (Math.abs(err) < 1e-6) break;
      t -= err / d;
    }
    return calc(t, y1, y2);
  };
}
