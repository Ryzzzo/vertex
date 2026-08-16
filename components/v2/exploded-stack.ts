/**
 * The Exploded Stack — geometry.
 *
 * One isometric slab of five plates: schema, RLS policies, server actions,
 * interface, deploy. The names are not decoration; they are the stack listed
 * in the hero copy at `app/v2/page.tsx:62`, and the object argues the sentence
 * at `:70` — a thing that comes apart, shows every layer, and goes back
 * together as one piece.
 *
 * This module is the single source of the drawing. It imports nothing, touches
 * no DOM and no WebGL, and is consumed by both renderers:
 *
 *   · `ExplodedStackFallback.tsx` projects it to inline SVG on the server —
 *     the first paint on every client, the whole picture on mobile, and the
 *     finished state under reduced motion.
 *   · `ExplodedStackGL.tsx` uploads the same arrays to three.js line buffers.
 *
 * Because both read from here, the fallback is not a degraded copy of the
 * hero. It is the hero's opening frame, and the handoff from SVG to canvas
 * has nothing to jump between.
 *
 * Every random value comes from a seeded PRNG, so server HTML and client
 * buffers are bit-identical and React never reports a hydration mismatch.
 */

// ── the slab ────────────────────────────────────────────────────────────
// A rectangle rather than a square: 2.0 × 1.4 reads as a board, and a stack
// of boards is the thing being argued. A square stack reads as a cube, which
// argues nothing.
export const SLAB_W = 2.0;
export const SLAB_D = 1.4;

/** Plate thickness. Thin enough to read as a plate, thick enough to catch a lit edge. */
export const PLATE_T = 0.075;

/**
 * Three poses, and the object moves between them along one axis.
 *
 * `REST` is the opening frame and the still: layers held slightly apart, faces
 * transparent, everything read as one schematic. `EXPLODE` is the middle of
 * the scroll, where each layer clears the others and earns its label. `SEAT`
 * is the end — flush, opaque, lit, one piece.
 *
 * The geometry note that decided this: in true isometric a plate lifted by `g`
 * is displaced `g` along both x and z relative to the plate above it, so a
 * pure-Y explode never uncovers a lower face unless `g` approaches the slab's
 * own width. Stacking five of those would put the object four screens tall.
 * The way out is that the schematic state does not occlude at all — faces are
 * transparent, so all five layers read through each other, which is precisely
 * what a wireframe assembly drawing looks like. Occlusion arrives only when
 * the object resolves to solid, and by then it is seated and there is nothing
 * left to hide.
 */
export const SEAT_GAP = 0.008;
export const REST_GAP = 0.2;
export const EXPLODE_GAP = 0.52;

/** Content is inset from the plate edge so the lit rim stays clean. */
const INSET = 0.095;

export const PLATE_IDS = [
  "schema",
  "rls",
  "actions",
  "interface",
  "deploy",
] as const;

export type PlateId = (typeof PLATE_IDS)[number];

export const PLATES: readonly {
  id: PlateId;
  index: string;
  label: string;
  /** Read out by assistive tech from the SVG; the visible label is terser. */
  description: string;
}[] = [
  {
    id: "schema",
    index: "01",
    label: "schema",
    description: "Tables and foreign keys — the shape of the business, written down once.",
  },
  {
    id: "rls",
    index: "02",
    label: "rls policies",
    description: "Row-level security predicates. Who can see which row, enforced in the database.",
  },
  {
    id: "actions",
    index: "03",
    label: "server actions",
    description: "Server actions — the operations the business actually performs.",
  },
  {
    id: "interface",
    index: "04",
    label: "interface",
    description: "The interface the work is done in, every day.",
  },
  {
    id: "deploy",
    index: "05",
    label: "deploy",
    description: "The deploy pipeline, and the commit that is live right now.",
  },
];

/**
 * Stroke classes. Both renderers map these to a weight and an opacity, so the
 * SVG and the canvas read as the same drawing rather than as two drawings that
 * happen to share coordinates.
 */
export type StrokeClass =
  | "edge" // plate silhouette — the primary structure
  | "detail" // what each layer actually contains
  | "accent" // the few marks that carry the accent colour
  | "construction" // callout leaders, dimension lines, explosion axes
  | "grid"; // the ground field, faded at its edges

