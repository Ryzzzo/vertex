/**
 * The Machine — geometry.
 *
 * A vertical marble machine in five modules. A request enters at the top as a
 * matte black marble and is carried down through the stack that the hero copy
 * names at `app/v2/page.tsx`: schema, row-level-security, server actions,
 * interface, deploy. At the last module it is fired back up the right-hand side
 * and out of frame, which is the only beat in the sequence that goes fast.
 *
 * This module is the single source of the object. It imports nothing, touches
 * no DOM and no WebGL, and is read by both renderers:
 *
 *   · `MachineFallback.tsx` projects it to inline SVG on the server — the first
 *     paint on every client, the whole picture on a narrow viewport, and the
 *     finished state under reduced motion.
 *   · `MachineGL.tsx` builds solid geometry from the same numbers and animates
 *     it, then dissolves the drawing into the material object.
 *
 * So the fallback is not a degraded hero. It is the hero's blueprint, and the
 * WebGL layer's opening move is to build the object into it.
 *
 * Both renderers see the same camera. `VIEW.aspect` is pinned by CSS onto the
 * frame, which means the camera frustum and the SVG viewBox are the same
 * rectangle at every viewport width and the handoff cannot shift a pixel.
 */

// ── camera ──────────────────────────────────────────────────────────────
/**
 * A long lens from slightly below and slightly to the right. The low angle is
 * what gives the object scale — reference #2 in the brief is shot the same way
 * — and 26° keeps the perspective honest rather than dramatic, which is the
 * difference between a machined object and a video-game asset.
 */
export const VIEW = {
  fovDeg: 26,
  /** Portrait. Pinned onto `.mx-frame` as `aspect-ratio`, so runtime === this. */
  aspect: 0.78,
  /**
   * Distance is set so the object fills about 90% of the frame's height. The
   * remaining air is not waste: it is where the fog, the ground field and the
   * indigo spill live, and a vertical machine standing in a void is the
   * composition reference #1 uses. Filling the width instead would mean a
   * shorter, wider object, which is a different machine.
   */
  eye: [3.0, -2.05, 12.7] as const,
  target: [0, 0.12, 0] as const,
  near: 0.5,
  far: 44,
};

// ── the machine ─────────────────────────────────────────────────────────

/** Panel face plane. Everything the marble touches rides just in front of it. */
export const FACE_Z = 0.09;
/** Panel half-depth. Panels span −PANEL_D … +FACE_Z about their own plane. */
export const PANEL_D = 0.18;
/** Where the track and the marble sit, clear of the faces. */
export const TRACK_Z = 0.2;

export const PANEL_W = 2.2;
export const PANEL_H = 0.72;
/** Vertical centre-to-centre. The 0.14 that is left over is where light gets out. */
export const MODULE_PITCH = 0.86;

/**
 * Big enough to read. At 0.078 the marble was nine pixels in a 450px frame —
 * present, and invisible. The subject of the whole animation has to be legible
 * at the size the hero actually renders at, not at the size the geometry looks
 * right in isolation.
 */
export const MARBLE_R = 0.105;

/** Uprights that carry the panels, and the plinth the whole thing stands on. */
export const RAIL_X = 1.18;
export const RAIL_W = 0.15;
export const RAIL_D = 0.36;
export const RAIL_TOP = 2.42;
export const RAIL_BOTTOM = -2.18;

export const PLINTH_W = 2.96;
export const PLINTH_H = 0.42;
export const PLINTH_D = 1.2;
export const PLINTH_Y = -2.18;

/** The launch rail sits outboard of everything, so the exit path is clear. */
export const LAUNCH_X = 1.56;

