import {
  buildStack,
  ISO_Y,
  PLATE_T,
  projectIso,
  SLAB_D,
  SLAB_W,
  stackBounds,
  type Segments,
} from "./exploded-stack";

/**
 * The Exploded Stack — zero-JavaScript state.
 *
 * This is not a placeholder for the WebGL hero. It is the hero's first frame,
 * projected from the same geometry module through the same bounds, so the
 * canvas has nothing to jump from when it takes over. It is also the entire
 * experience on a narrow viewport, on a device that declines WebGL, and under
 * reduced motion — which is why the pose below is composed as a finished
 * technical drawing rather than as frame zero of something else.
 *
 * Neither export is a client component. They render on the server, ship inside
 * the HTML, and cost no JavaScript. The separation on scroll is CSS
 * scroll-driven animation behind `@supports`, so Firefox — where the feature
 * is still behind a flag — gets the rest pose, and the rest pose is correct.
 *
 * The drawing and its callouts are two components because they occupy two
 * columns: text is a fixed size and the drawing is not, so reserving room for
 * labels *inside* a scalable box means either an oversized gutter on a wide
 * screen or labels sitting on the object on a narrow one. Giving them their
 * own column costs nothing and cannot collide at any width.
 */

/** viewBox units per world unit. Keeps path data readable and gzip-friendly. */
const S = 100;

/** One decimal at this scale is a 0.03% error across a ~450-unit drawing. */
const r1 = (n: number) => Math.round(n * 10) / 10;

const stack = buildStack();
const bounds = stackBounds(stack, ["rest", "exploded"]);
const VB = [
  bounds.minX * S,
  bounds.minY * S,
  bounds.width * S,
  bounds.height * S,
].map(r1);

/** Flat [x,y,z,…] segment runs → one SVG path, an `M…L…` pair per segment. */
function toPath(segments: Segments, dy = 0): string {
  let d = "";
  for (let i = 0; i < segments.length; i += 6) {
    const [ax, ay] = projectIso(segments[i], segments[i + 1] + dy, segments[i + 2]);
    const [bx, by] = projectIso(
      segments[i + 3],
      segments[i + 4] + dy,
      segments[i + 5],
    );
    d += `M${r1(ax * S)} ${r1(ay * S)}L${r1(bx * S)} ${r1(by * S)}`;
  }
  return d;
}

/**
 * A vertical move of Δy in world space is a pure vertical move on screen — an
 * isometric camera keeps world +Y aligned to screen up. So separating a plate
 * is one `translate` on its group, and the SVG and the WebGL scene agree on
 * the number without either needing to know about the other.
 */
const screenLift = (dy: number) => r1(-2 * dy * ISO_Y * S);

/** Vertical anchor of a plate's callout, as a percentage of the frame's height. */
function calloutY(plateY: number) {
  const y = projectIso(SLAB_W / 2, plateY + PLATE_T / 2, -SLAB_D / 2)[1];
  return ((y * S - VB[1]) / VB[3]) * 100;
}

export function ExplodedStackDrawing() {
  return (
    <svg
      className="xs-svg"
      viewBox={VB.join(" ")}
      role="img"
      aria-label="An isometric technical drawing of one system in five layers — schema, row-level-security policies, server actions, interface, and deploy — held slightly apart so each layer is visible, and seating together into a single solid."
    >
      <defs>
        {/* The ground field has to dissolve rather than end at a rectangle.
            Rule 3: hard edges are the tell of a diagram. */}
        <radialGradient id="xs-grid-fade" cx="50%" cy="52%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="xs-grid-mask">
          <rect
            x={VB[0]}
            y={VB[1]}
            width={VB[2]}
            height={VB[3]}
            fill="url(#xs-grid-fade)"
          />
        </mask>
      </defs>

      {/* The frame has to hold the exploded pose, so at rest the drawing is
          scaled up into the headroom it is not using yet and relaxes to 1 as
          the stack comes apart. The canvas applies the identical factor to its
          camera, which is why the two still agree pixel for pixel. */}
      <g className="xs-zoom">
      <g mask="url(#xs-grid-mask)">
        <path className="xs-grid" d={toPath(stack.world.grid)} />
      </g>
      <path className="xs-construction" d={toPath(stack.world.construction)} />

      {stack.plates.map((p, i) => (
        <g
          key={p.id}
          className="xs-plate"
          data-plate={p.id}
          style={
            {
              "--xs-i": i,
              "--xs-lift": `${screenLift(p.explodedY - p.restY)}px`,
            } as React.CSSProperties
          }
        >
          {/* What the lower layers contain is held back at rest, so the object
              reads as one focal face over four ghosted ones rather than as
              five drawings stacked on top of each other. It comes up to full
              as the stack separates and each layer clears. */}
          <g className="xs-plate-detail">
            <path
              className="xs-construction"
              d={toPath(p.segments.construction, p.restY)}
            />
            <path className="xs-detail" d={toPath(p.segments.detail, p.restY)} />
            <path className="xs-accent" d={toPath(p.segments.accent, p.restY)} />
          </g>
          <path className="xs-edge" d={toPath(p.segments.edge, p.restY)} />
        </g>
      ))}
      </g>
    </svg>
  );
}

/**
 * Real text in the DOM, never baked into the drawing (WCAG 1.4.5).
 * `aria-hidden` because the drawing's own label already names all five layers
 * in a sentence, and nobody needs to hear them twice.
 */
export function ExplodedStackCallouts() {
  return (
    <div className="xs-callouts" aria-hidden="true">
      {stack.plates.map((p, i) => (
        <span
          key={p.id}
          className="xs-label"
          data-plate={p.id}
          style={
            {
              "--xs-i": i,
              "--xs-ly": r1(calloutY(p.restY)),
              // The distance the callout travels when the stack comes apart —
              // the same journey its plate makes, in the same units.
              "--xs-ldy": r1(calloutY(p.explodedY) - calloutY(p.restY)),
            } as React.CSSProperties
          }
        >
          <b>{p.index}</b>
          {p.label}
        </span>
      ))}
    </div>
  );
}
