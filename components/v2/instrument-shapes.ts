/**
 * Point-cloud geometry for the instrument sequence.
 *
 * Four objects — storefront, laptop, dashboard, receipt — each authored as a
 * list of line segments and then resampled to an identical point count. Equal
 * counts are what make the morph possible: particle *n* in the storefront is
 * particle *n* in the laptop, so the transition is a per-vertex interpolation
 * in the shader rather than a simulation on the CPU.
 *
 * Space is y-up, roughly x ∈ [-1, 1] and y ∈ [-1, 1], normalised against the
 * viewport's half-height in the vertex shader. Authoring in segments rather
 * than in a bitmap keeps the objects resolution-independent and lets the point
 * count scale with the device instead of the artwork.
 */

/** x1, y1, x2, y2 */
export type Seg = readonly [number, number, number, number];

export type ShapeId = "storefront" | "laptop" | "dashboard" | "receipt";

export const SHAPE_ORDER: readonly ShapeId[] = [
  "storefront",
  "laptop",
  "dashboard",
  "receipt",
];

/* ── segment helpers ─────────────────────────────────────────────────── */

const s = (x1: number, y1: number, x2: number, y2: number): Seg => [
  x1,
  y1,
  x2,
  y2,
];

/** Four sides of an axis-aligned box given two opposite corners. */
function box(x1: number, y1: number, x2: number, y2: number): Seg[] {
  return [s(x1, y1, x2, y1), s(x2, y1, x2, y2), s(x2, y2, x1, y2), s(x1, y2, x1, y1)];
}

function poly(pts: readonly (readonly [number, number])[], close = true): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    out.push(s(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  if (close && pts.length > 2) {
    const a = pts[pts.length - 1];
    const b = pts[0];
    out.push(s(a[0], a[1], b[0], b[1]));
  }
  return out;
}

/** Horizontal rule — the workhorse for text lines, axes and dividers. */
const rule = (y: number, x1: number, x2: number): Seg => s(x1, y, x2, y);

/** Vertical rule. */
const vrule = (x: number, y1: number, y2: number): Seg => s(x, y1, x, y2);

/** Torn-paper edge. Alternating teeth across a span. */
function zigzag(
  x1: number,
  x2: number,
  teeth: number,
  yLow: number,
  yHigh: number,
): Seg[] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= teeth; i++) {
    pts.push([x1 + ((x2 - x1) * i) / teeth, i % 2 === 0 ? yHigh : yLow]);
  }
  return poly(pts, false);
}

/* ── the four instruments ────────────────────────────────────────────── */

/**
 * The business as it already exists. Deliberately the most "drawn" of the
 * four — awning, signage, glazing bars — so the sequence starts somewhere
 * physical and ends somewhere purely informational.
 */
function storefront(): Seg[] {
  const segs: Seg[] = [
    // Ground and step
    rule(-0.78, -1.0, 1.0),
    rule(-0.82, -0.26, 0.26),
    // Facade
    ...box(-0.68, -0.78, 0.68, 0.3),
    // Awning
    ...poly([
      [-0.82, 0.3],
      [0.82, 0.3],
      [0.65, 0.04],
      [-0.65, 0.04],
    ]),
    // Sign board and its two lines of lettering
    ...box(-0.47, 0.39, 0.47, 0.67),
    rule(0.57, -0.35, 0.35),
    rule(0.48, -0.35, 0.17),
    // Door
    ...box(-0.14, -0.78, 0.14, -0.1),
    vrule(0.0, -0.78, -0.1),
    ...box(0.05, -0.46, 0.1, -0.4),
    // Glazing, left and right
    ...box(-0.58, -0.48, -0.25, -0.06),
    vrule(-0.415, -0.48, -0.06),
    rule(-0.27, -0.58, -0.25),
    ...box(0.25, -0.48, 0.58, -0.06),
    vrule(0.415, -0.48, -0.06),
    rule(-0.27, 0.25, 0.58),
  ];

  // Awning stripes — the trapezoid narrows, so the top and bottom x differ.
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    segs.push(s(-0.82 + 1.64 * t, 0.3, -0.65 + 1.3 * t, 0.04));
  }
  return segs;
}

/**
 * The build. An open laptop in light perspective: the deck fans wider than the
 * hinge, which is what stops it reading as two stacked rectangles.
 */
