const NODE = {
  fill: "var(--surface)",
  stroke: "var(--hairline)",
} as const;

function Node({
  x,
  y,
  w,
  h,
  label,
  sub,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={NODE.fill}
        stroke={NODE.stroke}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 4 : y + h / 2 + 4}
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="13"
        fontFamily="var(--font-body)"
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 15}
          textAnchor="middle"
          fill="var(--text-tertiary)"
          fontSize="10.5"
          fontFamily="var(--font-mono)"
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

export default function ArchitectureDiagram() {
  return (
    <svg
      className="schematic"
      viewBox="0 0 560 250"
      role="img"
      aria-label="Schematic: a client talks to Vercel Edge, which queries a Postgres database of sixty tables with row-level security; pg_cron runs scheduled jobs inside that same database."
    >
      {/* Edges */}
      <g
        className="flow"
        stroke="var(--text-tertiary)"
        strokeWidth="1.25"
        fill="none"
        strokeDasharray="4 4"
      >
        <path d="M120 116 H186" />
        <path d="M324 116 H386" />
        <path d="M452 196 V166" />
      </g>

      {/* Arrowheads */}
      <g fill="var(--text-tertiary)">
        <path d="M186 116 l-6 -3.5 v7 z" />
        <path d="M386 116 l-6 -3.5 v7 z" />
        <path d="M452 166 l-3.5 6 h7 z" />
      </g>

      <Node x={10} y={92} w={110} h={48} label="Client" />
      <Node x={190} y={92} w={134} h={48} label="Vercel Edge" />
      <Node
        x={390}
        y={80}
        w={160}
        h={72}
        label="Postgres"
        sub="60 tables · RLS"
      />
      <Node x={392} y={196} w={120} h={44} label="pg_cron" />
    </svg>
  );
}
