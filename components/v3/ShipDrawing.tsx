/**
 * The opening frame, as a drawing.
 *
 * Not a placeholder and not a degraded copy. This is the first paint on *every*
 * client — it is in the HTML, so it is on screen before any JavaScript has been
 * fetched — and it is the entire picture on a phone, under reduced motion, on
 * Save-Data, on a low-memory device, or anywhere WebGL 2 is missing. The canvas
 * cross-fades over it once a frame has actually reached the screen.
 *
 * That is the skill's "the fallback IS the first frame" rule, and the practical
 * consequence is that it has to be *composed*, not sketched: same camera, same
 * geometry, same palette, so the handoff is a material change rather than a
 * scene change.
 *
 * It is deliberately a technical drawing rather than an attempt at a render.
 * A low-fidelity imitation of a photoreal frame reads as a broken photoreal
 * frame; a line drawing of the same subject reads as an intentional register,
 * and it is the register the site's own argument is in — this is a page about
 * engineering, and a blueprint is not a downgrade from a photograph.
 *
 * Server Component. Zero client JavaScript.
 */

import { MONOLITHS } from "./ship-layout";

/**
 * The bridge, from the establishing camera.
 *
 * Coordinates are hand-composed against the same framing the score opens on
 * rather than projected from it. Projecting would be more rigorous and is what
 * v2 does for its callout ladder — but that ladder had to stay registered with
 * a *moving* camera, and this drawing is on screen for one shot only, under a
 * cross-fade, and never moves. Composing it directly is the cheaper correct
 * answer; the check is that the two are looked at side by side, which is what
 * the screenshots in the decisions doc are for.
 */