export const STROKE_CLASSES: readonly StrokeClass[] = [
  "grid",
  "construction",
  "detail",
  "edge",
  "accent",
];

/** A flat run of 3D line segments: [x1,y1,z1, x2,y2,z2, …]. */
export type Segments = number[];

// ── deterministic randomness ────────────────────────────────────────────
// Seeded so the server's SVG and the client's buffers are identical. An
// unseeded Math.random() here would be a hydration mismatch that only shows up
// as a visible jump on the first frame.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── plate-local drawing surface ─────────────────────────────────────────
/**
 * Content is authored in (u, v) ∈ [0,1]², which maps to the plate's inset top
 * face. Authoring in unit space means a plate's detail can be tuned without
 * touching the slab's dimensions, and the two never drift apart.
 */
class Face {
  readonly out: Record<StrokeClass, Segments>;
  private readonly y: number;

  constructor(out: Record<StrokeClass, Segments>, plateTopY: number) {
    this.out = out;
    // Lifted clear of the top face. At this scale the offset is invisible and
    // it costs nothing, which is cheaper than fighting z-fighting in a shader.
    this.y = plateTopY + 0.004;
  }

  private px(u: number) {
    return (u - 0.5) * (SLAB_W - INSET * 2);
  }

  private pz(v: number) {
    return (v - 0.5) * (SLAB_D - INSET * 2);
  }

  line(u1: number, v1: number, u2: number, v2: number, cls: StrokeClass = "detail") {
    this.out[cls].push(
      this.px(u1), this.y, this.pz(v1),
      this.px(u2), this.y, this.pz(v2),
    );
  }

  /** Axis-aligned rectangle, four segments. */
  rect(u: number, v: number, w: number, h: number, cls: StrokeClass = "detail") {
    this.line(u, v, u + w, v, cls);
    this.line(u + w, v, u + w, v + h, cls);
    this.line(u + w, v + h, u, v + h, cls);
    this.line(u, v + h, u, v, cls);
  }

  /** A short horizontal run — a row of text, a token, a value. */
  bar(u: number, v: number, w: number, cls: StrokeClass = "detail") {
    this.line(u, v, u + w, v, cls);
  }

  /**
   * A leader with an arrowhead, drawn in the face plane. Foreign keys, call
   * arrows and pipeline connectors are all this.
   */
  arrow(u1: number, v1: number, u2: number, v2: number, cls: StrokeClass = "detail") {
    this.line(u1, v1, u2, v2, cls);
    const dx = u2 - u1;
    const dv = v2 - v1;
    const len = Math.hypot(dx, dv) || 1;
    const nx = dx / len;
    const nv = dv / len;
    const head = 0.028;
    // ±30° off the shaft.
    const c = Math.cos(0.52);
    const s = Math.sin(0.52);
    this.line(u2, v2, u2 - head * (nx * c - nv * s), v2 - head * (nx * s + nv * c), cls);
    this.line(u2, v2, u2 - head * (nx * c + nv * s), v2 - head * (-nx * s + nv * c), cls);
  }

  /** A tiny open square — a checkbox, a node, a foreign-key terminal. */
  node(u: number, v: number, r: number, cls: StrokeClass = "detail") {
    this.rect(u - r, v - r, r * 2, r * 2, cls);
  }
}

// ── per-layer content ───────────────────────────────────────────────────
// Rule 2: the perceived-quality lever is information, and each of these has to
// carry enough of it that the layer is identifiable from its drawing alone. A
// plate with six marks on it is a diagram; a plate with a hundred is a part.

