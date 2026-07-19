type Plate = {
  y: number;
  label: string;
  detail: string;
};

const HALF_W = 132;
const HALF_H = 62;
const DEPTH = 13;
const CX = 240;

const plates: Plate[] = [
  { y: 74, label: "edge", detail: "proxy · auth · region" },
  { y: 166, label: "api", detail: "server actions · validation" },
  { y: 258, label: "db", detail: "postgres · RLS · pg_cron" },
];

function rhombus(cx: number, cy: number) {
  return `${cx},${cy - HALF_H} ${cx + HALF_W},${cy} ${cx},${cy + HALF_H} ${cx - HALF_W},${cy}`;
}

function leftFace(cx: number, cy: number) {
  return `${cx - HALF_W},${cy} ${cx},${cy + HALF_H} ${cx},${cy + HALF_H + DEPTH} ${cx - HALF_W},${cy + DEPTH}`;
}

function rightFace(cx: number, cy: number) {
  return `${cx},${cy + HALF_H} ${cx + HALF_W},${cy} ${cx + HALF_W},${cy + DEPTH} ${cx},${cy + HALF_H + DEPTH}`;
}

/**
 * Request flow as three stacked planes. The isometric projection is doing real
 * work here: it separates the tiers vertically so the descent — and the return
 * path back up — reads as one continuous route rather than three boxes joined
 * by arrows.
 */
export default function IsometricFlow() {
  return (
    <svg
      className="schematic iso"
      viewBox="0 0 480 380"
      role="img"
      aria-label="Request flow descending through three tiers: edge, API, and database, and returning."
    >
      <defs>
        <linearGradient id="iso-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--text-primary)" stopOpacity="0.085" />
          <stop offset="100%" stopColor="var(--text-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {plates.map((plate, i) => (
        <g key={plate.label} className="iso-plate" style={{ ["--i" as string]: i }}>
          <polygon points={leftFace(CX, plate.y)} className="iso-face iso-face-left" />
          <polygon points={rightFace(CX, plate.y)} className="iso-face iso-face-right" />
          <polygon points={rhombus(CX, plate.y)} className="iso-top" fill="url(#iso-top)" />

          <text x={CX - 96} y={plate.y + 2} className="iso-label">
            {plate.label}
          </text>
          <text x={CX - 96} y={plate.y + 17} className="iso-detail">
            {plate.detail}
          </text>
        </g>
      ))}

      {/* Request descending, then the response climbing back out. */}
      <path
        d={`M ${CX + 96} 30 L ${CX + 96} ${plates[2].y - 6}`}
        className="iso-path flow"
        fill="none"
      />
      <path
        d={`M ${CX + 112} ${plates[2].y + 6} L ${CX + 112} 44`}
        className="iso-path iso-path-return flow"
        fill="none"
      />

      <circle cx={CX + 96} cy={30} r="3" className="iso-node" />
      <circle cx={CX + 112} cy={44} r="3" className="iso-node iso-node-return" />
    </svg>
  );
}
