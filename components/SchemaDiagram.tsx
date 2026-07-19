type Field = { name: string; note?: string };

const ROW_H = 17;
const HEAD_H = 30;
const PAD = 8;
const W = 150;

function Table({
  x,
  y,
  name,
  fields,
}: {
  x: number;
  y: number;
  name: string;
  fields: Field[];
}) {
  const h = HEAD_H + fields.length * ROW_H + PAD;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={W}
        height={h}
        rx={7}
        fill="var(--surface)"
        stroke="var(--hairline)"
      />
      <line
        x1={x}
        y1={y + HEAD_H - 8}
        x2={x + W}
        y2={y + HEAD_H - 8}
        stroke="var(--hairline)"
      />

      <text
        x={x + 10}
        y={y + 16}
        fill="var(--text-primary)"
        fontSize="11.5"
        fontFamily="var(--font-mono)"
      >
        {name}
      </text>

      {/* row-level security badge */}
      <g transform={`translate(${x + W - 22}, ${y + 6})`}>
        <path
          d="M6 0.5 L11 2.4 V6.2 C11 9 8.9 11 6 11.8 C3.1 11 1 9 1 6.2 V2.4 Z"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
        />
        <path
          d="M4.1 6.1 h3.8 v3 h-3.8 z M4.9 6.1 V5 a1.1 1.1 0 0 1 2.2 0 v1.1"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.9"
        />
      </g>

      {fields.map((f, i) => (
        <g key={f.name}>
          <text
            x={x + 10}
            y={y + HEAD_H + 9 + i * ROW_H}
            fill="var(--text-secondary)"
            fontSize="10.5"
            fontFamily="var(--font-mono)"
          >
            {f.name}
          </text>
          {f.note ? (
            <text
              x={x + W - 10}
              y={y + HEAD_H + 9 + i * ROW_H}
              textAnchor="end"
              fill="var(--text-tertiary)"
              fontSize="9.5"
              fontFamily="var(--font-mono)"
            >
              {f.note}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

export default function SchemaDiagram() {
  return (
    <svg
      className="schematic"
      viewBox="0 0 560 300"
      role="img"
      aria-label="Entity diagram: plans and reviews reference clauses, and clauses reference a protected-text registry. Every table carries a row-level security badge."
    >
      <g
        className="flow"
        stroke="var(--text-tertiary)"
        strokeWidth="1.25"
        fill="none"
        strokeDasharray="4 4"
      >
        <path d="M170 60 H192 V135 H210" />
        <path d="M170 230 H192 V176 H210" />
        <path d="M370 155 H400" />
      </g>

      <g fill="var(--text-tertiary)">
        <path d="M210 135 l-6 -3.5 v7 z" />
        <path d="M210 176 l-6 -3.5 v7 z" />
        <path d="M400 155 l-6 -3.5 v7 z" />
      </g>

      <Table
        x={20}
        y={16}
        name="plans"
        fields={[
          { name: "id", note: "pk" },
          { name: "matter_id" },
          { name: "status" },
        ]}
      />
      <Table
        x={20}
        y={186}
        name="reviews"
        fields={[
          { name: "id", note: "pk" },
          { name: "plan_id", note: "fk" },
          { name: "state" },
        ]}
      />
      <Table
        x={214}
        y={111}
        name="clauses"
        fields={[
          { name: "id", note: "pk" },
          { name: "plan_id", note: "fk" },
          { name: "registry_key", note: "fk" },
        ]}
      />
      <Table
        x={400}
        y={111}
        name="protected_text"
        fields={[
          { name: "key", note: "pk" },
          { name: "statute" },
          { name: "checksum" },
        ]}
      />
    </svg>
  );
}