/** Six tables with typed columns, joined by foreign keys. */
function drawSchema(f: Face, rand: () => number) {
  const tables = [
    { u: 0.045, v: 0.06, w: 0.235, rows: 6 },
    { u: 0.375, v: 0.03, w: 0.215, rows: 5 },
    { u: 0.7, v: 0.09, w: 0.245, rows: 7 },
    { u: 0.06, v: 0.56, w: 0.225, rows: 5 },
    { u: 0.39, v: 0.6, w: 0.23, rows: 6 },
    { u: 0.72, v: 0.55, w: 0.22, rows: 4 },
  ];

  const anchors: { u: number; v: number }[] = [];

  for (const t of tables) {
    const rowH = 0.048;
    const h = 0.055 + t.rows * rowH;
    f.rect(t.u, t.v, t.w, h, "edge");
    // Header rule under the table name.
    f.line(t.u, t.v + 0.055, t.u + t.w, t.v + 0.055, "edge");
    // The table name itself, as a weight bar rather than as baked text —
    // real type at this scale would be sub-pixel and is not the point.
    f.bar(t.u + 0.02, t.v + 0.03, t.w * (0.35 + rand() * 0.28));

    for (let r = 0; r < t.rows; r++) {
      const y = t.v + 0.055 + rowH * (r + 0.62);
      // Column name, then a shorter type token pushed to the right margin.
      f.bar(t.u + 0.026, y, t.w * (0.24 + rand() * 0.3));
      f.bar(t.u + t.w * 0.68, y, t.w * (0.14 + rand() * 0.14));
      // The key marker in the gutter.
      if (r === 0 || rand() > 0.72) f.node(t.u + 0.014, y, 0.007, "accent");
    }
    anchors.push({ u: t.u + t.w, v: t.v + h * 0.5 });
    anchors.push({ u: t.u, v: t.v + h * 0.5 });
  }

  // Foreign keys, routed as right angles the way a real ERD tool would.
  const fks: [number, number][] = [
    [0, 3], [2, 5], [4, 7], [6, 9], [8, 1], [10, 5],
  ];
  for (const [a, b] of fks) {
    const A = anchors[a % anchors.length];
    const B = anchors[b % anchors.length];
    const midU = (A.u + B.u) * 0.5;
    f.line(A.u, A.v, midU, A.v, "construction");
    f.line(midU, A.v, midU, B.v, "construction");
    f.arrow(midU, B.v, B.u, B.v, "construction");
    f.node(A.u, A.v, 0.006, "accent");
  }
}

/** Policy groups, each holding predicate rows with a role and a USING clause. */
function drawRls(f: Face, rand: () => number) {
  const groups = [
    { v: 0.05, rows: 5, label: 0.42 },
    { v: 0.38, rows: 4, label: 0.34 },
    { v: 0.65, rows: 5, label: 0.5 },
  ];

  for (const g of groups) {
    // Group bracket down the left margin — the convention that says "these
    // rows belong to one policy".
    f.line(0.028, g.v, 0.028, g.v + 0.05 + g.rows * 0.052, "construction");
    f.line(0.028, g.v, 0.055, g.v, "construction");
    f.line(0.028, g.v + 0.05 + g.rows * 0.052, 0.055, g.v + 0.05 + g.rows * 0.052, "construction");

    f.bar(0.07, g.v + 0.022, g.label);
    f.line(0.07, g.v + 0.04, 0.96, g.v + 0.04, "edge");

    for (let r = 0; r < g.rows; r++) {
      const y = g.v + 0.05 + 0.052 * (r + 0.6);
      // The permit/deny box. Filled ones are the accent's only job here.
      f.node(0.082, y, 0.011, rand() > 0.34 ? "accent" : "detail");
      // Role, then the predicate, then the column it reads.
      f.bar(0.115, y, 0.09 + rand() * 0.06);
      f.bar(0.245, y, 0.2 + rand() * 0.22);
      f.bar(0.53, y, 0.12 + rand() * 0.19);
      f.bar(0.79, y, 0.06 + rand() * 0.11);
      // Row rule, kept faint so the rows group rather than stripe.
      if (r < g.rows - 1) f.line(0.07, y + 0.026, 0.96, y + 0.026, "construction");
    }
  }
}

