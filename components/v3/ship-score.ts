/**
 * The ship — camera score and shader event vocabulary.
 *
 * A `paused()` GSAP timeline of total duration 1. The frame loop calls
 * `tl.progress(p)` with the page's scroll fraction, and the timeline's only job
 * is to move numbers on one plain object. Nothing here touches three.js, the
 * DOM or React, so the choreography reads as a shot list rather than as a
 * render loop with cameras hidden in it.
 *
 * ── What changed from v2's score, and why ─────────────────────────────────
 *
 * v2 orbited a single object: the camera was radius / azimuth / elevation
 * around a look-at point, which is the right model when the subject is a thing
 * on a plinth. This camera is *inside a room* and then flies out of it, so an
 * orbit parameterisation would fight every move — panning across a console arc
 * is not an orbit, and neither is a dolly down a corridor. Position and target
 * are six independent world channels here.
 *
 * ── The one hard cut, and why it is safe ──────────────────────────────────
 *
 * The ship interior and the Dune world share an origin and are never on screen
 * together. They swap at the midpoint of the launch beat, under a deliberate
 * exposure blowout as the engines fire.
 *
 * A cut is normally the wrong instinct in a scrubbed timeline, because a
 * *simulated* cut has state that a seek bar cannot reconstruct — the same
 * failure v2 hit with the marble (§8). This one is safe for the opposite
 * reason: `uFlash` and the visibility flag are both pure functions of scroll
 * fraction. Scrubbing backwards across the cut swaps back, exactly, every time.
 * It is a lookup, not an integration.
 *
 * It is also simply the better shot. Flying continuously from a bridge interior
 * to a planet surface means either a long empty transit the visitor scrolls
 * through with nothing to look at, or a fake — and the flash cut on an engine
 * ignition is what the reference films actually do.
 *
 * ── Easing ────────────────────────────────────────────────────────────────
 *
 * Inherited from v2 unchanged, because the reasoning holds: scroll-driven
 * motion has no timing of its own — the wheel is the clock — so an ease on a
 * scrubbed camera re-times the visitor's input and reads as lag. Position
 * channels use power1.inOut. Discrete *events* (a gate opening, a screen
 * powering up, the flash) keep the site curve, evaluated directly rather than
 * approximated by power3.out.
 */

import { at, end, span } from "./narrative";
import { ANCHOR, BAY_DOOR_Z, CHAIR, EYE_Y, VIEWPORT_Z } from "./ship-layout";

/** Every channel the score animates. One object, so the loop reads one thing. */
export type CamState = {
  /** Camera world position. */
  px: number;
  py: number;
  pz: number;
  /** Look-at point, world. */
  tx: number;
  ty: number;
  tz: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /** Roll, radians. Fractions of a degree — enough to kill the tripod feel. */
  roll: number;

  /**
   * Depth-of-field focus target, world. Tracked as a point, never a distance:
   * focusing on a fixed distance makes every pan a rack focus (v2 §6).
   */
  fx: number;
  fy: number;
  fz: number;
  /** Bokeh scale. 0 is pinhole-sharp. */
  bokeh: number;

  /** Multiplier on the raymarched fog density. */
  fog: number;
  /** Bloom intensity. */
  bloom: number;
  /** Chromatic aberration offset, UV units at the frame edge. */
  ca: number;
  /** Scene exposure, applied upstream of the bloom threshold (v2 §6). */
  exposure: number;

  /* ── The shader event vocabulary ──────────────────────────────────────
     Named uniforms, one per narrative beat. Materials and passes read these
     by name, so a beat is a one-line write from here rather than a branch
     buried in the render loop. */

  /** 0-1 palette blend. 0 = cool ship, 1 = Dune warm. */
  uTransition: number;
  /** Schema console: code types on, panel lights, focus pulls in. */
  uSchemaFocus: number;
  /** RLS gate travel, 0 shut to 1 open. Scroll sets a floor; the hold adds. */
  uRLSGate: number;
  /** Server-actions disc angle, radians. Idle plus scroll plus hold. */
  uActionsSpin: number;
  /** Interface terminal green, 0 dark to 1 running. The one green on the page. */
  uInterfaceGreen: number;
  /** Pre-flight indicator ladder, 0-1. Five lights latch across this. */
  uPreflight: number;
  /** Launch: engine ignition and the run down the corridor. */
  uLaunch: number;
  /** Exposure blowout at the cut. Peaks at the launch beat's midpoint. */
  uFlash: number;
  /** Atmospheric entry: heat shimmer, dust building. */
  uDescent: number;
  /** Touchdown: gear extends, dust plume blooms outward. */
  uArrival: number;
  /** Monoliths' long shadows sweep out across the plain. */
  uPortfolioSpread: number;
  /** Sun elevation drop into dusk, 0-1. */
  uDusk: number;
};