export function BridgeDrawing() {
  const mull = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <svg
      className="sh-svg sh-svg-ship"
      viewBox="0 0 1600 900"
      /* Y-anchored to the top, not the middle. At 16:9 this changes nothing —
         the viewBox and the frame have the same aspect, so there is no vertical
         crop to anchor. In portrait it is the whole difference: centred, a
         375x812 frame showed a 416-unit-wide slice through the middle of the
         drawing, which is the console arc at four times its intended size and
         no viewport at all. Anchored to the top, the crop keeps the window and
         the gas giant, which is what the shot is of. */
      preserveAspectRatio="xMidYMin slice"
      role="img"
      aria-label="A ship's bridge seen from behind the pilot chair: a wide curved viewport onto a gas giant, consoles across the foreground, light strips converging along the ceiling."
    >
      <defs>
        <radialGradient id="sh-giant" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#7e6a52" />
          <stop offset="52%" stopColor="#40382c" />
          <stop offset="100%" stopColor="#12100e" />
        </radialGradient>
        <linearGradient id="sh-deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12182A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#050912" stopOpacity="1" />
        </linearGradient>
        {/* Edges dissolve into the page instead of ending. Hard edges are the
            tell of a diagram; dissolved edges are the tell of an environment. */}
        <radialGradient id="sh-vig" cx="50%" cy="46%" r="72%">
          <stop offset="55%" stopColor="#050912" stopOpacity="0" />
          <stop offset="100%" stopColor="#050912" stopOpacity="1" />
        </radialGradient>
      </defs>

      <rect width="1600" height="900" fill="#050912" />

      {/* The viewport. A shallow arc, not a rectangle — the same reason the
          rendered version is a cylinder section. */}
      <g>
        <path
          d="M 300 236 Q 800 168 1300 236 L 1300 556 Q 800 604 300 556 Z"
          fill="#02040a"
        />
        <circle cx="946" cy="330" r="176" fill="url(#sh-giant)" />
        {/* Banding, four strokes. Enough to say "gas giant", few enough to stay
            a drawing. */}
        {[-92, -40, 22, 88].map((dy, i) => (
          <path
            key={dy}
            d={`M ${946 - Math.sqrt(Math.max(0, 176 * 176 - dy * dy))} ${330 + dy}
                A 176 176 0 0 0 ${946 + Math.sqrt(Math.max(0, 176 * 176 - dy * dy))} ${330 + dy}`}
            fill="none"
            stroke="#8e7a5e"
            strokeOpacity={0.16 + i * 0.05}
            strokeWidth="9"
          />
        ))}
        {/* Stars. Twenty-three, placed rather than random, so the drawing is
            byte-identical on every render and the HTML stays cacheable. */}
        {[
          [352, 292], [416, 214], [498, 340], [560, 258], [634, 206],
          [688, 372], [742, 268], [1180, 262], [1244, 336], [1288, 224],
          [1120, 208], [1226, 470], [1074, 496], [372, 470], [452, 512],
          [548, 448], [636, 508], [1310, 402], [318, 366], [1338, 300],
          [880, 208], [806, 246], [1006, 214],
        ].map(([x, y], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width={i % 5 === 0 ? 3 : 2}
            height={i % 5 === 0 ? 3 : 2}
            fill="#C4CCD8"
            opacity={i % 3 === 0 ? 0.85 : 0.45}
          />
        ))}
        {/* Mullions. */}
        {mull.map((m) => {
          const x = 800 + m * 166;
          const yTop = 236 - (1 - Math.abs(m) / 3.6) * 62;
          const yBot = 556 + (1 - Math.abs(m) / 3.6) * 44;
          return (
            <line
              key={m}
              x1={x}
              y1={yTop}
              x2={x}
              y2={yBot}
              stroke="#C4CCD8"
              strokeOpacity="0.32"
              strokeWidth="7"
            />
          );
        })}
        <path
          d="M 300 236 Q 800 168 1300 236 L 1300 556 Q 800 604 300 556 Z"
          fill="none"
          stroke="#C4CCD8"
          strokeOpacity="0.4"
          strokeWidth="10"
        />
      </g>

      {/* Ceiling LED runs, converging. The pair is what supplies the vanishing
          point — a single centre strip reads as a corridor, not a bridge. */}
      <path d="M 96 66 L 690 214" stroke="#4A9BFF" strokeOpacity="0.75" strokeWidth="7" />
      <path d="M 1504 66 L 910 214" stroke="#4A9BFF" strokeOpacity="0.75" strokeWidth="7" />
      <path d="M 0 22 L 640 196" stroke="#4A9BFF" strokeOpacity="0.28" strokeWidth="4" />
      <path d="M 1600 22 L 960 196" stroke="#4A9BFF" strokeOpacity="0.28" strokeWidth="4" />

      {/* Ribbed bulkheads, tapering inboard. */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = i / 5;
        const xl = 22 + t * 268;
        const xr = 1578 - t * 268;
        const yTop = 44 + t * 150;
        const yBot = 880 - t * 250;
        return (
          <g key={i} stroke="#C4CCD8" strokeOpacity={0.1 + t * 0.1} strokeWidth={9 - t * 4}>
            <line x1={xl} y1={yTop} x2={xl} y2={yBot} />
            <line x1={xr} y1={yTop} x2={xr} y2={yBot} />
          </g>
        );
      })}

      {/* Deck, and the two floor washes the fog bank sits in. */}
      <rect x="0" y="556" width="1600" height="344" fill="url(#sh-deck)" />
      <path d="M 60 872 L 470 578" stroke="#4A9BFF" strokeOpacity="0.5" strokeWidth="6" />
      <path d="M 1540 872 L 1130 578" stroke="#4A9BFF" strokeOpacity="0.5" strokeWidth="6" />

      {/* The console arc. Five modules, alternating, in the score's order. */}
      <path
        d="M 210 800 Q 800 636 1390 800"
        fill="none"
        stroke="#C4CCD8"
        strokeOpacity="0.3"
        strokeWidth="12"
      />
      {[
        { x: 1216, y: 700, w: 150, h: 104, lit: "#4A9BFF" },
        { x: 300, y: 716, w: 132, h: 118, lit: "#4A9BFF" },
        { x: 726, y: 656, w: 178, h: 92, lit: "#E4B573" },
        { x: 536, y: 676, w: 140, h: 84, lit: "#42E27B" },
        { x: 960, y: 690, w: 120, h: 92, lit: "#E4B573" },
      ].map((m, i) => (
        <g key={i}>
          <rect
            x={m.x}
            y={m.y}
            width={m.w}
            height={m.h}
            rx="8"
            fill="#12182A"
            stroke="#C4CCD8"
            strokeOpacity="0.34"
            strokeWidth="5"
          />
          <rect
            x={m.x + 14}
            y={m.y + 14}
            width={m.w - 28}
            height={m.h - 28}
            fill={m.lit}
            opacity="0.34"
          />
        </g>
      ))}

      {/* The pilot chair, in silhouette. It is always backlit, so it is a
          shape and never a model. */}
      <path
        d="M 726 900 L 742 690 Q 800 640 858 690 L 874 900 Z"
        fill="#050912"
        stroke="#C4CCD8"
        strokeOpacity="0.26"
        strokeWidth="5"
      />
      <rect x="862" y="702" width="44" height="7" fill="#E4B573" opacity="0.9" />

      <rect width="1600" height="900" fill="url(#sh-vig)" />
    </svg>
  );
}