/** Exported functions with argument lists, and the calls between them. */
function drawActions(f: Face, rand: () => number) {
  const blocks = [
    { u: 0.04, v: 0.08, w: 0.26, args: 3 },
    { u: 0.38, v: 0.04, w: 0.24, args: 2 },
    { u: 0.7, v: 0.1, w: 0.26, args: 4 },
    { u: 0.05, v: 0.55, w: 0.25, args: 3 },
    { u: 0.37, v: 0.6, w: 0.26, args: 3 },
    { u: 0.71, v: 0.56, w: 0.25, args: 2 },
  ];

  for (const b of blocks) {
    const h = 0.052 + b.args * 0.044;
    f.rect(b.u, b.v, b.w, h, "edge");
    // The "use server" marker — a filled tick in the corner.
    f.node(b.u + 0.018, b.v + 0.026, 0.008, "accent");
    f.bar(b.u + 0.04, b.v + 0.026, b.w * (0.4 + rand() * 0.34));
    for (let a = 0; a < b.args; a++) {
      const y = b.v + 0.052 + 0.044 * (a + 0.55);
      f.bar(b.u + 0.038, y, b.w * (0.2 + rand() * 0.2));
      f.bar(b.u + b.w * 0.6, y, b.w * (0.16 + rand() * 0.2));
    }
  }

  // The call graph. This is what makes the plate read as behaviour rather
  // than as six more boxes.
  const calls: [number, number][] = [
    [0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5], [1, 4],
  ];
  for (const [a, b] of calls) {
    const A = blocks[a];
    const B = blocks[b];
    const au = A.u + A.w * 0.5;
    const av = A.v + (0.052 + A.args * 0.044) * 0.5;
    const bu = B.u + B.w * 0.5;
    const bv = B.v + (0.052 + B.args * 0.044) * 0.5;
    // Step out of the block before turning, so arrows never cross a body.
    const midV = (av + bv) * 0.5;
    f.line(au, av, au, midV, "construction");
    f.arrow(au, midV, bu, midV, "construction");
    f.line(bu, midV, bu, bv, "construction");
  }
}

/** A dense table under a real chrome — the one plate that has to look usable. */
function drawInterface(f: Face, rand: () => number) {
  // Window chrome.
  f.rect(0.02, 0.02, 0.96, 0.96, "edge");
  f.line(0.02, 0.095, 0.98, 0.095, "edge");
  for (let i = 0; i < 3; i++) f.node(0.045 + i * 0.028, 0.057, 0.008);
  f.bar(0.16, 0.057, 0.2);
  f.bar(0.78, 0.057, 0.09);
  f.bar(0.89, 0.057, 0.06);

  // Sidebar with a selected row.
  f.line(0.185, 0.095, 0.185, 0.98, "edge");
  const navRows = 11;
  for (let i = 0; i < navRows; i++) {
    const y = 0.13 + i * 0.072;
    if (i === 3) {
      // The selected item is the accent's only appearance in the chrome.
      f.rect(0.036, y - 0.026, 0.13, 0.052, "accent");
    }
    f.node(0.052, y, 0.008);
    f.bar(0.072, y, 0.045 + rand() * 0.075);
    if (i === 2 || i === 6) f.line(0.036, y + 0.036, 0.166, y + 0.036, "construction");
  }

  // Toolbar over the table.
  f.line(0.185, 0.175, 0.98, 0.175, "edge");
  f.bar(0.205, 0.137, 0.11);
  f.rect(0.66, 0.12, 0.11, 0.036);
  f.rect(0.79, 0.12, 0.08, 0.036);
  f.rect(0.885, 0.12, 0.075, 0.036, "accent");

  // The table. Twelve rows visible without scrolling is the density claim.
  const cols = [0.205, 0.36, 0.5, 0.62, 0.73, 0.85];
  const rows = 12;
  f.line(0.185, 0.235, 0.98, 0.235, "edge");
  for (const c of cols) {
    f.bar(c, 0.208, 0.055 + rand() * 0.045);
    f.line(c - 0.014, 0.235, c - 0.014, 0.98, "construction");
  }
  for (let r = 0; r < rows; r++) {
    const y = 0.235 + 0.062 * (r + 0.55);
    if (y > 0.95) break;
    for (let c = 0; c < cols.length; c++) {
      f.bar(cols[c], y, 0.04 + rand() * (c === 0 ? 0.09 : 0.055));
    }
    f.line(0.185, y + 0.031, 0.98, y + 0.031, "construction");
    // One row is focused, and one cell inside it carries a caret. It is the
    // only thing on the whole object that will blink.
    if (r === 4) {
      f.line(0.185, y - 0.031, 0.98, y - 0.031, "edge");
      f.line(0.185, y + 0.031, 0.98, y + 0.031, "edge");
      f.line(cols[3] - 0.006, y - 0.02, cols[3] - 0.006, y + 0.02, "accent");
    }
  }
}