/**
 * The establishing shot.
 *
 * Camera is a metre and a half behind the pilot chair at seated eye level,
 * looking down the bridge axis with the gas giant centred in the viewport.
 * Symmetry is the point: this is the only frame in the sequence that is
 * perfectly on-axis, which is what makes every subsequent pan read as a
 * departure from a known position rather than as drift.
 *
 * fov 46 rather than the 30 v2 used. That was an object on a plinth shot on a
 * long lens to compress it; this is an interior, and interiors shot long look
 * like dioramas. 46 is roughly a 40mm equivalent — wide enough to hold the
 * console arc, short enough not to bow the verticals.
 */
export const initialCam = (): CamState => ({
  px: 0,
  /**
   * Above the chair back, not level with it.
   *
   * The storyboard says "~1.5m behind the pilot chair", and taken literally at
   * eye level that framing puts the chair between the lens and everything the
   * shot is about. Every real bridge shot of this kind is *over the shoulder*:
   * the camera sits above the headrest so the chair reads as a foreground
   * silhouette in the lower third and the room is visible past it. So the
   * distance is the storyboard's and the height is not.
   */
  py: EYE_Y + 0.62,
  pz: CHAIR.z + 4.3,
  tx: 0,
  ty: EYE_Y + 0.46,
  tz: VIEWPORT_Z,
  fov: 46,
  roll: 0,
  fx: 0,
  fy: EYE_Y,
  fz: VIEWPORT_Z + 1.4,
  bokeh: 1.15,
  fog: 1,
  bloom: 1.1,
  /**
   * ~0.3px at the frame edge on a 1440 canvas. Inherited; v2 §6 records why
   * the brief's "half a pixel" rendered as nameable fringing rather than a lens.
   */
  ca: 0.00032,
  /* 1.24, up from 0.92. The first pass graded for a void with one lit object
     in it — this is a room, and a room lit to a void's exposure is a cave.
     Applied in the fog composite, upstream of the bloom threshold (v2 §6). */
  exposure: 1.24,

  uTransition: 0,
  uSchemaFocus: 0,
  uRLSGate: 0,
  uActionsSpin: 0,
  uInterfaceGreen: 0,
  uPreflight: 0,
  uLaunch: 0,
  uFlash: 0,
  uDescent: 0,
  uArrival: 0,
  uPortfolioSpread: 0,
  uDusk: 0,
});

/**
 * Where the interior stops being rendered and the Dune world starts.
 *
 * Expressed as a scroll fraction so the renderer, the audio layer and the DOM
 * act attribute all cut at provably the same instant. Sits at the launch beat's
 * midpoint, which is where `uFlash` peaks.
 */
export const CUT = at("launch") + span("launch") * 0.5;

/** True while the ship interior should be in the scene graph. */
export const inShip = (p: number) => p < CUT;