function laptop(): Seg[] {
  const segs: Seg[] = [
    // Lid and inset screen
    ...box(-0.72, -0.08, 0.72, 0.74),
    ...box(-0.65, -0.01, 0.65, 0.67),
    // Deck
    ...poly([
      [-0.72, -0.08],
      [0.72, -0.08],
      [0.93, -0.52],
      [-0.93, -0.52],
    ]),
    // Front lip
    rule(-0.57, -0.88, 0.88),
    // Trackpad
    ...poly([
      [-0.16, -0.5],
      [0.16, -0.5],
      [0.19, -0.56],
      [-0.19, -0.56],
    ]),
  ];

  // Code on the screen. Varying indent and length is the whole tell.
  const lines: [number, number][] = [
    [-0.58, 0.34],
    [-0.5, 0.12],
    [-0.5, 0.42],
    [-0.42, 0.2],
    [-0.42, 0.05],
    [-0.5, 0.3],
    [-0.58, 0.48],
    [-0.5, 0.16],
    [-0.42, 0.26],
  ];
  lines.forEach(([x1, w], i) => segs.push(rule(0.6 - i * 0.075, x1, x1 + w)));

  // Keyboard — five rows, each a little wider than the one behind it.
  for (let r = 0; r < 5; r++) {
    const t = r / 4;
    const y = -0.14 - t * 0.3;
    const half = 0.6 + t * 0.16;
    for (let k = 0; k < 12; k++) {
      const x = -half + ((2 * half) / 11) * k;
      segs.push(rule(y, x, x + 0.055));
    }
  }
  return segs;
}

/**
 * The instrument running. Chrome, sidebar, tiles, a bar series and a line
 * series — the densest of the four, which is the point: this is the object the
 * client actually looks at every day.
 */
function dashboard(): Seg[] {
  const segs: Seg[] = [
    ...box(-0.94, -0.64, 0.94, 0.64),
    rule(0.46, -0.94, 0.94),
    vrule(-0.58, -0.64, 0.46),
  ];

  // Window controls
  [-0.86, -0.78, -0.7].forEach((x) => segs.push(...box(x - 0.02, 0.53, x + 0.02, 0.57)));

  // Sidebar navigation
  for (let i = 0; i < 6; i++) {
    const y = 0.34 - i * 0.12;
    segs.push(rule(y, -0.88, -0.88 + (i === 0 ? 0.24 : 0.18)));
    segs.push(...box(-0.9, y - 0.018, -0.878, y + 0.018));
  }

  // Three KPI tiles, each with a reading and a label
  const tiles: [number, number][] = [
    [-0.48, -0.06],
    [-0.02, 0.4],
    [0.44, 0.86],
  ];
  tiles.forEach(([x1, x2]) => {
    segs.push(...box(x1, 0.12, x2, 0.4));
    segs.push(rule(0.29, x1 + 0.04, x1 + 0.2));
    segs.push(rule(0.21, x1 + 0.04, x2 - 0.06));
  });

  // Bar series
  const bars = [0.22, 0.36, 0.3, 0.52, 0.44, 0.68, 0.6];
  segs.push(rule(-0.54, -0.48, 0.14));
  bars.forEach((h, i) => {
    const x = -0.46 + i * 0.09;
    segs.push(...box(x, -0.54, x + 0.055, -0.54 + h * 0.62));
  });

  // Line series with plot markers
  const pts: [number, number][] = [];
  const ys = [0.18, 0.32, 0.26, 0.44, 0.38, 0.62, 0.55, 0.78, 0.9];
  ys.forEach((v, i) => pts.push([0.22 + i * 0.08, -0.54 + v * 0.62]));
  segs.push(...poly(pts, false));
  segs.push(rule(-0.54, 0.2, 0.9));
  pts.forEach(([x, y]) => segs.push(...box(x - 0.015, y - 0.015, x + 0.015, y + 0.015)));

  return segs;
}

/**
 * The output. Narrowest and tallest of the four, torn top and bottom, so the
 * silhouette change from the dashboard is unmistakable at a glance.
 */
