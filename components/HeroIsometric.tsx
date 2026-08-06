/**
 * Hero graphic — six product surfaces stacked into one structure.
 *
 * The argument the picture has to make is the headline's: a firm's worth of
 * output, one pair of hands. So it is not a diagram of a team or a process. It
 * is the actual shipped work, each surface drawn as its own slab with its own
 * interface on it, stacked until the stack reads as a building. Every label
 * names something real that exists at a URL — nothing here is invented, and
 * there is no figure at a desk, because the point is the output, not a mascot.
 *
 * Drawn rather than screenshotted so it stays resolution-independent, weighs
 * nothing, and can hold a single accent point. Geometry is computed rather than
 * hand-plotted: density is the perceived-quality lever, and ~200 discrete
 * strokes is not something you place by hand.
 */

const COS30 = 0.8660254;

/** Slab footprint, thickness, and the vertical gap between levels. */
const W = 150;
const D = 108;
const T = 6;
const GAP = 43;

const OX = 152;
const OY = 296;

type Pt = [number, number];

/** 2:1 dimetric projection — x right-and-down, y left-and-down, z straight up. */
function iso(x: number, y: number, z: number): Pt {
  return [OX + (x - y) * COS30, OY + (x + y) * 0.5 - z];
}

const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/** A rectangle lying flat on a slab's top face, in slab-local coordinates. */
function tile(x: number, y: number, w: number, d: number, z: number) {
  return pts([
    iso(x, y, z),
    iso(x + w, y, z),
    iso(x + w, y + d, z),
    iso(x, y + d, z),
  ]);
}

type Surface = {
  name: string;
  note: string;
  /** Drawn on the slab's top face; each entry is a row of interface. */
  render: (z: number, accent: boolean) => React.ReactNode;
};

const HAIR = "#2A2E35";
const HAIR_SOFT = "#20242A";
const ACCENT = "#5E6AD2";

/** A run of list rows — the shape most of these products actually are. */
function rows(z: number, count: number, accentIndex = -1) {
  return Array.from({ length: count }, (_, i) => {
    const y = 16 + i * 15;
    const w = 96 - (i % 3) * 13;
    return (
      <g key={`r${i}`}>
        <polygon points={tile(16, y, w, 7, z)} fill={i === accentIndex ? ACCENT : "#31363E"} />
        <polygon points={tile(122, y, 12, 7, z)} fill={HAIR} />
      </g>
    );
  });
}

/** A small bar chart, for the surfaces that are actually about numbers. */
function bars(z: number, heights: number[]) {
  return heights.map((h, i) => (
    <polygon
      key={`b${i}`}
      points={tile(20 + i * 15, 74 - h, 9, h, z)}
      fill={i === heights.length - 2 ? "#3C424B" : "#2B3038"}
    />
  ));
}

const SURFACES: Surface[] = [
  {
    name: "Villa L’Estagne",
    note: "Booking · RLS",
    render: (z) => <>{rows(z, 4)}</>,
  },
  {
    name: "FM24",
    note: "Static export",
    render: (z) => (
      <>
        <polygon points={tile(16, 14, 118, 30, z)} fill="#22262D" />
        {rows(z, 2).slice(0, 2)}
      </>
    ),
  },
  {
    name: "Revoix",
    note: "Prerendered · no cookies",
    render: (z) => (
      <>
        <polygon points={tile(16, 14, 56, 46, z)} fill="#22262D" />
        <polygon points={tile(78, 14, 56, 46, z)} fill="#1D2126" />
        {rows(z, 1)}
      </>
    ),
  },
  {
    name: "NC Housing Terminal",
    note: "Mapbox · choropleth",
    render: (z) => (
      <>
        {bars(z, [18, 30, 24, 38, 27, 44, 33])}
        <polygon points={tile(16, 82, 118, 4, z)} fill={HAIR} />
      </>
    ),
  },
  {
    name: "Parenting Plan Pro",
    note: "react-pdf · CI gate",
    render: (z) => (
      <>
        <polygon points={tile(16, 14, 52, 72, z)} fill="#22262D" />
        {rows(z, 4).slice(0, 4)}
      </>
    ),
  },
  {
    name: "ConsultBase",
    note: "Supabase · Stripe · pg_cron",
    /* The one accent in the whole composition sits on the top surface. */
    render: (z, accent) => <>{rows(z, 5, accent ? 1 : -1)}</>,
  },
];