export const MODULE_IDS = [
  "schema",
  "rls",
  "actions",
  "interface",
  "deploy",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export type ModuleDef = {
  id: ModuleId;
  index: string;
  /** The visible callout. Kept short — it sits in a 9rem column. */
  label: string;
  /** Shown on hover and focus. One sentence, no jargon the client has not met. */
  copy: string;
  /** Mirrored onto the terminal screen and into a live line under the stage. */
  readout: string;
  /** Panel centre in world Y. */
  y: number;
};

/**
 * Top to bottom. The order is the order the request travels, which is also the
 * order the copy lists, which is also the order a build actually happens in —
 * the schema exists before there is anything to authorise.
 */
export const MODULES: readonly ModuleDef[] = [
  {
    id: "schema",
    index: "01",
    label: "schema",
    copy: "Tables and foreign keys. The shape of the business, written down once so nothing has to be remembered twice.",
    readout: "insert into requests … 1 row",
    y: MODULE_PITCH * 2,
  },
  {
    id: "rls",
    index: "02",
    label: "rls",
    copy: "Row-level security. Who may see which row, decided in the database rather than hoped for in the app.",
    readout: "policy org_members … pass",
    y: MODULE_PITCH,
  },
  {
    id: "actions",
    index: "03",
    label: "server actions",
    copy: "The operations the business actually performs, running on the server where they cannot be tampered with.",
    readout: "action quote.issue … ok",
    y: 0,
  },
  {
    id: "interface",
    index: "04",
    label: "interface",
    copy: "The screen the work gets done on, every day, by people who did not build it and should not have to think about it.",
    readout: "select * from quotes … 1 row",
    y: -MODULE_PITCH,
  },
  {
    id: "deploy",
    index: "05",
    label: "deploy",
    copy: "Built, checked and shipped. The commit that is live right now, and the one the client owns outright.",
    readout: "deploy vertexapps … live",
    y: -MODULE_PITCH * 2,
  },
];

/**
 * Stroke classes. Both renderers map these to a weight and an opacity, so the
 * drawing and the object read as the same thing rather than as two things that
 * happen to share coordinates.
 */
export type StrokeClass =
  | "edge" // silhouettes — panels, rails, plinth
  | "detail" // machined content: pockets, fasteners, gear teeth, bezels
  | "track" // the route the marble takes, drawn as rails
  | "accent" // the indigo marks: LEDs, the gate, light escaping the gaps
  | "screen" // the one green thing on the object
  | "construction"; // leaders, centre axis, the ground line

export const STROKE_CLASSES: readonly StrokeClass[] = [
  "construction",
  "detail",
  "track",
  "edge",
  "accent",
  "screen",
];

/** A flat run of 3D line segments: [x1,y1,z1, x2,y2,z2, …]. */
export type Segments = number[];
export type Drawing = Record<StrokeClass, Segments>;

const emptyDrawing = (): Drawing => ({
  edge: [],
  detail: [],
  track: [],
  accent: [],
  screen: [],
  construction: [],
});

// ── small geometry helpers ──────────────────────────────────────────────

export type Vec2 = readonly [number, number];

const TAU = Math.PI * 2;

/**
 * A rounded rectangle as a closed polyline, centred on the origin. Both
 * renderers consume this: the SVG strokes it, three.js extrudes it. One
 * function means a pocket can never be a different shape in the two.
 */
export function roundRect(
  w: number,
  h: number,
  r: number,
  seg = 4,
): Vec2[] {
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw, hh);
  const pts: Vec2[] = [];
  const corners: [number, number, number][] = [
    [hw - rad, hh - rad, 0],
    [-hw + rad, hh - rad, Math.PI / 2],
    [-hw + rad, -hh + rad, Math.PI],
    [hw - rad, -hh + rad, -Math.PI / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
  }
  return pts;
}

/** A circle as a closed polyline. */
export function circle(r: number, seg = 24): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/**
 * A spur gear outline. Trapezoidal teeth rather than a true involute — at the
 * size these render, the involute's extra fidelity is invisible and its extra
 * points are not.
 */
export function gearProfile(r: number, teeth: number, depth = 0.055): Vec2[] {
  const pts: Vec2[] = [];
  const step = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const p = (k: number, rad: number) =>
      pts.push([Math.cos(a + k * step) * rad, Math.sin(a + k * step) * rad]);
    p(0.0, r - depth);
    p(0.14, r - depth);
    p(0.26, r);
    p(0.5, r);
    p(0.62, r - depth);
    p(0.86, r - depth);
  }
  return pts;
}

// ── writing polylines into the 3D drawing ───────────────────────────────

/** Append a closed polyline living on a constant-z plane, offset to (ox, oy). */
function pushClosed(
  out: Segments,
  pts: readonly Vec2[],
  ox: number,
  oy: number,
  z: number,
) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(a[0] + ox, a[1] + oy, z, b[0] + ox, b[1] + oy, z);
  }
}

/** Append an open polyline in full 3D. */
function pushPath(out: Segments, pts: readonly (readonly number[])[]) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
}

const seg3 = (
  out: Segments,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
) => out.push(ax, ay, az, bx, by, bz);

/** A box drawn as twelve edges — the only way a solid reads as solid in line. */
function pushBox(
  out: Segments,
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
  for (const z of [z0, z1]) {
    seg3(out, x0, y0, z, x1, y0, z);
    seg3(out, x1, y0, z, x1, y1, z);
    seg3(out, x1, y1, z, x0, y1, z);
    seg3(out, x0, y1, z, x0, y0, z);
  }
  seg3(out, x0, y0, z0, x0, y0, z1);
  seg3(out, x1, y0, z0, x1, y0, z1);
  seg3(out, x1, y1, z0, x1, y1, z1);
  seg3(out, x0, y1, z0, x0, y1, z1);
}

// ── the face of each module ─────────────────────────────────────────────

/**
 * What is actually machined into each panel. These are read twice: as polylines
 * for the drawing, and as `THREE.Shape` holes for the extruded panel, which is
 * what makes the indigo behind the panel spill through in exactly the places
 * the drawing says it should.
 */
export type Pocket = {
  /** Centre in panel-local coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  /** True where the pocket goes all the way through and light comes out. */
  through: boolean;
};