/**
 * The Dune plain, for the warm act.
 *
 * Rendered into the same fixed layer and revealed by the act attribute, so the
 * no-WebGL path gets both worlds rather than a bridge that never leaves. The
 * monolith geometry is read from `ship-layout` and projected with a flat
 * orthographic squash, which is close enough at this camera and keeps the
 * drawing honest when a monolith moves.
 */
export function DuneDrawing() {
  const HORIZON = 470;
  const SCALE = 17;
  return (
    <svg
      className="sh-svg sh-svg-dune"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMin slice"
      role="img"
      aria-label="A desert plain at low sun: four monolithic structures of different heights casting long shadows toward the horizon, a small landed ship for scale."
    >
      <defs>
        <linearGradient id="sh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1F150C" />
          <stop offset="62%" stopColor="#5A3E23" />
          <stop offset="100%" stopColor="#C89568" />
        </linearGradient>
        <linearGradient id="sh-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C89568" />
          <stop offset="100%" stopColor="#3A2818" />
        </linearGradient>
        <radialGradient id="sh-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E4C89A" />
          <stop offset="62%" stopColor="#E4C89A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#E4C89A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sh-vig-w" cx="50%" cy="48%" r="74%">
          <stop offset="52%" stopColor="#1F150C" stopOpacity="0" />
          <stop offset="100%" stopColor="#1F150C" stopOpacity="0.94" />
        </radialGradient>
      </defs>

      <rect width="1600" height={HORIZON} fill="url(#sh-sky)" />
      <circle cx="286" cy={HORIZON - 26} r="150" fill="url(#sh-sun)" />
      <circle cx="286" cy={HORIZON - 26} r="42" fill="#E4C89A" />
      <rect y={HORIZON} width="1600" height={900 - HORIZON} fill="url(#sh-sand)" />

      {/* Shadows first, so the structures sit on top of their own. They run
          away from the sun at low left, and they are the whole reason this act
          is lit the way it is — the shadow is longer than the object. */}
      {MONOLITHS.map((m, i) => {
        const x = 800 + m.x * SCALE;
        const base = HORIZON + 118 + m.z * 5;
        const len = m.h * SCALE * 5.6;
        const w = m.w * SCALE;
        return (
          <path
            key={`s${i}`}
            d={`M ${x - w / 2} ${base} L ${x + w / 2} ${base} L ${x + w / 2 + len} ${base + 88} L ${x - w / 2 + len} ${base + 88} Z`}
            fill="#3A2818"
            opacity="0.72"
          />
        );
      })}

      {MONOLITHS.map((m, i) => {
        const x = 800 + m.x * SCALE;
        const base = HORIZON + 118 + m.z * 5;
        const h = m.h * SCALE;
        const w = m.w * SCALE;
        return (
          <g key={`m${i}`}>
            <rect x={x - w / 2} y={base - h} width={w} height={h} fill="#5A3E23" />
            {/* The lit face. One edge catching the sun is what makes a slab a
                solid rather than a rectangle. */}
            <rect x={x - w / 2} y={base - h} width={w * 0.22} height={h} fill="#8A6842" />
            <rect
              x={x - w / 2 + w * 0.4}
              y={base - h * 0.78}
              width={w * 0.13}
              height={h * 0.62}
              fill="#E4C89A"
              opacity="0.42"
            />
          </g>
        );
      })}

      {/* The landed ship, for scale. Four forms, no detail — it reads at this
          size in silhouette or not at all. */}
      <g transform={`translate(${800 + 1.2 * SCALE + 250} ${HORIZON + 214})`}>
        <ellipse cx="0" cy="26" rx="70" ry="9" fill="#3A2818" opacity="0.7" />
        <rect x="-52" y="-16" width="104" height="26" rx="13" fill="#5c6470" />
        <path d="M 22 -16 Q 40 -34 56 -16 Z" fill="#101820" />
        <rect x="-34" y="10" width="6" height="18" fill="#5c6470" />
        <rect x="26" y="10" width="6" height="18" fill="#5c6470" />
      </g>

      <rect width="1600" height="900" fill="url(#sh-vig-w)" />
    </svg>
  );
}