function receipt(): Seg[] {
  const segs: Seg[] = [
    ...zigzag(-0.38, 0.38, 12, 0.82, 0.88),
    ...zigzag(-0.38, 0.38, 12, -0.88, -0.82),
    vrule(-0.38, -0.85, 0.85),
    vrule(0.38, -0.85, 0.85),
    // Header
    rule(0.7, -0.22, 0.22),
    rule(0.62, -0.14, 0.14),
    rule(0.54, -0.28, 0.28),
  ];

  // Dashed rule under the header
  for (let i = 0; i < 9; i++) {
    const x = -0.28 + i * 0.065;
    segs.push(rule(0.46, x, x + 0.035));
  }

  // Line items — label left, figure right
  const widths = [0.24, 0.19, 0.27, 0.16, 0.22, 0.25, 0.18];
  widths.forEach((w, i) => {
    const y = 0.36 - i * 0.09;
    segs.push(rule(y, -0.3, -0.3 + w));
    segs.push(rule(y, 0.3 - 0.09 - (i % 3) * 0.02, 0.3));
  });

  // Total, doubled to read heavier than the line items
  segs.push(rule(-0.32, -0.3, 0.3));
  segs.push(rule(-0.42, -0.3, -0.08));
  segs.push(rule(-0.428, -0.3, -0.08));
  segs.push(rule(-0.42, 0.14, 0.3));
  segs.push(rule(-0.428, 0.14, 0.3));

  // Barcode
  const bar = [1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3];
  let x = -0.3;
  bar.forEach((w) => {
    for (let k = 0; k < w; k++) segs.push(vrule(x + k * 0.007, -0.74, -0.58));
    x += 0.007 * w + 0.018;
  });

  return segs;
}

const BUILDERS: Record<ShapeId, () => Seg[]> = {
  storefront,
  laptop,
  dashboard,
  receipt,
};

/* ── sampling ────────────────────────────────────────────────────────── */

/** Deterministic PRNG so a given point count always produces the same cloud. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Distribute `count` points across the segment list in proportion to arc
 * length, so density is even rather than per-segment. A small perpendicular
 * jitter keeps the lines from reading as vector strokes — Rule 2's density
 * argument depends on the cloud looking sampled, not drawn.
 */
function sample(segs: Seg[], count: number, rand: () => number): Float32Array {
  const lengths = segs.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1));
  const total = lengths.reduce((a, b) => a + b, 0);
  const out = new Float32Array(count * 2);

  let written = 0;
  for (let i = 0; i < segs.length && written < count; i++) {
    const share = i === segs.length - 1
      ? count - written
      : Math.max(1, Math.round((lengths[i] / total) * count));
    const [x1, y1, x2, y2] = segs[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = lengths[i] || 1e-6;
    const nx = -dy / len;
    const ny = dx / len;

    for (let k = 0; k < share && written < count; k++) {
      const t = (k + rand() * 0.9) / share;
      const j = (rand() - 0.5) * 0.014;
      out[written * 2] = x1 + dx * t + nx * j;
      out[written * 2 + 1] = y1 + dy * t + ny * j;
      written++;
    }
  }

  // Segment rounding can leave a short tail; fold it back onto the first
  // segment rather than shipping zeroed points that collapse to the origin.
  for (; written < count; written++) {
    const [x1, y1, x2, y2] = segs[written % segs.length];
    const t = rand();
    out[written * 2] = x1 + (x2 - x1) * t;
    out[written * 2 + 1] = y1 + (y2 - y1) * t;
  }
  return out;
}

/** All four clouds at a shared point count, ready to upload as buffers. */
export function buildClouds(count: number): Float32Array[] {
  return SHAPE_ORDER.map((id, i) => sample(BUILDERS[id](), count, mulberry32(9871 + i * 733)));
}

/** Per-particle randomness: flight stagger, arc height, lateral wander. */
export function buildSeeds(count: number): Float32Array {
  const rand = mulberry32(4242);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = rand();
    out[i * 3 + 1] = rand();
    out[i * 3 + 2] = rand();
  }
  return out;
}

/** The same geometry as SVG path data, for the no-canvas fallback. */
export function shapePath(id: ShapeId): string {
  return BUILDERS[id]()
    .map(([x1, y1, x2, y2]) => `M${r(x1)} ${r(-y1)}L${r(x2)} ${r(-y2)}`)
    .join("");
}

const r = (n: number) => Math.round(n * 1000) / 1000;