export type ModuleFace = {
  pockets: Pocket[];
  /** Fastener centres, panel-local. Drawn as small circles, built as instances. */
  fasteners: Vec2[];
  /** Extra machined linework that is not a pocket. */
  detail: Segments;
  accent: Segments;
  /** Only the Interface module writes here. There is one green thing. */
  screen: Segments;
};

/** Corner fasteners, on every panel, at a constant inset. */
function cornerFasteners(): Vec2[] {
  const ix = PANEL_W / 2 - 0.085;
  const iy = PANEL_H / 2 - 0.085;
  return [
    [-ix, iy],
    [ix, iy],
    [-ix, -iy],
    [ix, -iy],
  ];
}

/** The blank nameplate every module carries, top-left. The words are DOM text. */
function nameplate(detail: Segments, y: number) {
  const px = -PANEL_W / 2 + 0.34;
  const py = PANEL_H / 2 - 0.15;
  pushClosed(detail, roundRect(0.46, 0.115, 0.02, 2), px, y + py, FACE_Z + 0.006);
  // Two engraved rules standing in for the etched line under a real nameplate.
  for (const k of [-0.018, 0.014]) {
    seg3(
      detail,
      px - 0.17,
      y + py + k,
      FACE_Z + 0.007,
      px + 0.17,
      y + py + k,
      FACE_Z + 0.007,
    );
  }
}

/** The status LED every module carries. Indigo, and the only light on the face. */
function led(accent: Segments, y: number, x = PANEL_W / 2 - 0.2) {
  pushClosed(accent, circle(0.026, 10), x, y + PANEL_H / 2 - 0.15, FACE_Z + 0.008);
  pushClosed(accent, circle(0.046, 12), x, y + PANEL_H / 2 - 0.15, FACE_Z + 0.008);
}

export const SLOT_COUNT = 7;
/** Which slot the marble actually falls through. */
export const SLOT_DROP = 1;
const slotX = (i: number) => -0.66 + i * 0.22;

export const GATE_X = 0.62;
export const GATE_W = 0.3;
export const GATE_H = 0.34;

export const ARM_HUB: Vec2 = [-0.02, 0.02];
export const ARM_R = 0.34;
export const ARM_CATCH_DEG = 52;
export const ARM_RELEASE_DEG = 212;

export const SCREEN_W = 0.86;
export const SCREEN_H = 0.34;
export const SCREEN_X = -0.26;
export const SCREEN_Y = 0.03;