/** Build stages, a commit graph, and the one node that is live. */
function drawDeploy(f: Face, rand: () => number) {
  // Pipeline across the top.
  const stages = 6;
  const sw = 0.128;
  for (let i = 0; i < stages; i++) {
    const u = 0.045 + i * 0.157;
    f.rect(u, 0.07, sw, 0.1, "edge");
    f.bar(u + 0.016, 0.1, sw * (0.42 + rand() * 0.3));
    f.bar(u + 0.016, 0.135, sw * (0.28 + rand() * 0.26));
    // The last stage is the live one.
    f.node(u + sw - 0.022, 0.098, 0.009, i === stages - 1 ? "accent" : "detail");
    if (i < stages - 1) f.arrow(u + sw, 0.12, u + 0.157 - 0.004, 0.12, "construction");
  }

  // Commit graph: a trunk, two branches that merge back.
  const trunkU = 0.08;
  f.line(trunkU, 0.26, trunkU, 0.95, "construction");
  const commits = 11;
  for (let i = 0; i < commits; i++) {
    const y = 0.28 + i * 0.062;
    const onBranch = i >= 3 && i <= 6;
    const u = onBranch ? trunkU + 0.055 : trunkU;
    if (onBranch) {
      if (i === 3) f.line(trunkU, y - 0.062, u, y, "construction");
      if (i === 6) f.line(u, y, trunkU, y + 0.062, "construction");
      f.line(u, y, u, Math.min(y + 0.062, 0.28 + 6 * 0.062), "construction");
    }
    f.node(u, y, 0.011, i === commits - 1 ? "accent" : "detail");
    // Hash, then subject, then a timestamp pushed right — monospace metadata
    // is a credibility signal even when it is drawn rather than typeset.
    f.bar(u + 0.028, y, 0.052);
    f.bar(u + 0.095, y, 0.16 + rand() * 0.24);
    f.bar(0.86, y, 0.075);
  }

  // Environment strip down the right, under a rule — the three targets and
  // the SHA each one is currently serving.
  f.line(0.62, 0.235, 0.96, 0.235, "edge");
  for (let i = 0; i < 3; i++) {
    const y = 0.3 + i * 0.075;
    f.node(0.64, y, 0.009, i === 0 ? "accent" : "detail");
    f.bar(0.665, y, 0.075 + rand() * 0.045);
    f.bar(0.8, y, 0.06 + rand() * 0.09);
  }
  // Build metrics below it, drawn as a small bar chart so the plate has one
  // piece of quantitative detail rather than only lists.
  f.line(0.62, 0.58, 0.62, 0.9, "construction");
  f.line(0.62, 0.9, 0.96, 0.9, "construction");
  for (let i = 0; i < 9; i++) {
    const u = 0.645 + i * 0.036;
    const h = 0.07 + rand() * 0.21;
    f.rect(u, 0.9 - h, 0.024, h, i === 8 ? "accent" : "detail");
  }
}

const DRAWERS: Record<PlateId, (f: Face, rand: () => number) => void> = {
  schema: drawSchema,
  rls: drawRls,
  actions: drawActions,
  interface: drawInterface,
  deploy: drawDeploy,
};

// ── assembly ────────────────────────────────────────────────────────────

export interface PlateGeometry {
  id: PlateId;
  index: string;
  label: string;
  description: string;
  /** Height of the plate's underside in each of the three poses. */
  seatedY: number;
  restY: number;
  explodedY: number;
  /** Content and box edges, in plate-local space with the underside at y = 0. */
  segments: Record<StrokeClass, Segments>;
}

export interface StackGeometry {
  plates: PlateGeometry[];
  /** Ground grid and dimension work — fixed in world space, never lifts. */
  world: Record<StrokeClass, Segments>;
  seatedHeight: number;
  restHeight: number;
  explodedHeight: number;
}