export default function HeroIsometric() {
  return (
    <svg
      className="stack"
      viewBox="0 0 520 474"
      role="img"
      aria-label="Six shipped product interfaces drawn as isometric layers stacked into a single structure: ConsultBase, Parenting Plan Pro, NC Housing Terminal, Revoix, FM24 and Villa L’Estagne."
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Edges dissolve rather than stopping, so the stack sits in the page
            instead of being pasted onto it. */}
        <linearGradient id="stack-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="26%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="stack-mask">
          <rect width="520" height="474" fill="url(#stack-fade)" />
        </mask>
      </defs>

      <g mask="url(#stack-mask)">
        {/* Ground plane — a hairline grid the structure stands on. */}
        <g className="stack-ground">
          {Array.from({ length: 9 }, (_, i) => {
            const t = i * (D / 8);
            const a = iso(-30, t, 0);
            const b = iso(W + 30, t, 0);
            return (
              <line
                key={`gx${i}`}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={HAIR_SOFT}
                strokeWidth="0.75"
              />
            );
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const t = i * (W / 10);
            const a = iso(t, -26, 0);
            const b = iso(t, D + 26, 0);
            return (
              <line
                key={`gy${i}`}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={HAIR_SOFT}
                strokeWidth="0.75"
              />
            );
          })}
        </g>

        {/* Slabs, painted bottom-up so higher levels overlap lower ones. */}
        {SURFACES.map((s, i) => {
          const z = 26 + i * GAP;
          const isTop = i === SURFACES.length - 1;
          const right = iso(W, 0, z);

          return (
            <g key={s.name} className="stack-layer" style={{ ["--i" as string]: i }}>
              {/* the two visible extruded sides */}
              <polygon
                points={pts([
                  iso(0, D, z),
                  iso(W, D, z),
                  iso(W, D, z - T),
                  iso(0, D, z - T),
                ])}
                fill="#0C0E10"
                stroke={HAIR}
                strokeWidth="0.8"
              />
              <polygon
                points={pts([
                  iso(W, 0, z),
                  iso(W, D, z),
                  iso(W, D, z - T),
                  iso(W, 0, z - T),
                ])}
                fill="#101318"
                stroke={HAIR}
                strokeWidth="0.8"
              />
              {/* top face */}
              <polygon
                points={tile(0, 0, W, D, z)}
                fill="#0A0C0E"
                stroke={isTop ? "#3A404A" : HAIR}
                strokeWidth="0.9"
              />
              {/* the interface itself */}
              {s.render(z, isTop)}

              {/* leader line out to the label */}
              <line
                x1={right[0]}
                y1={right[1]}
                x2={right[0] + 44}
                y2={right[1] - 16}
                stroke={HAIR}
                strokeWidth="0.75"
              />
              <line
                x1={right[0] + 44}
                y1={right[1] - 16}
                x2={right[0] + 76}
                y2={right[1] - 16}
                stroke={HAIR}
                strokeWidth="0.75"
              />
              {isTop && (
                <circle cx={right[0] + 44} cy={right[1] - 16} r="2.6" fill={ACCENT} />
              )}
              <text
                className="stack-label"
                x={right[0] + 82}
                y={right[1] - 19}
              >
                {s.name}
              </text>
              <text
                className="stack-note"
                x={right[0] + 82}
                y={right[1] - 7}
              >
                {s.note}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