function faceFor(id: ModuleId): ModuleFace {
  const detail: Segments = [];
  const accent: Segments = [];
  const screen: Segments = [];
  const pockets: Pocket[] = [];
  const fasteners = cornerFasteners();

  switch (id) {
    case "schema": {
      // A slotted plate. Seven slots, one of which the marble goes through —
      // which is the whole idea of a schema: a shape that only accepts what
      // fits it.
      for (let i = 0; i < SLOT_COUNT; i++) {
        const x = slotX(i);
        const through = i === SLOT_DROP;
        pockets.push({
          x,
          y: -0.06,
          w: through ? 0.26 : 0.086,
          h: 0.3,
          r: 0.04,
          through,
        });
      }
      // Foreign-key rules tying the slots together — the drawing's way of
      // saying these columns are related rather than merely adjacent.
      for (const [a, b, k] of [
        [0, 2, 0.14],
        [3, 5, 0.19],
        [1, 6, 0.24],
      ] as const) {
        const y0 = -0.06 + 0.15 + k;
        seg3(detail, slotX(a), y0 - 0.02, FACE_Z + 0.004, slotX(a), y0, FACE_Z + 0.004);
        seg3(detail, slotX(a), y0, FACE_Z + 0.004, slotX(b), y0, FACE_Z + 0.004);
        seg3(detail, slotX(b), y0, FACE_Z + 0.004, slotX(b), y0 - 0.02, FACE_Z + 0.004);
      }
      break;
    }

    case "rls": {
      // The gate itself, and a pocket behind it so the indigo reads through the
      // opening the moment the shutters part.
      pockets.push({ x: GATE_X, y: -0.02, w: GATE_W, h: GATE_H, r: 0.03, through: true });
      pushClosed(accent, roundRect(GATE_W + 0.07, GATE_H + 0.07, 0.04, 3), GATE_X, -0.02, FACE_Z + 0.006);
      // Predicate rows. Five of them, dense, left of the gate — the thing being
      // evaluated, drawn as a stack of short rules like a policy listing.
      for (let i = 0; i < 5; i++) {
        const py = 0.11 - i * 0.055;
        const w = [0.5, 0.38, 0.44, 0.3, 0.41][i];
        seg3(detail, -0.86, py, FACE_Z + 0.004, -0.86 + w, py, FACE_Z + 0.004);
        seg3(detail, -0.9, py, FACE_Z + 0.004, -0.885, py, FACE_Z + 0.004);
      }
      pockets.push({ x: 0.16, y: -0.02, w: 0.2, h: 0.4, r: 0.05, through: false });
      break;
    }

    case "actions": {
      // The hub the arm turns on, and two gears behind it. The gears are the
      // only thing on the object that moves when nothing is happening.
      pushClosed(detail, circle(0.075, 16), ARM_HUB[0], ARM_HUB[1], FACE_Z + 0.006);
      pushClosed(detail, circle(0.032, 12), ARM_HUB[0], ARM_HUB[1], FACE_Z + 0.007);
      // Blind, not through. The gears sit in front of these, and a lit opening
      // behind a gear turns the gear into a silhouette — the one part of the
      // machine whose teeth are the point.
      pockets.push({ x: -0.72, y: 0, w: 0.44, h: 0.46, r: 0.07, through: false });
      pockets.push({ x: 0.72, y: 0, w: 0.36, h: 0.4, r: 0.06, through: false });
      // The arc the marble is carried through, drawn as construction so the
      // route is legible before anything has moved.
      break;
    }

    case "interface": {
      // A recessed terminal, its bezel, and a strip of keys. The screen is the
      // one green thing on the machine.
      pushClosed(detail, roundRect(SCREEN_W + 0.06, SCREEN_H + 0.06, 0.03, 3), SCREEN_X, SCREEN_Y, FACE_Z + 0.005);
      pushClosed(screen, roundRect(SCREEN_W, SCREEN_H, 0.02, 3), SCREEN_X, SCREEN_Y, FACE_Z + 0.007);
      // Four ruled lines standing in for a readout. The words themselves are
      // real text in the DOM, under the stage — never baked into the picture
      // (WCAG 1.4.5) — and the canvas draws them into the screen texture.
      for (let i = 0; i < 4; i++) {
        const ry = SCREEN_Y + 0.11 - i * 0.062;
        const rw = [0.62, 0.44, 0.5, 0.28][i];
        seg3(screen, SCREEN_X - 0.36, ry, FACE_Z + 0.008, SCREEN_X - 0.36 + rw, ry, FACE_Z + 0.008);
      }
      for (const fx of [-0.72, 0.2]) {
        pushClosed(detail, circle(0.016, 8), SCREEN_X + fx, SCREEN_Y + 0.21, FACE_Z + 0.006);
        pushClosed(detail, circle(0.016, 8), SCREEN_X + fx, SCREEN_Y - 0.21, FACE_Z + 0.006);
      }
      for (let i = 0; i < 8; i++) {
        pushClosed(detail, roundRect(0.055, 0.055, 0.012, 1), 0.38 + (i % 4) * 0.075, -0.06 + Math.floor(i / 4) * 0.085, FACE_Z + 0.005);
      }
      pockets.push({ x: 0.66, y: 0.16, w: 0.14, h: 0.1, r: 0.03, through: true });
      break;
    }

    case "deploy": {
      // A vent grille, the launch breech, and the cowl the marble leaves by.
      for (let i = 0; i < 8; i++) {
        pockets.push({
          x: -0.74 + i * 0.1,
          y: -0.02,
          w: 0.05,
          h: 0.36,
          r: 0.024,
          through: i % 2 === 0,
        });
      }
      pushClosed(detail, roundRect(0.4, 0.42, 0.06, 3), 0.5, -0.02, FACE_Z + 0.005);
      pushClosed(accent, circle(0.09, 16), 0.5, -0.02, FACE_Z + 0.008);
      pushClosed(detail, circle(0.13, 18), 0.5, -0.02, FACE_Z + 0.007);
      // Torque marks around the breech: six ticks, the sort of thing that is
      // only ever on a real machined part.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.26;
        seg3(
          detail,
          0.5 + Math.cos(a) * 0.155,
          -0.02 + Math.sin(a) * 0.155,
          FACE_Z + 0.006,
          0.5 + Math.cos(a) * 0.185,
          -0.02 + Math.sin(a) * 0.185,
          FACE_Z + 0.006,
        );
      }
      break;
    }
  }

  return { pockets, fasteners, detail, accent, screen };
}

/** Faces are computed once. Nothing in here depends on time or on the client. */
export const FACES: Record<ModuleId, ModuleFace> = MODULE_IDS.reduce(
  (acc, id) => {
    acc[id] = faceFor(id);
    return acc;
  },
  {} as Record<ModuleId, ModuleFace>,
);

// ── the route ───────────────────────────────────────────────────────────

export type Pt3 = readonly [number, number, number];

const Y = (i: number) => MODULES[i].y;

/**
 * The marble's route, in three runs. It is three rather than one because the
 * arm carries the marble across the gap in the middle and the launch tube fires
 * it up the outside — in both places the rails stop, and a rail that continued
 * through would be drawing a route the marble does not take.
 */