export function buildScore(
  gsap: typeof import("gsap").gsap,
  cam: CamState,
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power1.inOut" } });

  /** Position channels track the wheel one-to-one. */
  const MOVE = "power1.inOut";
  /** Events keep the site curve, solved directly rather than approximated. */
  const EVENT = bezier(0.32, 0.72, 0, 1);
  /** Things leaving accelerate away. The one place an ease-in is correct. */
  const EXIT = "power2.in";

  const A = ANCHOR;
  const sp = span;

  /* ── 0–11% · the bridge holds, then leans in ────────────────────────────
     The establishing shot gets a real beat before anything moves. v2's
     self-assessment named this as the gap — "correct is not the same as
     directed" — and a held frame is the cheapest direction there is. Nothing
     moves for the first third of the hero beat except the fog and the LEDs. */
  const h = at("hero");
  tl.to(cam, { duration: sp("hero") * 0.62, pz: CHAIR.z + 2.7, py: EYE_Y + 0.44, fov: 44, ease: MOVE }, h + sp("hero") * 0.32)
    .to(cam, { duration: sp("hero") * 0.4, bokeh: 1.5, ease: EVENT }, h + sp("hero") * 0.4);

  /* ── 01 Schema · pans right to the code surface ────────────────────────
     The pan is ~17° and the dolly is short. Focus leads the move by 8% of the
     beat — the plane arrives, then the camera arrives at it, which is what
     separates a shot from a zoom. */
  const s = at("schema");
  tl.to(cam, { duration: sp("schema") * 0.66, px: 1.75, py: 1.62, pz: -1.05, tx: A.schema.x - 0.25, ty: A.schema.y + 0.04, tz: A.schema.z, fov: 39, ease: MOVE }, s)
    .to(cam, { duration: sp("schema") * 0.6, fx: A.schema.x, fy: A.schema.y, fz: A.schema.z, bokeh: 2.7, ease: EVENT }, s - sp("schema") * 0.08)
    .to(cam, { duration: sp("schema") * 0.5, uSchemaFocus: 1, ease: EVENT }, s + sp("schema") * 0.12)
    .to(cam, { duration: sp("schema") * 0.4, fog: 0.78, bloom: 1.32, ease: MOVE }, s + sp("schema") * 0.2);

  /* ── 02 RLS · the full left swing ──────────────────────────────────────
     The longest lateral move on the bridge, and deliberately so: the gate is
     the first press-and-hold, and the visitor needs to have *travelled* to it.
     A quarter degree of roll in and out — not perceptible as roll, perceptible
     as the camera being held by something. */
  const r = at("rls");
  tl.to(cam, { duration: sp("rls") * 0.7, px: -0.85, py: 1.66, pz: -0.4, tx: A.rls.x + 0.3, ty: A.rls.y, tz: A.rls.z, fov: 37, ease: MOVE }, r)
    .to(cam, { duration: sp("rls") * 0.62, fx: A.rls.x, fy: A.rls.y, fz: A.rls.z, bokeh: 3.0, ease: EVENT }, r - sp("rls") * 0.08)
    .to(cam, { duration: sp("rls") * 0.34, roll: 0.0052, ease: EVENT }, r + sp("rls") * 0.22)
    .to(cam, { duration: sp("rls") * 0.32, roll: 0, ease: EVENT }, r + sp("rls") * 0.62)
    /* Scroll opens the gate to a third. The remaining two thirds are the hold —
       so the section is legible to someone who only scrolls, and rewards the
       person who presses. */
    .to(cam, { duration: sp("rls") * 0.55, uRLSGate: 0.34, ease: EVENT }, r + sp("rls") * 0.24)
    .to(cam, { duration: sp("rls") * 0.3, uSchemaFocus: 0.35, ease: MOVE }, r);

  /* ── 03 Server actions · back to centre, dolly in ──────────────────────
     Lowest camera height in the ship sequence. The arm sweeps overhead, and it
     only sweeps overhead if the camera is under it. */
  const a = at("actions");
  tl.to(cam, { duration: sp("actions") * 0.66, px: 0, py: 1.3, pz: -2.55, tx: A.actions.x, ty: A.actions.y + 0.06, tz: A.actions.z, fov: 41, ease: MOVE }, a)
    .to(cam, { duration: sp("actions") * 0.6, fx: A.actions.x, fy: A.actions.y, fz: A.actions.z, bokeh: 3.15, ease: EVENT }, a - sp("actions") * 0.08)
    .to(cam, { duration: sp("actions") * 0.8, uActionsSpin: Math.PI * 0.85, ease: MOVE }, a)
    .to(cam, { duration: sp("actions") * 0.35, fog: 0.9, ease: MOVE }, a + sp("actions") * 0.3);

  /* ── 04 Interface · the one green moment ──────────────────────────────
     The tightest lens in the sequence and the only warm-to-cool colour
     contrast on the page. Bloom comes *down* here, not up: a green screen at
     1.4 bloom is a green smear, which v2 §4 records paying for once already. */
  const i = at("interface");
  tl.to(cam, { duration: sp("interface") * 0.64, px: -1.42, py: 1.36, pz: -3.5, tx: A.interface.x, ty: A.interface.y, tz: A.interface.z, fov: 33, ease: MOVE }, i)
    .to(cam, { duration: sp("interface") * 0.58, fx: A.interface.x, fy: A.interface.y, fz: A.interface.z, bokeh: 3.5, ease: EVENT }, i - sp("interface") * 0.08)
    .to(cam, { duration: sp("interface") * 0.42, uInterfaceGreen: 1, ease: EVENT }, i + sp("interface") * 0.18)
    .to(cam, { duration: sp("interface") * 0.4, bloom: 0.98, ca: 0.00062, ease: MOVE }, i + sp("interface") * 0.2);

  /* ── 05 Deploy · the retreat down the corridor ─────────────────────────
     The camera dollies backwards out of the bridge while still facing it, so
     the room recedes and the amber spill from the launch bay grows behind the
     viewer rather than in front. The fov opens 10° across the move — a
     dolly-zoom in the direction that exaggerates depth, which makes the
     corridor read as longer than it is modelled. */
  const d = at("deploy");
  tl.to(cam, { duration: sp("deploy") * 0.44, px: 0, py: 1.58, pz: 1.6, tx: 0, ty: 1.5, tz: -5.5, fov: 43, ease: MOVE }, d)
    .to(cam, { duration: sp("deploy") * 0.46, pz: BAY_DOOR_Z - 4.4, ty: 1.46, tz: -1.2, fov: 51, ease: MOVE }, d + sp("deploy") * 0.44)
    .to(cam, { duration: sp("deploy") * 0.5, fx: 0, fy: 1.5, fz: -4, bokeh: 2.3, ease: EVENT }, d + sp("deploy") * 0.1)
    .to(cam, { duration: sp("deploy") * 0.62, uPreflight: 1, ease: "steps(5)" }, d + sp("deploy") * 0.2)
    .to(cam, { duration: sp("deploy") * 0.5, fog: 1.28, bloom: 1.34, ease: MOVE }, d + sp("deploy") * 0.4)
    /* The interface green does not survive the corridor. It belongs to one
       console, and carrying it out of the room would make it a brand colour. */
    .to(cam, { duration: sp("deploy") * 0.3, uInterfaceGreen: 0, uSchemaFocus: 0, ease: EXIT }, d + sp("deploy") * 0.36);

  /* ── The transition · ~70–78% ─────────────────────────────────────────
     The most cinematic beat on the page, and the one the whole structure is
     built to earn. First half: the camera accelerates through the bay door as
     the engines fire, fov opening hard, exposure climbing. `uFlash` peaks at
     the midpoint and the world swaps underneath it. Second half: the camera is
     outside and high, decelerating, and the palette is already most of the way
     warm because the ignition light was warm. */
  const L = at("launch");
  const half = sp("launch") * 0.5;
  tl.to(cam, { duration: half, pz: BAY_DOOR_Z + 5.5, py: 1.72, tz: 6, fov: 62, ease: "power2.in" }, L)
    .to(cam, { duration: half * 1.05, uLaunch: 1, ease: "power2.in" }, L)
    .to(cam, { duration: half * 0.9, exposure: 1.9, bloom: 2.4, ca: 0.0016, ease: "power2.in" }, L + half * 0.1)
    .to(cam, { duration: half * 0.55, uFlash: 1, ease: "power3.in" }, L + half * 0.45)
    /* Palette leads the cut. By the time the world swaps, the light is already
       warm — so the Dune reads as the place that light was coming from rather
       than as a second site with a second colour scheme. */
    .to(cam, { duration: sp("launch") * 0.8, uTransition: 1, ease: EVENT }, L + half * 0.15)
    /* ── the cut ── */
    /*
     * The arrival frame needs a horizon, and the first version did not have
     * one. At py 44 / pz 52 looking down at ty 6 the camera was almost
     * overhead: the whole frame was ground, so the Dune read as an orange
     * texture rather than as a place — and a place is the entire argument of
     * the second act. It is a long shallow approach now, sky in the top third,
     * the plain running away to a real horizon line.
     */
    .set(cam, { px: 0, py: 21, pz: 82, tx: 0, ty: 11, tz: 0, fov: 52, roll: 0.014 }, CUT)
    .to(cam, { duration: half * 0.9, uFlash: 0, ease: "power2.out" }, CUT)
    .to(cam, { duration: half, py: 14, pz: 56, ty: 5.5, fov: 47, exposure: 1.15, bloom: 1.5, ease: "power2.out" }, CUT)
    .to(cam, { duration: half * 0.8, fx: 0, fy: 2, fz: 0, bokeh: 1.2, ease: EVENT }, CUT)
    .to(cam, { duration: half * 0.7, fog: 1.05, ease: MOVE }, CUT);

  /* ── Descent ──────────────────────────────────────────────────────────
     Follows the ship down through atmosphere. The roll unwinds as the camera
     levels — a banked approach that settles, which is the one moment on the
     page where roll is doing narrative work rather than killing a tripod. */
  const de = at("descent");
  tl.to(cam, { duration: sp("descent") * 0.86, py: 8.6, pz: 36, ty: 3.2, fov: 44, roll: 0, ease: MOVE }, de)
    .to(cam, { duration: sp("descent") * 0.9, uDescent: 1, ease: MOVE }, de)
    .to(cam, { duration: sp("descent") * 0.5, uArrival: 1, ease: EVENT }, de + sp("descent") * 0.5)
    .to(cam, { duration: sp("descent") * 0.6, fog: 1.35, ca: 0.0009, ease: MOVE }, de + sp("descent") * 0.2)
    .to(cam, { duration: sp("descent") * 0.6, exposure: 1.02, bloom: 1.22, ease: MOVE }, de + sp("descent") * 0.3);

  /* ── Portfolio ────────────────────────────────────────────────────────
     Wide horizontal establishing shot of the plain, landed ship in frame for
     scale. The monoliths do not fade in — they are already standing, and what
     animates is the *shadow* sweeping out from each one as the virtual sun
     drops. Architecture does not arrive; light arrives on it. */
  const po = at("portfolio");
  tl.to(cam, { duration: sp("portfolio") * 0.72, px: -1.2, py: 6.4, pz: 25.5, tx: -0.6, ty: 2.6, tz: -1, fov: 41, ease: MOVE }, po)
    .to(cam, { duration: sp("portfolio") * 0.75, uPortfolioSpread: 1, ease: EVENT }, po)
    .to(cam, { duration: sp("portfolio") * 0.5, fx: 0, fy: 3, fz: -2, bokeh: 0.9, ease: EVENT }, po)
    .to(cam, { duration: sp("portfolio") * 0.5, fog: 0.92, bloom: 1.16, ca: 0.00042, ease: MOVE }, po + sp("portfolio") * 0.2);

  /* ── Footer ───────────────────────────────────────────────────────────
     Locked wide, gently rising, sun descending. The camera does not return
     anywhere — the page has arrived somewhere and stays there. */
  const f = at("footer");
  tl.to(cam, { duration: sp("footer") * 0.9, py: 8.8, pz: 29.5, ty: 1.9, tz: -3, fov: 37, ease: MOVE }, f)
    .to(cam, { duration: sp("footer") * 0.85, uDusk: 1, ease: MOVE }, f)
    .to(cam, { duration: sp("footer") * 0.7, exposure: 0.86, fog: 1.18, ease: MOVE }, f + sp("footer") * 0.15);

  /* GSAP infers duration from the furthest tween end. Pinning it to exactly 1
     means progress(p) and scroll fraction are the same number, and a keyframe
     accidentally placed past 1.0 is a visible bug rather than a silent
     rescale of the entire score. */
  tl.totalDuration(1);
  return tl;
}

/** Sanity constant, read by the dev-time coverage check in SceneGL. */
export const SCORE_ENDS_AT = end("footer");

/**
 * A CSS cubic-bezier(x1, y1, x2, y2) as a JS easing function.
 * Newton-Raphson on x, which is what the browsers do. Eight iterations is past
 * the point where the residual is visible at 60fps.
 */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const A = (p: number, q: number) => 1 - 3 * q + 3 * p;
  const B = (p: number, q: number) => 3 * q - 6 * p;
  const C = (p: number) => 3 * p;
  const calc = (t: number, p: number, q: number) =>
    ((A(p, q) * t + B(p, q)) * t + C(p)) * t;
  const slope = (t: number, p: number, q: number) =>
    3 * A(p, q) * t * t + 2 * B(p, q) * t + C(p);

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let n = 0; n < 8; n++) {
      const dd = slope(t, x1, x2);
      if (Math.abs(dd) < 1e-6) break;
      const err = calc(t, x1, x2) - x;
      if (Math.abs(err) < 1e-6) break;
      t -= err / dd;
    }
    return calc(t, y1, y2);
  };
}
