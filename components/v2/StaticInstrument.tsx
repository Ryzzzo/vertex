import { shapePath, type ShapeId } from "./instrument-shapes";

const LABELS: Record<ShapeId, string> = {
  storefront: "A business that already runs.",
  laptop: "The instrument, under construction.",
  dashboard: "The instrument, in daily use.",
  receipt: "What it produces.",
};

/**
 * The unanimated state, and the correct one.
 *
 * Every beat ships with its instrument drawn as an inline SVG from exactly the
 * same segment geometry the particle cloud is sampled from — so a browser with
 * no WebGL 2, a device the rig declines to run on, and anyone who has asked for
 * reduced motion all get the real diagram rather than an empty column.
 *
 * When the rig does come up it sets `data-da-mode="canvas"` on the document and
 * these fade to zero opacity **without leaving the layout**, so the space they
 * reserved is the space the particles occupy and nothing shifts.
 */
export default function StaticInstrument({ id }: { id: ShapeId }) {
  return (
    <figure className="da-figure" aria-hidden="false">
      <svg viewBox="-1.15 -1.15 2.3 2.3" role="img" aria-label={LABELS[id]}>
        {/* non-scaling-stroke resolves stroke-width in screen pixels, not in
            the 2.3-unit viewBox — so this is 1px at every size, and must not
            be authored as a viewBox-space fraction. */}
        <path
          d={shapePath(id)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </figure>
  );
}