function emptyGroups(): Record<StrokeClass, Segments> {
  return { edge: [], detail: [], accent: [], construction: [], grid: [] };
}

/** The twelve edges of a plate's box, in plate-local space. */
function plateEdges(out: Segments) {
  const x = SLAB_W / 2;
  const z = SLAB_D / 2;
  const t = PLATE_T;
  const c: [number, number, number][] = [
    [-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z],
    [-x, t, -z], [x, t, -z], [x, t, z], [-x, t, z],
  ];
  const e: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  for (const [a, b] of e) out.push(...c[a], ...c[b]);
}

const N = PLATE_IDS.length;
const height = (gap: number) => N * PLATE_T + (N - 1) * gap;
/** Underside of plate `i`, centred on the origin so the object never drifts. */
const layerY = (i: number, gap: number) => i * (PLATE_T + gap) - height(gap) / 2;

export function buildStack(): StackGeometry {
  const seatedHeight = height(SEAT_GAP);
  const restHeight = height(REST_GAP);
  const explodedHeight = height(EXPLODE_GAP);

  const plates: PlateGeometry[] = PLATES.map((meta, i) => {
    const segments = emptyGroups();
    plateEdges(segments.edge);
    // Content is authored against the plate's own top face, so a plate can be
    // moved without its drawing sliding off it.
    DRAWERS[meta.id](new Face(segments, 0), mulberry32(0x5e6ad2 + i * 7919));
    return {
      id: meta.id,
      index: meta.index,
      label: meta.label,
      description: meta.description,
      seatedY: layerY(i, SEAT_GAP),
      restY: layerY(i, REST_GAP),
      explodedY: layerY(i, EXPLODE_GAP),
      segments,
    };
  });

  // ── world furniture ──────────────────────────────────────────────────
  // Sized against the rest pose, because that is the frame the still has to
  // compose in and the one every client sees first.
  const world = emptyGroups();
  const bottom = -restHeight / 2;

  // Ground field. Rule 3 wants the object sitting in something rather than on
  // nothing; a construction grid does that and argues "drawing" at the same
  // time. Both renderers fade it radially, so it never ends at a hard edge.
  // Sized so the slab holds roughly two-thirds of the frame's width. A wider
  // field reads as a floor plan the object happens to sit on; this reads as
  // the drawing's own construction ground.
  const gx = 1.5;
  const gz = 1.05;
  const step = 0.1875;
  const gy = bottom - 0.3;
  for (let x = -gx; x <= gx + 1e-6; x += step) {
    world.grid.push(x, gy, -gz, x, gy, gz);
  }
  for (let z = -gz; z <= gz + 1e-6; z += step) {
    world.grid.push(-gx, gy, z, gx, gy, z);
  }

  // Explosion axes — the dashed verticals an exploded assembly drawing always
  // carries, at the slab's four corners. They read as intent even at rest:
  // this object is going to come apart along this line.
  const ax = SLAB_W / 2;
  const az = SLAB_D / 2;
  const top = restHeight / 2;
  for (const [cx, cz] of [
    [-ax, -az], [ax, -az], [ax, az], [-ax, az],
  ]) {
    // Drawn as dashes so it stays construction-weight without a stroke-dasharray
    // the WebGL side would have to reimplement.
    const y0 = bottom - 0.26;
    const y1 = top + 0.5;
    const dash = 0.042;
    for (let y = y0; y < y1; y += dash * 2) {
      world.construction.push(cx, y, cz, cx, Math.min(y + dash, y1), cz);
    }
  }

  // Overall-height dimension on the left, with arrowheads and witness lines.
  const dx = -ax - 0.34;
  const dz = az;
  world.construction.push(
    // witness lines back to the object
    dx, bottom, dz, -ax - 0.02, bottom, dz,
    dx, top, dz, -ax - 0.02, top, dz,
    // the dimension itself
    dx, bottom, dz, dx, top, dz,
  );
  for (const [y, dir] of [[bottom, 1], [top, -1]] as const) {
    world.construction.push(
      dx, y, dz, dx - 0.028, y + 0.055 * dir, dz,
      dx, y, dz, dx + 0.028, y + 0.055 * dir, dz,
    );
  }

  return { plates, world, seatedHeight, restHeight, explodedHeight };
}