export const RUN_A: Pt3[] = [
  [slotX(SLOT_DROP), Y(0) + 1.06, TRACK_Z],
  [slotX(SLOT_DROP), Y(0) + 0.4, TRACK_Z],
  [slotX(SLOT_DROP), Y(0) - 0.3, TRACK_Z],
  [-0.1, Y(0) - 0.52, TRACK_Z],
  [0.36, Y(1) + 0.3, TRACK_Z],
  [GATE_X, Y(1) + 0.14, TRACK_Z],
  [GATE_X, Y(1) - 0.12, TRACK_Z],
  [GATE_X - 0.06, Y(1) - 0.46, TRACK_Z],
  [
    ARM_HUB[0] + Math.cos((ARM_CATCH_DEG * Math.PI) / 180) * ARM_R,
    Y(2) + ARM_HUB[1] + Math.sin((ARM_CATCH_DEG * Math.PI) / 180) * ARM_R,
    TRACK_Z,
  ],
];

export const RUN_B: Pt3[] = [
  [
    ARM_HUB[0] + Math.cos((ARM_RELEASE_DEG * Math.PI) / 180) * ARM_R,
    Y(2) + ARM_HUB[1] + Math.sin((ARM_RELEASE_DEG * Math.PI) / 180) * ARM_R,
    TRACK_Z,
  ],
  [-0.5, Y(2) - 0.42, TRACK_Z],
  [SCREEN_X - 0.3, Y(3) + SCREEN_Y + 0.02, TRACK_Z],
  [SCREEN_X + 0.36, Y(3) + SCREEN_Y - 0.08, TRACK_Z],
  [0.5, Y(3) - 0.34, TRACK_Z],
  [0.5, Y(4) + 0.14, TRACK_Z],
  [0.5, Y(4) - 0.02, TRACK_Z],
];

/** The exit. Straight, outboard of the rails, and the one fast move. */
export const RUN_C: Pt3[] = [
  [0.5, Y(4) - 0.02, TRACK_Z],
  [LAUNCH_X, Y(4) + 0.1, TRACK_Z],
  [LAUNCH_X, Y(4) + 0.6, TRACK_Z],
  [LAUNCH_X, RAIL_TOP + 1.4, TRACK_Z],
];

/**
 * The whole journey as one polyline, including the arc the arm carries the
 * marble through and the drop from the mouth into the first slot. The canvas
 * animates along this; the SVG turns it into an `offset-path`, which is how the
 * no-JavaScript state gets a moving marble for nothing.
 */
export function fullRoute(): {
  pts: Pt3[];
  /** Index range the arm carries the marble through, so the arm can track it. */
  armFrom: number;
  armTo: number;
  /** Where the marble stops being a marble and becomes something that leaves. */
  launchFrom: number;
} {
  const entry: Pt3[] = [
    [slotX(SLOT_DROP), RAIL_TOP + 0.42, TRACK_Z],
    [slotX(SLOT_DROP), RAIL_TOP + 0.1, TRACK_Z],
  ];
  const arm: Pt3[] = [];
  const gy = Y(2);
  for (let i = 1; i < 18; i++) {
    const a =
      ((ARM_CATCH_DEG + ((ARM_RELEASE_DEG - ARM_CATCH_DEG) * i) / 18) * Math.PI) / 180;
    arm.push([
      ARM_HUB[0] + Math.cos(a) * ARM_R,
      gy + ARM_HUB[1] + Math.sin(a) * ARM_R,
      TRACK_Z,
    ]);
  }
  const a = sampleRun(RUN_A);
  const b = sampleRun(RUN_B);
  const c = sampleRun(RUN_C);
  return {
    pts: [...entry, ...a, ...arm, ...b, ...c],
    armFrom: entry.length + a.length - 1,
    armTo: entry.length + a.length + arm.length,
    launchFrom: entry.length + a.length + arm.length + b.length - 1,
  };
}

/**
 * Which module the marble is inside, as a range of normalised distance along
 * the route. Derived from the route rather than declared beside it: a hand-typed
 * table of stage timings is a second source of truth that drifts the moment a
 * control point moves, and it drifted twice before this replaced it.
 *
 * Read by three things — the canvas (which LED is lit, which line is on the
 * screen), the drawing's callouts (the same, in CSS, with no JavaScript), and
 * nothing else.
 */
export function moduleWindows(): { from: number; to: number }[] {
  const route = fullRoute();
  const table = arcTable(route.pts);
  const win = MODULES.map(() => ({ from: 1, to: 0 }));
  for (let i = 0; i < route.pts.length; i++) {
    const u = table.cum[i] / table.total;
    // Past the breech the marble is leaving, and leaving is Deploy's business
    // however high up the frame it has got to.
    let k = MODULES.length - 1;
    if (i < route.launchFrom) {
      let best = Infinity;
      MODULES.forEach((m, j) => {
        const d = Math.abs(route.pts[i][1] - m.y);
        if (d < best) {
          best = d;
          k = j;
        }
      });
    }
    if (u < win[k].from) win[k].from = u;
    if (u > win[k].to) win[k].to = u;
  }
  return win;
}

