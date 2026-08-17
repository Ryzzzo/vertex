import {
  buildDrawing,
  fullRoute,
  MARBLE_R,
  MODULE_WINDOWS,
  MODULES,
  project,
  S,
  STROKE_CLASSES,
  VIEW_BOX,
  type Pt3,
  type Segments,
  type StrokeClass,
} from "./machine-parts";
import { moduleFrameY } from "./camera-score";

/**
 * The Machine — zero-JavaScript state.
 *
 * Not a placeholder. This is the machine's engineering drawing, projected
 * through the same camera the WebGL layer uses, and it is:
 *
 *   · the first paint on every client, before any decision about capability
 *   · the entire hero on a narrow viewport, on Save-Data, and where WebGL 2 is
 *     missing
 *   · the finished picture under reduced motion, where no context is created
 *   · the frame the WebGL layer builds the object *into* — the parts fly in and
 *     settle onto these lines, so the handoff has nothing to jump between
 *
 * Nothing here is a client component. It renders on the server, ships inside
 * the HTML and costs no JavaScript. The marble travels on scroll through
 * `offset-path` and a scroll-driven keyframe, both behind `@supports`; without
 * either, it waits at the mouth of the machine, which is the correct rest state
 * and the state the drawing was composed around.
 */

const drawing = buildDrawing();

/** One decimal at this scale is a 0.005% error across the 200-unit viewBox. */
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Flat [x,y,z,…] segment runs → one path, an `M…L…` pair per segment. */
function toPath(segments: Segments): string {
  let d = "";
  for (let i = 0; i < segments.length; i += 6) {
    const a = project(segments[i], segments[i + 1], segments[i + 2]);
    const b = project(segments[i + 3], segments[i + 4], segments[i + 5]);
    d += `M${r1(a[0] * S)} ${r1(a[1] * S)}L${r1(b[0] * S)} ${r1(b[1] * S)}`;
  }
  return d;
}

/** A projected polyline, as one open path. Used for the marble's route. */
function routePath(pts: Pt3[]): string {
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    const p = project(pts[i][0], pts[i][1], pts[i][2]);
    d += `${i ? "L" : "M"}${r1(p[0] * S)} ${r1(p[1] * S)}`;
  }
  return d;
}

const ROUTE = routePath(fullRoute().pts);

/**
 * The marble's radius on screen. It is a perspective camera, so this is only
 * true at the depth the track sits at — which is the only depth the marble is
 * ever at, so it is true everywhere it matters.
 */
const MARBLE_PX = (() => {
  const a = project(0, 0, drawing.marble[2]);
  const b = project(MARBLE_R, 0, drawing.marble[2]);
  return r1(Math.abs(b[0] - a[0]) * S);
})();

/** Order matters: this is paint order, back to front. */
const ORDER: StrokeClass[] = STROKE_CLASSES.filter((c) => c !== "construction");

export function MachineDrawing() {
  return (
    <svg
      className="mx-svg"
      viewBox={VIEW_BOX}
      role="img"
      aria-label="An engineering drawing of a vertical machine in five modules — schema, row-level security, server actions, interface and deploy — with a track carrying a single marble from the mouth at the top, down through each module in turn, and out of a launch rail at the side."
    >
      <defs>
        {/* Rule 3: the ground field has to dissolve into the page rather than
            end at a rectangle. A hard edge is the tell of a diagram. */}
        <radialGradient id="mx-ground-fade" cx="50%" cy="62%" r="58%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="52%" stopColor="#fff" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="mx-ground-mask">
          <rect x={-S} y={-S} width={S * 2} height={S * 2} fill="url(#mx-ground-fade)" />
        </mask>
      </defs>

      <g mask="url(#mx-ground-mask)">
        <path className="mx-construction" d={toPath(drawing.construction)} />
      </g>

      {ORDER.map((cls) => (
        <path key={cls} className={`mx-${cls}`} d={toPath(drawing[cls])} />
      ))}

      {/* The marble. Its own element in both renderers, because it is the only
          thing that travels the whole length of the picture. The route is an
          `offset-path`, so the entire mobile animation is one custom property
          and no JavaScript at all. */}
      <g className="mx-marble" style={{ offsetPath: `path("${ROUTE}")` }}>
        <circle className="mx-marble-body" r={MARBLE_PX} />
        <circle
          className="mx-marble-spec"
          r={r1(MARBLE_PX * 0.34)}
          cx={r1(-MARBLE_PX * 0.3)}
          cy={r1(-MARBLE_PX * 0.34)}
        />
      </g>
    </svg>
  );
}

/**
 * Real text in the DOM, never baked into the drawing (WCAG 1.4.5), and the only
 * place the module names exist. Each is a button rather than a span so the
 * callout copy is reachable by keyboard as well as by hover — a hover-only
 * disclosure is a disclosure that does not exist for anyone on a keyboard.
 *
 * Reference #3's floating signage, done as DOM: emissive mono type with a
 * hairline bracket, sitting in 3D-adjacent space beside the panels. Rendering
 * it inside the canvas instead would have put five labels into a 480px-wide
 * frame, which is the clutter the brief said to skip.
 */
export function MachineCallouts() {
  return (
    <div className="mx-callouts">
      {MODULES.map((m, i) => (
        <div
          key={m.id}
          className="mx-callout"
          data-module={m.id}
          style={
            {
              "--mx-i": i,
              // Where this module actually lands down the frame in the
              // establishing shot, projected through the same camera the canvas
              // uses. Not a measured constant — see `moduleFrameY`.
              "--mx-top": `${(moduleFrameY(m.y) * 100).toFixed(2)}%`,
              // The window this module is live for, taken from the route
              // itself. CSS turns the pair into a triangular ramp, which is the
              // whole no-JavaScript stage highlight.
              "--mx-a": r1(MODULE_WINDOWS[i].from * 100) / 100,
              "--mx-b": r1(MODULE_WINDOWS[i].to * 100) / 100,
            } as React.CSSProperties
          }
        >
          <button className="mx-label" type="button" aria-describedby={`mx-copy-${m.id}`}>
            <b>{m.index}</b>
            <span>{m.label}</span>
          </button>
          <p className="mx-callout-copy" id={`mx-copy-${m.id}`} role="note">
            {m.copy}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * The terminal's readout, as text. The canvas draws the same string into the
 * screen texture; this is the copy that can be selected, translated, read out
 * and searched. `aria-live` is off deliberately — a line that changes on every
 * scroll tick would be a screen-reader hazard, and the callouts above already
 * carry the meaning.
 */
export function MachineReadout() {
  return (
    <p className="mx-readout" aria-live="off">
      <span className="mx-readout-dot" aria-hidden="true" />
      <span className="mx-readout-text">{MODULES[0].readout}</span>
    </p>
  );
}