// ── isometric projection ────────────────────────────────────────────────
/**
 * True isometric: an orthographic camera on the (1, 1, 1) diagonal with world
 * +Y up. All three axes foreshorten equally by √(2/3), the vertical axis stays
 * vertical on screen, and X and Z leave it at ±30°.
 *
 * `ExplodedStackGL` configures its OrthographicCamera to match exactly, which
 * is what lets the SVG hand over to the canvas without a jump.
 */
export const ISO_X = Math.SQRT1_2; // 1/√2
export const ISO_Y = 1 / Math.sqrt(6);

export function projectIso(x: number, y: number, z: number): [number, number] {
  // SVG's y axis points down, hence the negation.
  return [(x - z) * ISO_X, -(x + 2 * y + z) * ISO_Y];
}

/**
 * Projected extent of every pose the object passes through.
 *
 * The SVG's viewBox and the WebGL camera's frustum are both taken from here,
 * which is what makes the handover invisible — and it is bounded over the
 * exploded pose as well as the rest pose, so the frame never has to grow
 * mid-scroll and the object never appears to shrink as it comes apart.
 */
export function stackBounds(stack: StackGeometry, poses: ("rest" | "exploded")[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const eat = (segs: Segments, dy: number) => {
    for (let i = 0; i < segs.length; i += 3) {
      const [x, y] = projectIso(segs[i], segs[i + 1] + dy, segs[i + 2]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };

  for (const c of STROKE_CLASSES) eat(stack.world[c], 0);
  for (const p of stack.plates) {
    for (const c of STROKE_CLASSES) {
      for (const pose of poses) {
        eat(p.segments[c], pose === "rest" ? p.restY : p.explodedY);
      }
    }
  }

  const pad = 0.1;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

/**
 * How much larger the object can be drawn at rest than when fully separated.
 *
 * The frame has to hold the exploded pose, which is nearly twice the height of
 * the rest pose. Sizing the frame for the worst case and leaving it there
 * would spend that headroom on empty space in the one frame every visitor
 * actually sees. So both renderers draw the rest pose at this scale and relax
 * to 1 as the stack comes apart — the object fills its frame at rest and the
 * frame never has to grow.
 */
/**
 * Projected height of the plate stack alone, for a given seam gap.
 *
 * Under this camera a point lands at `-(x + 2y + z) · ISO_Y`, so a stack `H`
 * tall spanning the slab's footprint covers `(2H + W + D) · ISO_Y` vertically.
 */
function stackScreenHeight(gap: number) {
  return (2 * (height(gap) + PLATE_T) + SLAB_W + SLAB_D) * ISO_Y;
}

/**
 * How much to scale the drawing in each pose so the object fills its frame.
 *
 * The frame is sized once, for the exploded pose, because it must never grow
 * mid-scroll. But the stack is 2.3× shorter at rest and 5.7× shorter once
 * seated, so a fixed scale spends that reserved headroom on empty space in
 * both of the frames a visitor actually stops on. These factors give it back.
 *
 * Bounded deliberately below what would fill the frame exactly: the ground
 * grid scales too, and it is only faded to nothing near the frame's edge — so
 * pushing further starts clipping grid lines while they are still visible.
 */
const FILL = 0.86;
const zoomFor = (gap: number) =>
  Math.min(1.5, (stackBounds(buildStack(), ["rest", "exploded"]).height * FILL) /
    stackScreenHeight(gap));

export const POSE_ZOOM = {
  get rest() {
    return zoomFor(REST_GAP);
  },
  get exploded() {
    return 1;
  },
  get seated() {
    return zoomFor(SEAT_GAP);
  },
};

/**
 * Aspect ratio of the stage's drawing frame, handed to the client wrapper as a
 * prop so the box can be reserved before anything paints (CLS) without pulling
 * this module into the client bundle.
 */
export function stageAspect(): number {
  const b = stackBounds(buildStack(), ["rest", "exploded"]);
  return b.width / b.height;
}