export const MODULE_WINDOWS = moduleWindows();

/**
 * Where the descent ends and the launch begins, as normalised distance.
 *
 * It matters because the launch run is nearly half the route's *length* and
 * ought to be a sixth of its *duration* — it is the one fast move in the
 * sequence. Parameterising the whole journey by arc length put the marble in
 * the Deploy module for the last half of the scroll, staring at a barrel.
 * Both renderers remap around this number: the descent gets most of the track,
 * the exit gets a little, and the exit therefore reads as quick.
 */
export const LAUNCH_U = (() => {
  const r = fullRoute();
  const t = arcTable(r.pts);
  return Math.round((t.cum[r.launchFrom] / t.total) * 1000) / 1000;
})();

/** Where the descent hands over to the launch, as a fraction of the scroll track. */
export const LAUNCH_P = 0.82;
/** The marble starts moving here, giving the built machine a beat to be looked at. */
export const START_P = 0.05;
export const END_P = 0.97;

/** Scroll progress → normalised distance along the route. One curve, two renderers. */
export function routeAt(p: number): number {
  if (p <= START_P) return 0;
  if (p >= END_P) return 1;
  if (p < LAUNCH_P) {
    return ((p - START_P) / (LAUNCH_P - START_P)) * LAUNCH_U;
  }
  return LAUNCH_U + ((p - LAUNCH_P) / (END_P - LAUNCH_P)) * (1 - LAUNCH_U);
}

/** Which module the marble is inside at normalised distance `u`. */
export function moduleAt(u: number): number {
  for (let i = MODULE_WINDOWS.length - 1; i >= 0; i--) {
    if (u >= MODULE_WINDOWS[i].from) return i;
  }
  return 0;
}

// ── the drawing ─────────────────────────────────────────────────────────

