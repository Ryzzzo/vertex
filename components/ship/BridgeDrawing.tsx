/**
 * The Bridge, drawn.
 *
 * This is not a placeholder and it is not a degraded copy. It is the first
 * paint on every client, it is the LCP element, and on a reduced-motion or
 * no-WebGL client it is the whole room. The scene resolves *over* it where
 * capability allows — same composition, same proportions, two rendering paths.
 *
 * Building it this way is also what keeps LCP off the renderer's critical path:
 * this is inline SVG in the server-rendered HTML, so it is painted and measured
 * long before `three.webgpu` is even requested. Nearly all of a bad LCP is the
 * browser not knowing the element exists yet — putting it in the source is the
 * whole fix.
 *
 * Fidelity tier 1 on purpose. A technical drawing is honest about being a
 * drawing; a low-poly render is a worse version of the thing next to it.
 *
 * Geometry mirrors `lib/ship/rooms/bridge.ts` — vanishing point on the centre
 * axis, viewport dominant, chair small and low, ceiling and deck both in frame.
 */
export default function BridgeDrawing({ id }: { id: string }) {
  // Vanishing point, on the centre axis a little above the frame's middle.
  const vx = 800;
  const vy = 430;

  const consoles = [
    { x: 250, y: 636, w: 250, h: 54 },
    { x: 372, y: 566, w: 196, h: 44 },
    { x: 452, y: 516, w: 154, h: 36 },
  ];

  return (
    <svg
      className="bridge-drawing"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMin slice"
      role="presentation"
      focusable="false"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-neb`} cx="38%" cy="42%" r="72%">
          <stop offset="0%" stopColor="var(--sh-accent)" stopOpacity="0.30" />
          <stop offset="55%" stopColor="var(--sh-accent)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--sh-space)" stopOpacity="0" />
        </radialGradient>
        {/* The opening the viewport looks through. Everything outside is clipped
            to it, so the star field cannot bleed onto the hull. */}
        <clipPath id={`${id}-port`}>
          <path d="M 596 318 L 1004 318 L 1044 358 L 1044 494 L 1004 534 L 596 534 L 556 494 L 556 358 Z" />
        </clipPath>
      </defs>

      <rect width="1600" height="900" fill="var(--sh-space)" />

      {/* ── Ceiling: two light runs plus coffer ribs, converging. The ribs are
             what let the eye measure the room's length. ── */}
      <g
        stroke="var(--sh-hull-shade)"
        strokeWidth="1"
        fill="none"
        opacity="0.55"
      >
        <path d={`M 0 0 L ${vx} ${vy}`} />
        <path d={`M 1600 0 L ${vx} ${vy}`} />
        <path d={`M 300 0 L ${vx - 62} ${vy - 18}`} />
        <path d={`M 1300 0 L ${vx + 62} ${vy - 18}`} />
        {[46, 116, 176, 226, 268].map((y, i) => {
          const t = y / 430;
          const half = 800 * (1 - t) + 70 * t;
          return (
            <path
              key={i}
              d={`M ${800 - half} ${y} L ${800 + half} ${y}`}
              opacity={0.7 - i * 0.09}
            />
          );
        })}
      </g>

      {/* The two ceiling strips — the room's light source, and the strongest
          depth cue in the frame. */}
      <g stroke="var(--sh-strip)" strokeWidth="2.5" strokeLinecap="round">
        <path d={`M 250 0 L ${vx - 48} ${vy - 26}`} opacity="0.85" />
        <path d={`M 1350 0 L ${vx + 48} ${vy - 26}`} opacity="0.85" />
      </g>

      {/* ── Deck: plate seams running to the same point. ── */}
      <g stroke="var(--sh-deck-line)" strokeWidth="1.5" fill="none">
        <path d={`M -120 900 L ${vx - 96} ${vy + 168}`} />
        <path d={`M 1720 900 L ${vx + 96} ${vy + 168}`} />
        <path d={`M 300 900 L ${vx - 54} ${vy + 168}`} opacity="0.6" />
        <path d={`M 1300 900 L ${vx + 54} ${vy + 168}`} opacity="0.6" />
        {[898, 812, 748, 700, 664, 638].map((y, i) => (
          <path
            key={i}
            d={`M ${800 - (800 - (y - vy) * 0.02 - i * 108)} ${y} L ${800 + (800 - (y - vy) * 0.02 - i * 108)} ${y}`}
            opacity={0.5 - i * 0.06}
          />
        ))}
      </g>

      {/* ── Side walls: panel courses, mirrored. ── */}
      {[-1, 1].map((side) => (
        <g
          key={side}
          stroke="var(--sh-hull-shade)"
          strokeWidth="1.25"
          fill="none"
          opacity="0.8"
        >
          {[0, 1, 2, 3].map((i) => {
            const x = 800 + side * (800 - i * 168);
            const yTop = 96 + i * 74;
            const yBot = 900 - i * 96;
            return <path key={i} d={`M ${x} ${yTop} L ${x} ${yBot}`} />;
          })}
          <path
            d={`M ${800 + side * 800} 470 L ${800 + side * 296} ${vy + 34}`}
            stroke="var(--sh-strip)"
            strokeWidth="2"
            opacity="0.7"
          />
        </g>
      ))}

      {/* ── Console pods, three per side, canted inward. ── */}
      {[-1, 1].map((side) =>
        consoles.map((c, i) => {
          const cx = 800 + side * (800 - c.x);
          const k = 12;
          return (
            <g key={`${side}-${i}`}>
              <path
                d={`M ${cx - c.w / 2 + k} ${c.y} L ${cx + c.w / 2 - k} ${c.y} L ${cx + c.w / 2} ${c.y + k} L ${cx + c.w / 2} ${c.y + c.h} L ${cx - c.w / 2} ${c.y + c.h} L ${cx - c.w / 2} ${c.y + k} Z`}
                fill="var(--sh-recess)"
                stroke="var(--sh-hull-edge)"
                strokeWidth="1.5"
              />
              <path
                d={`M ${cx - c.w / 2 + 16} ${c.y - 3} L ${cx + c.w / 2 - 16} ${c.y - 3}`}
                stroke="var(--sh-accent)"
                strokeWidth="2"
                opacity="0.8"
              />
            </g>
          );
        }),
      )}

      {/* ── The viewport. Everything above is framing for this. ── */}
      <g clipPath={`url(#${id}-port)`}>
        <rect x="556" y="318" width="488" height="216" fill="var(--sh-space)" />
        <rect
          x="556"
          y="318"
          width="488"
          height="216"
          fill={`url(#${id}-neb)`}
        />
        {/* The gas giant, limb only — a planet centred in a centred window is a
            target; offset, it is a view. */}
        <circle
          cx="648"
          cy="452"
          r="132"
          fill="var(--sh-screen)"
          opacity="0.95"
        />
        <g stroke="var(--sh-hull-shade)" strokeWidth="1" opacity="0.4" fill="none">
          <path d="M 524 424 Q 648 404 772 428" />
          <path d="M 520 452 Q 648 436 776 456" />
          <path d="M 528 480 Q 648 468 768 484" />
        </g>
        <g fill="var(--sh-hull)">
          {[
            [860, 352], [922, 388], [988, 344], [812, 402], [956, 452],
            [886, 486], [1012, 424], [842, 508], [932, 328], [996, 500],
            [790, 348], [1024, 380],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.1} opacity={0.55 + (i % 4) * 0.12} />
          ))}
        </g>
      </g>

      {/* Viewport frame, standing proud of the wall. */}
      <path
        d="M 596 318 L 1004 318 L 1044 358 L 1044 494 L 1004 534 L 596 534 L 556 494 L 556 358 Z"
        fill="none"
        stroke="var(--sh-hull)"
        strokeWidth="7"
      />
      <path
        d="M 596 318 L 1004 318 L 1044 358 L 1044 494 L 1004 534 L 596 534 L 556 494 L 556 358 Z"
        fill="none"
        stroke="var(--sh-accent)"
        strokeWidth="1.5"
        opacity="0.75"
      />

      {/* ── Command chair: small, low, clear of the glass. ── */}
      <g fill="var(--sh-recess)" stroke="var(--sh-hull-edge)" strokeWidth="1.5">
        <ellipse cx="800" cy="742" rx="118" ry="26" fill="var(--sh-deck-line)" />
        <path d="M 786 742 L 814 742 L 814 700 L 786 700 Z" />
        <path d="M 762 700 L 838 700 L 838 686 L 762 686 Z" />
        <path d="M 770 686 Q 800 662 830 686 L 830 636 Q 800 622 770 636 Z" />
      </g>
      <path
        d="M 690 744 L 910 744"
        stroke="var(--sh-accent)"
        strokeWidth="2"
        opacity="0.65"
      />
    </svg>
  );
}