/** Catmull-Rom through the control points, so the rails read as bent metal. */
export function sampleRun(pts: Pt3[], per = 9): Pt3[] {
  if (pts.length < 2) return pts.slice();
  const out: Pt3[] = [];
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, c2: number, d: number) =>
        0.5 *
        (2 * b + (c2 - a) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([
        c(p0[0], p1[0], p2[0], p3[0]),
        c(p0[1], p1[1], p2[1], p3[1]),
        c(p0[2], p1[2], p2[2], p3[2]),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Arc length table, so the marble travels at an even speed rather than an even t. */
export function arcTable(pts: Pt3[]): { pts: Pt3[]; cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  return { pts, cum, total: cum[cum.length - 1] || 1 };
}

/** Position at normalised distance along a sampled run. */
export function atDistance(
  table: { pts: Pt3[]; cum: number[]; total: number },
  u: number,
): Pt3 {
  const d = Math.max(0, Math.min(1, u)) * table.total;
  let i = 1;
  while (i < table.cum.length - 1 && table.cum[i] < d) i++;
  const a = table.pts[i - 1];
  const b = table.pts[i];
  const span = table.cum[i] - table.cum[i - 1] || 1;
  const t = (d - table.cum[i - 1]) / span;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export type MachineDrawing = Drawing & {
  /** Where the marble sits in the drawing: at the mouth, before anything runs. */
  marble: Pt3;
};

/**
 * Everything the object is, as line segments. Roughly 1,500 marks, none of them
 * decorative — Rule 2. The number matters: a hundred-mark version of this
 * drawing reads as a diagram of a machine, and this one reads as the machine.
 */
export function buildDrawing(): MachineDrawing {
  const d = emptyDrawing();

  // Uprights.
  for (const sx of [-1, 1]) {
    pushBox(d.edge, sx * RAIL_X, (RAIL_TOP + RAIL_BOTTOM) / 2, 0, RAIL_W, RAIL_TOP - RAIL_BOTTOM, RAIL_D);
    // Bolt ladder up the outside — the detail that says this was assembled.
    for (let i = 0; i < 11; i++) {
      const y = RAIL_BOTTOM + 0.22 + i * ((RAIL_TOP - RAIL_BOTTOM - 0.44) / 10);
      pushClosed(d.detail, circle(0.021, 8), sx * RAIL_X, y, RAIL_D / 2 + 0.001);
    }
  }

  // Head casting and the entry funnel.
  pushBox(d.edge, 0, RAIL_TOP - 0.12, 0, PANEL_W + 0.24, 0.26, RAIL_D);
  const fx = slotX(SLOT_DROP);
  pushPath(d.edge, [
    [fx - 0.26, RAIL_TOP + 0.34, TRACK_Z],
    [fx - 0.09, RAIL_TOP - 0.02, TRACK_Z],
    [fx - 0.09, RAIL_TOP - 0.3, TRACK_Z],
  ]);
  pushPath(d.edge, [
    [fx + 0.26, RAIL_TOP + 0.34, TRACK_Z],
    [fx + 0.09, RAIL_TOP - 0.02, TRACK_Z],
    [fx + 0.09, RAIL_TOP - 0.3, TRACK_Z],
  ]);

  // Plinth: a chamfered slab, drawn as two boxes so the chamfer reads.
  pushBox(d.edge, 0, PLINTH_Y - PLINTH_H / 2, 0, PLINTH_W, PLINTH_H, PLINTH_D);
  pushBox(d.edge, 0, PLINTH_Y - PLINTH_H + 0.06, 0, PLINTH_W + 0.16, 0.12, PLINTH_D + 0.16);
  for (let i = 0; i < 6; i++) {
    const x = -1.05 + i * 0.42;
    pushClosed(d.detail, circle(0.028, 8), x, PLINTH_Y - 0.1, PLINTH_D / 2 + 0.001);
  }

  // The ground the machine stands on. Kept tight to the plinth: a field that
  // ran to ±2.6 survived the radial mask only in fragments, which read as
  // debris scattered round the base rather than as a floor.
  const groundY = PLINTH_Y - PLINTH_H - 0.05;
  for (let i = 0; i < 7; i++) {
    const z = -0.55 + i * 0.36;
    seg3(d.construction, -1.95, groundY, z, 1.95, groundY, z);
  }
  for (let i = 0; i < 11; i++) {
    const x = -1.95 + i * 0.39;
    seg3(d.construction, x, groundY, -0.55, x, groundY, 1.61);
  }

  // Panels.
  for (const m of MODULES) {
    const face = FACES[m.id];
    // Silhouette, front and back, plus the four corners joining them — a panel
    // has to read as a plate with thickness, not as a rectangle.
    const outline = roundRect(PANEL_W, PANEL_H, 0.055, 4);
    pushClosed(d.edge, outline, 0, m.y, FACE_Z);
    pushClosed(d.detail, outline, 0, m.y, FACE_Z - PANEL_D);
    for (let i = 0; i < outline.length; i += 4) {
      const p = outline[i];
      seg3(d.edge, p[0], m.y + p[1], FACE_Z, p[0], m.y + p[1], FACE_Z - PANEL_D);
    }

    for (const p of face.pockets) {
      const pr = roundRect(p.w, p.h, p.r, 3);
      pushClosed(p.through ? d.accent : d.detail, pr, p.x, m.y + p.y, FACE_Z + 0.002);
      // A pocket has a floor. Drawing it is the difference between a machined
      // recess and a printed rectangle.
      pushClosed(d.detail, roundRect(p.w - 0.018, p.h - 0.018, Math.max(0.008, p.r - 0.009), 3), p.x, m.y + p.y, FACE_Z - (p.through ? PANEL_D : 0.05));
    }

    for (const f of face.fasteners) {
      pushClosed(d.detail, circle(0.022, 8), f[0], m.y + f[1], FACE_Z + 0.004);
      pushClosed(d.detail, circle(0.011, 6), f[0], m.y + f[1], FACE_Z + 0.006);
    }

    nameplate(d.detail, m.y);
    led(d.accent, m.y);

    // Light escaping the gap under each panel — reference #3's move, and the
    // only reason a stack of plates reads as lit from within.
    if (m.id !== "deploy") {
      seg3(d.accent, -PANEL_W / 2 + 0.1, m.y - PANEL_H / 2 - 0.07, FACE_Z - 0.02, PANEL_W / 2 - 0.1, m.y - PANEL_H / 2 - 0.07, FACE_Z - 0.02);
    }

    for (let i = 0; i < face.detail.length; i += 3) {
      d.detail.push(face.detail[i], face.detail[i + 1] + m.y, face.detail[i + 2]);
    }
    for (let i = 0; i < face.accent.length; i += 3) {
      d.accent.push(face.accent[i], face.accent[i + 1] + m.y, face.accent[i + 2]);
    }
    for (let i = 0; i < face.screen.length; i += 3) {
      d.screen.push(face.screen[i], face.screen[i + 1] + m.y, face.screen[i + 2]);
    }
  }

  // Gears, on the Server Actions module.
  const gy = Y(2);
  pushClosed(d.detail, gearProfile(0.185, 18), -0.72, gy, FACE_Z - 0.03);
  pushClosed(d.detail, circle(0.06, 12), -0.72, gy, FACE_Z - 0.03);
  pushClosed(d.detail, gearProfile(0.125, 13), 0.72, gy + 0.02, FACE_Z - 0.03);
  pushClosed(d.detail, circle(0.042, 10), 0.72, gy + 0.02, FACE_Z - 0.03);

  // The arm, at rest, and the arc it sweeps.
  const armA = (ARM_CATCH_DEG * Math.PI) / 180;
  pushClosed(
    d.edge,
    roundRect(ARM_R + 0.16, 0.09, 0.04, 2).map(
      ([px, py]) =>
        [
          Math.cos(armA) * (px + ARM_R / 2 - 0.06) - Math.sin(armA) * py,
          Math.sin(armA) * (px + ARM_R / 2 - 0.06) + Math.cos(armA) * py,
        ] as Vec2,
    ),
    ARM_HUB[0],
    gy + ARM_HUB[1],
    FACE_Z + 0.05,
  );
  for (let i = 0; i <= 26; i++) {
    const a = armA + (i / 26) * ((ARM_RELEASE_DEG - ARM_CATCH_DEG) * Math.PI) / 180;
    const b = armA + ((i + 1) / 26) * ((ARM_RELEASE_DEG - ARM_CATCH_DEG) * Math.PI) / 180;
    if (i % 2) continue;
    seg3(
      d.construction,
      ARM_HUB[0] + Math.cos(a) * ARM_R,
      gy + ARM_HUB[1] + Math.sin(a) * ARM_R,
      TRACK_Z,
      ARM_HUB[0] + Math.cos(b) * ARM_R,
      gy + ARM_HUB[1] + Math.sin(b) * ARM_R,
      TRACK_Z,
    );
  }

  // Rails: two of them, a marble's width apart, for all three runs.
  for (const run of [RUN_A, RUN_B, RUN_C]) {
    const pts = sampleRun(run);
    for (const dz of [-0.055, 0.055]) {
      pushPath(
        d.track,
        pts.map((p) => [p[0], p[1], p[2] + dz]),
      );
    }
    // Sleepers, so the two rails read as one track.
    for (let i = 0; i < pts.length; i += 6) {
      const p = pts[i];
      seg3(d.track, p[0], p[1], p[2] - 0.055, p[0], p[1], p[2] + 0.055);
    }
  }

  // The launch cowl the marble leaves through.
  pushClosed(d.edge, circle(0.115, 14), LAUNCH_X, RAIL_TOP + 0.3, TRACK_Z);
  pushClosed(d.detail, circle(0.078, 12), LAUNCH_X, RAIL_TOP + 0.3, TRACK_Z);

  // Centre axis and the module leaders — construction, so the drawing reads as
  // a drawing before it reads as a machine.
  seg3(d.construction, 0, RAIL_BOTTOM - 0.5, 0, 0, RAIL_TOP + 0.7, 0);
  for (const m of MODULES) {
    seg3(d.construction, PANEL_W / 2 + 0.04, m.y, FACE_Z, PANEL_W / 2 + 0.44, m.y, FACE_Z);
    seg3(d.construction, -PANEL_W / 2 - 0.04, m.y, FACE_Z, -PANEL_W / 2 - 0.2, m.y, FACE_Z);
  }

  // The marble is not drawn into the linework: it is its own element in both
  // renderers, because it is the only thing on the object that moves the whole
  // length of the picture.
  const marble: Pt3 = [fx, RAIL_TOP + 0.42, TRACK_Z];

  return { ...d, marble };
}

// ── projection ──────────────────────────────────────────────────────────

type M = { r: Pt3; u: Pt3; f: Pt3; eye: Pt3; ty: number; tx: number };

function buildBasis(): M {
  const eye = VIEW.eye as unknown as Pt3;
  const t = VIEW.target;
  let fx = t[0] - eye[0];
  let fy = t[1] - eye[1];
  let fz = t[2] - eye[2];
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = f × up, with world up = +Y.
  let rx = fy * 0 - fz * 1;
  let ry = fz * 0 - fx * 0;
  let rz = fx * 1 - fy * 0;
  const rl = Math.hypot(rx, ry, rz);
  rx /= rl;
  ry /= rl;
  rz /= rl;
  // up = right × f
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;
  const ty = Math.tan((VIEW.fovDeg * Math.PI) / 360);
  return {
    r: [rx, ry, rz],
    u: [ux, uy, uz],
    f: [fx, fy, fz],
    eye,
    ty,
    tx: ty * VIEW.aspect,
  };
}

const BASIS = buildBasis();

/**
 * World → normalised device coordinates, then to SVG units with y down.
 * The camera frustum *is* the viewBox, so the SVG and the canvas frame the same
 * rectangle by construction rather than by agreement.
 */
export function project(x: number, y: number, z: number): Vec2 {
  const dx = x - BASIS.eye[0];
  const dy = y - BASIS.eye[1];
  const dz = z - BASIS.eye[2];
  const vx = dx * BASIS.r[0] + dy * BASIS.r[1] + dz * BASIS.r[2];
  const vy = dx * BASIS.u[0] + dy * BASIS.u[1] + dz * BASIS.u[2];
  const vd = dx * BASIS.f[0] + dy * BASIS.f[1] + dz * BASIS.f[2];
  const d = Math.max(0.001, vd);
  return [vx / (d * BASIS.tx), -(vy / (d * BASIS.ty))];
}

/** viewBox scale. NDC [-1,1] maps to [-S,S], which keeps path data readable. */
export const S = 100;
export const VIEW_BOX = `${-S} ${-S} ${S * 2} ${S * 2}`;

/** Handed to CSS as `aspect-ratio` so the frame and the frustum never disagree. */
export const stageAspect = () => VIEW.aspect;

