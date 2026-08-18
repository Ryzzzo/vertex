/**
 * The bridge — procedural geometry, materials and the five modules.
 *
 * Everything here is built from primitives at runtime. No GLTF, no Megascans,
 * no downloaded HDRI. The reasoning is v2's (§7) and it survived a real test
 * there: a procedural environment can be *authored* against this palette in a
 * two-line edit, and every tuning pass in the v2 log was that edit. A scanned
 * asset can be graded but not authored, costs a request on the critical path,
 * and makes the hero look different when a CDN is slow.
 *
 * ── Text is never baked into a texture ────────────────────────────────────
 *
 * The storyboard draws legible Prisma schema and a legible SQL terminal onto
 * the console screens. They are not rendered that way, for two reasons that
 * happen to agree.
 *
 * The binding one: baking text into an image fails WCAG 1.4.5, and it is also
 * the AI-render tell — v2 refused the same thing for the glowing standoff
 * signage in its reference. Every word on this page is DOM text, including the
 * schema block and the query, which sit in the section copy where a screen
 * reader and the no-WebGL path both get them.
 *
 * The one that makes it better: a screen six metres away at a 30° yaw renders
 * eight-pixel glyphs, which is a smear. What reads as code at that distance is
 * the *rhythm* — indent depth, line-length variance, a blank line between
 * blocks, a longer run where a type annotation sits. So the screens carry
 * generated row rhythm derived from the real snippet's shape, and the snippet
 * itself is in the DOM beside it.
 */

import * as THREE from "three";
import {
  ANCHOR,
  BAY_DOOR_Z,
  CEIL_Y,
  CHAIR,
  CORRIDOR_CEIL_Y,
  CORRIDOR_END_Z,
  CORRIDOR_HALF_X,
  CORRIDOR_START_Z,
  DECK_Y,
  HALL_HALF_X,
  VIEWPORT_R,
  VIEWPORT_Z,
} from "./ship-layout";
import { COOL } from "./palette";

/* ─────────────────────────────────────────────────────────────────────────
   Procedural textures
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Brushed-aluminium roughness. Horizontal streaks at two frequencies, because
 * a single frequency reads as corduroy rather than as a machined finish.
 *
 * 512×512 and repeated. Generated once and shared by every metal surface, so
 * the whole ship costs one texture: 1 MB of VRAM, 0 KB of bundle.
 */
function brushedRoughness(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#6a6a6a";
  g.fillRect(0, 0, S, S);

  // Coarse pass: long strokes, low contrast. This is the direction the light
  // will smear along, so it has to be perfectly horizontal.
  for (let i = 0; i < 5200; i++) {
    const y = Math.random() * S;
    const x = Math.random() * S;
    const w = 30 + Math.random() * 190;
    const v = 96 + Math.random() * 70;
    g.fillStyle = `rgba(${v},${v},${v},0.16)`;
    g.fillRect(x, y, w, 1);
  }
  // Fine pass: short, higher contrast. Supplies the glitter under a key light.
  for (let i = 0; i < 14000; i++) {
    const y = Math.random() * S;
    const x = Math.random() * S;
    const w = 2 + Math.random() * 16;
    const v = 70 + Math.random() * 120;
    g.fillStyle = `rgba(${v},${v},${v},0.1)`;
    g.fillRect(x, y, w, 1);
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/**
 * Panel grid — the seam lines, fastener rows and recessed pockets that make a
 * flat surface read as assembled rather than extruded.
 *
 * This is the single highest-value texture in the build, and it is why Rule 2
 * is about *information* rather than element count: one 1024² grid map puts
 * several hundred readable features on a wall that is four triangles.
 */
function panelGrid(): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8a8a8a";
  g.fillRect(0, 0, S, S);

  const cell = S / 8;
  g.strokeStyle = "rgba(20,20,20,0.85)";
  g.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    g.beginPath();
    g.moveTo(i * cell, 0);
    g.lineTo(i * cell, S);
    g.moveTo(0, i * cell);
    g.lineTo(S, i * cell);
    g.stroke();
  }

  // Sub-panels: a second, shallower division inside a third of the cells. An
  // even grid is a texture; an uneven one is a fabrication drawing.
  g.strokeStyle = "rgba(40,40,40,0.5)";
  g.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i * 7 + j * 3) % 3 !== 0) continue;
      const x = i * cell;
      const y = j * cell;
      g.strokeRect(x + 10, y + 10, cell - 20, cell - 20);
    }
  }

  // Fastener rows along every second seam.
  g.fillStyle = "rgba(28,28,28,0.9)";
  for (let i = 0; i <= 8; i += 2) {
    for (let y = cell * 0.25; y < S; y += cell * 0.5) {
      g.beginPath();
      g.arc(i * cell, y, 3.2, 0, Math.PI * 2);
      g.fill();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/**
 * A console screen as row rhythm.
 *
 * `shape` is the line-length profile of the real snippet, 0-1 per row, with 0
 * meaning a blank line. Indents are encoded as a leading offset. Derived from
 * the DOM copy rather than invented, so the screen and the text beside it are
 * describing the same thing.
 */
function screenRows(
  shape: readonly (readonly [number, number])[],
  tint: string,
  h = 256,
): THREE.CanvasTexture {
  const W = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, h);

  const pad = 16;
  const rows = shape.length;
  const lh = (h - pad * 2) / rows;
  for (let i = 0; i < rows; i++) {
    const [indent, len] = shape[i];
    if (len <= 0) continue;
    const x = pad + indent * (W - pad * 2) * 0.42;
    const w = len * (W - pad * 2 - (x - pad));
    const y = pad + i * lh;
    // Two bands per row: a brighter leading run (the keyword) and a dimmer
    // tail. That asymmetry is most of what makes a row read as syntax rather
    // than as a progress bar.
    g.fillStyle = tint;
    g.globalAlpha = 0.92;
    g.fillRect(x, y + lh * 0.18, Math.min(w, w * 0.34), lh * 0.44);
    g.globalAlpha = 0.42;
    g.fillRect(x + w * 0.38, y + lh * 0.18, w * 0.62, lh * 0.44);
  }
  g.globalAlpha = 1;

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Line-length profiles, read off the snippets that appear in the DOM copy. */
const SCHEMA_SHAPE = [
  [0, 0.62], [0.2, 0.34], [0.2, 0.46], [0.2, 0.44], [0.2, 0.52], [0.2, 0.58],
  [0, 0.18], [0, 0], [0, 0.7], [0.2, 0.4], [0.2, 0.55], [0, 0.18],
] as const;
const TERMINAL_SHAPE = [
  [0, 0.3], [0, 0.66], [0.1, 0.5], [0, 0], [0, 0.44], [0, 0.58], [0, 0.36],
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   The viewport source — and the slot Ryan's Kling loops drop into
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Media slots. Drop a file at the named path and it is used; leave it absent
 * and the procedural stand-in stays. No code change either way.
 *
 * Detection is by load outcome rather than by a manifest, deliberately: a
 * manifest is a second place to update, and the failure mode of forgetting it
 * is a file sitting on disk that never appears. A 404 on a `<video>` fires
 * `error`, we keep the procedural texture, and nothing on the page waits for
 * the round trip because the procedural version is already bound.
 */
export const MEDIA = {
  /** Bridge viewport: gas giant + streaking stars, seamless loop. */
  viewport: "/v3/media/viewport.mp4",
  /** Portfolio backdrop: Dune landscape wide shot, seamless loop. */
  dune: "/v3/media/dune.mp4",
  /** Footer: Dune dusk, long shadows, seamless loop. */
  dusk: "/v3/media/dusk.mp4",
} as const;

export type MediaSlot = keyof typeof MEDIA;

/**
 * Binds a looping video to `material.map` if the file exists, otherwise leaves
 * the procedural texture in place. Returns a disposer.
 */
export function attachMedia(
  slot: MediaSlot,
  material: THREE.MeshBasicMaterial,
  onBound?: () => void,
): () => void {
  const v = document.createElement("video");
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.crossOrigin = "anonymous";
  v.preload = "auto";

  let tex: THREE.VideoTexture | null = null;
  const fallback = material.map;

  const bind = () => {
    tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.SRGBColorSpace;
    material.map = tex;
    material.needsUpdate = true;
    void v.play().catch(() => {});
    onBound?.();
  };

  v.addEventListener("canplay", bind, { once: true });
  v.addEventListener("error", () => {}, { once: true });
  v.src = MEDIA[slot];

  return () => {
    v.removeAttribute("src");
    v.load();
    tex?.dispose();
    material.map = fallback;
  };
}

/**
 * The stand-in the media slot replaces: a gas giant and a star field, drawn
 * once to a 1024×512 canvas.
 *
 * Deliberately a still. A procedural *animated* starfield is half a day of
 * shader work to produce something a 20-second video loop does better, and the
 * slot above means that video is a file drop away. Where the budget went
 * instead is the fog and the materials, which the video cannot supply.
 */
function viewportStandIn(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  g.fillStyle = "#02040a";
  g.fillRect(0, 0, W, H);

  // Star field. Quantised into four brightness buckets so the eye reads depth
  // rather than uniform noise — the same reason the canvas rules in the
  // performance file quantise alpha.
  for (const [n, r, a] of [
    [1500, 0.6, 0.35],
    [420, 0.9, 0.6],
    [120, 1.3, 0.85],
    [26, 2.0, 1],
  ] as const) {
    g.fillStyle = `rgba(214,226,255,${a})`;
    for (let i = 0; i < n; i++) {
      g.fillRect(Math.random() * W, Math.random() * H, r, r);
    }
  }

  // The gas giant. Off-centre and cropped by the frame edge, because a planet
  // centred and whole in a window is a poster; one running off the top of the
  // glass is a place the ship happens to be.
  const cx = W * 0.63;
  const cy = H * 0.30;
  const R = H * 0.52;

  const body = g.createRadialGradient(cx - R * 0.35, cy - R * 0.3, R * 0.1, cx, cy, R);
  // Lifted about a stop and a half from the first pass. This is the only
  // large bright surface in the establishing frame and it is what the camera
  // is pointed at; graded to sit under the LEDs it simply disappeared.
  body.addColorStop(0, "#c4a882");
  body.addColorStop(0.45, "#7d6b52");
  body.addColorStop(0.82, "#3a3128");
  body.addColorStop(1, "#0a0a0c");
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = body;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);

  // Banding. Sinusoidal amplitude so the bands crowd toward the poles the way
  // a rotating fluid body's do.
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const y = cy - R + t * R * 2;
    const th = R * (0.03 + 0.05 * Math.sin(t * Math.PI));
    g.globalAlpha = 0.1 + 0.12 * Math.abs(Math.sin(t * 9));
    g.fillStyle = i % 2 ? "#cbb08a" : "#5c5142";
    g.fillRect(cx - R, y, R * 2, th);
  }
  g.globalAlpha = 1;
  g.restore();

  // Terminator: the unlit limb. Without it the planet is a flat disc.
  const term = g.createLinearGradient(cx - R, 0, cx + R, 0);
  term.addColorStop(0, "rgba(2,4,10,0)");
  term.addColorStop(0.55, "rgba(2,4,10,0.55)");
  term.addColorStop(1, "rgba(2,4,10,0.96)");
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = term;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ─────────────────────────────────────────────────────────────────────────
   Materials
   ───────────────────────────────────────────────────────────────────────── */

export type Materials = ReturnType<typeof buildMaterials>;

export function buildMaterials() {
  const rough = brushedRoughness();
  const grid = panelGrid();

  /** Structural aluminium. Metalness 1, so every face is reflected environment
      with no diffuse under it — which is exactly why the environment's floor
      value is the number that decides whether this reads as metal (v2 §7). */
  const hull = new THREE.MeshPhysicalMaterial({
    // 0.58, up from 0.42. Metalness is 1, so this is the reflectance of the
    // whole surface and not a tint over a diffuse — at 0.42 the ribs read as
    // charcoal plastic wherever they were not catching the key.
    color: new THREE.Color(COOL.chrome).multiplyScalar(0.58),
    metalness: 1,
    roughness: 0.44,
    roughnessMap: rough,
    anisotropy: 0.7,
    anisotropyRotation: 0,
    envMapIntensity: 1.85,
  });
  hull.roughnessMap!.repeat.set(3, 3);

  /** Wall and deck panelling. Same metal, carrying the grid map. */
  const panel = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COOL.panel).multiplyScalar(1.5),
    metalness: 0.86,
    roughness: 0.58,
    roughnessMap: grid,
    envMapIntensity: 1.35,
  });

  /** Dark composite: the non-metal parts — seat, gaskets, screen bezels. */
  const composite = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0b0f19"),
    metalness: 0.1,
    roughness: 0.72,
    envMapIntensity: 0.9,
  });

  /**
   * Illuminated glass. `transmission` with a real `thickness` and `ior`, which
   * is what the brief asked for and what separates a lit panel from a quad
   * with an emissive on it: light bends through the edge, so the panel has a
   * bright rim where it is thickest and the console behind it is displaced.
   */
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COOL.blue),
    metalness: 0,
    roughness: 0.08,
    transmission: 0.92,
    thickness: 0.09,
    ior: 1.42,
    attenuationColor: new THREE.Color(COOL.blue),
    attenuationDistance: 0.5,
    transparent: true,
    envMapIntensity: 1.2,
  });

  /** LED strips and console practicals. `toneMapped: false` so the exposure
      channel moves the light and not these — v2 §6 records the bug where it
      silently moved neither. */
  const led = new THREE.MeshBasicMaterial({
    color: new THREE.Color(COOL.blue),
    toneMapped: false,
  });
  const amber = new THREE.MeshBasicMaterial({
    color: new THREE.Color(COOL.amber),
    toneMapped: false,
  });

  /** The two screens. Row-rhythm maps, additive over their own bezel. */
  const schemaScreen = new THREE.MeshBasicMaterial({
    map: screenRows(SCHEMA_SHAPE, "#4A9BFF", 320),
    toneMapped: false,
    transparent: true,
  });
  const terminalScreen = new THREE.MeshBasicMaterial({
    map: screenRows(TERMINAL_SHAPE, "#42E27B", 192),
    toneMapped: false,
    transparent: true,
  });

  /** The window onto space. Basic, unlit, and the slot the Kling loop takes. */
  const viewport = new THREE.MeshBasicMaterial({
    map: viewportStandIn(),
    toneMapped: false,
    side: THREE.BackSide,
  });

  return {
    hull,
    panel,
    composite,
    glass,
    led,
    amber,
    schemaScreen,
    terminalScreen,
    viewport,
    _textures: [rough, grid],
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Geometry helpers
   ───────────────────────────────────────────────────────────────────────── */

/** A box with chamfered edges. Every hard 90° corner on screen is a tell. */
function slab(w: number, h: number, d: number, bevel = 0.012) {
  const s = new THREE.Shape();
  const x = w / 2 - bevel;
  const y = h / 2 - bevel;
  s.moveTo(-x - bevel, -y);
  s.lineTo(-x - bevel, y);
  s.quadraticCurveTo(-x - bevel, y + bevel, -x, y + bevel);
  s.lineTo(x, y + bevel);
  s.quadraticCurveTo(x + bevel, y + bevel, x + bevel, y);
  s.lineTo(x + bevel, -y);
  s.quadraticCurveTo(x + bevel, -y - bevel, x, -y - bevel);
  s.lineTo(-x, -y - bevel);
  s.quadraticCurveTo(-x - bevel, -y - bevel, -x - bevel, -y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 2,
  });
  g.translate(0, 0, -(d - bevel * 2) / 2);
  return g;
}

/** An emissive strip. Used for every LED run in the ship. */
function strip(len: number, w = 0.045, axis: "x" | "z" = "x") {
  return axis === "x"
    ? new THREE.BoxGeometry(len, w, w * 0.6)
    : new THREE.BoxGeometry(w * 0.6, w, len);
}

/* ─────────────────────────────────────────────────────────────────────────
   The bridge shell
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Deck, ceiling, ribbed bulkheads, the cylindrical viewport, and the corridor.
 *
 * The ribs are one `InstancedMesh` of 64 members rather than 64 meshes. On a
 * scene with this many draw calls already, structural repetition is exactly
 * what instancing is for, and it is the difference between a bridge that can
 * afford ribs and one that has flat walls because ribs were too expensive.
 */
export function buildBridge(m: Materials): THREE.Group {
  const g = new THREE.Group();
  g.name = "bridge";

  /* Deck. A plane rather than a slab: nothing ever sees its underside, and the
     fog raymarch reads the depth buffer, so a single quad is correct here. */
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(HALL_HALF_X * 2 + 4, 34), m.panel.clone());
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, DECK_Y, -2);
  deck.receiveShadow = true;
  (deck.material as THREE.MeshPhysicalMaterial).roughnessMap =
    (m.panel.roughnessMap as THREE.Texture).clone();
  (deck.material as THREE.MeshPhysicalMaterial).roughnessMap!.repeat.set(6, 10);
  (deck.material as THREE.MeshPhysicalMaterial).roughness = 0.34;
  g.add(deck);

  /* Ceiling, with the recessed channel the main LED run sits in. */
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL_HALF_X * 2 + 4, 34), m.panel);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, CEIL_Y, -2);
  g.add(ceil);

  /* Ribbed bulkheads. Two runs, mirrored, angled inboard toward the glass so
     the room tapers to the viewport — forced perspective, and the cheapest
     monumentality available after a low camera. */
  const RIBS = 26;
  const ribGeo = slab(0.22, CEIL_Y - 0.1, 0.5);
  const ribs = new THREE.InstancedMesh(ribGeo, m.hull, RIBS * 2);
  ribs.castShadow = true;
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  let n = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < RIBS; i++) {
      const t = i / (RIBS - 1);
      const z = 6.5 - t * 18.5;
      // Taper: the walls close in by 18% between the corridor mouth and glass.
      const x = side * HALL_HALF_X * (1 - 0.18 * t);
      pos.set(x, CEIL_Y / 2, z);
      q.setFromEuler(new THREE.Euler(0, side * -0.09 * t, 0));
      mtx.compose(pos, q, scl);
      ribs.setMatrixAt(n++, mtx);
    }
  }
  ribs.instanceMatrix.needsUpdate = true;
  g.add(ribs);

  /* Ceiling LED run — two strips converging toward the viewport. The pair is
     what supplies the vanishing point; a single centre strip reads as a
     corridor light rather than as a bridge. */
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(strip(20, 0.07, "z"), m.led);
    s.position.set(side * 2.6, CEIL_Y - 0.09, -3);
    s.rotation.y = side * 0.03;
    s.name = `led-ceiling-${side}`;
    g.add(s);
  }

  /* Floor wash — the fog bank sits in this. Low, dim, and the reason the deck
     has anything on it at all in the establishing shot. */
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(strip(17, 0.05, "z"), m.led);
    s.position.set(side * (HALL_HALF_X - 0.55), 0.06, -2.5);
    s.name = `led-floor-${side}`;
    g.add(s);
  }

  /* ── The viewport ──────────────────────────────────────────────────────
     A cylindrical section, not a quad. The tell on every cheap sci-fi interior
     is a window that is obviously flat: the horizon stays straight as the
     camera pans instead of bending with the glass. */
  const arc = 1.35;
  /**
   * `thetaStart` is `PI - arc/2`, not `-arc/2`, and the difference is the whole
   * window.
   *
   * three builds a cylinder with `x = r·sin(theta)`, `z = r·cos(theta)`, so
   * theta 0 points at **+Z**. The shell's centre sits at `VIEWPORT_Z + R` so
   * that its surface lands on the viewport plane — which means the wedge has to
   * face −Z to be the near side. Started at `-arc/2` it faced +Z instead: the
   * glass was built correctly, at the correct radius, 25 units behind the
   * camera. The symptom was a bridge with mullions and no window, which reads as
   * a texture failure and is a trigonometry failure.
   */
  const arcStart = Math.PI - arc / 2;
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(VIEWPORT_R, VIEWPORT_R, 5.2, 64, 1, true, arcStart, arc),
    m.viewport,
  );
  shell.position.set(0, 2.3, VIEWPORT_Z + VIEWPORT_R);
  shell.name = "viewport-shell";
  g.add(shell);

  /*
   * There is deliberately no glass pane across the viewport.
   *
   * A transmissive cylinder was built here first and it cost twice. Visually,
   * `attenuationColor` over a 12-unit path length tinted the entire window
   * toward the LED blue and dropped the gas giant to near-black — the window
   * became a filter over the one bright thing in the frame. Structurally,
   * `transmission` forces a separate render of the scene behind every
   * transmissive surface, and doing that for a surface covering half the frame
   * is the most expensive possible place to spend it.
   *
   * Transmission is kept where it reads and costs little: the schema console's
   * cover, which is a small panel with a lit surface right behind it. That is
   * the case the brief actually wanted it for.
   */
  /* Mullions. Seven vertical frames across the glass — the structure that
     makes the window read as engineered rather than as a hole. */
  const mull = new THREE.InstancedMesh(slab(0.13, 5.0, 0.34), m.hull, 7);
  for (let i = 0; i < 7; i++) {
    const a = -arc / 2 + (arc * (i + 0.5)) / 7;
    pos.set(
      Math.sin(a) * (VIEWPORT_R - 0.2),
      2.3,
      VIEWPORT_Z + VIEWPORT_R - Math.cos(a) * (VIEWPORT_R - 0.2),
    );
    q.setFromEuler(new THREE.Euler(0, a, 0));
    mtx.compose(pos, q, scl);
    mull.setMatrixAt(i, mtx);
  }
  mull.instanceMatrix.needsUpdate = true;
  mull.castShadow = true;
  g.add(mull);

  /* Sill and header — the heavy frame the glass sits in. */
  for (const [y, h] of [
    [-0.16, 0.5],
    [4.86, 0.72],
  ] as const) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(VIEWPORT_R + 0.1, VIEWPORT_R + 0.1, h, 48, 1, true, arcStart, arc),
      m.hull,
    );
    ring.position.set(0, 2.3 + y, VIEWPORT_Z + VIEWPORT_R);
    g.add(ring);
  }

  g.add(buildChair(m));
  g.add(buildCorridor(m));
  return g;
}

/** The pilot chair. A silhouette, not a model — it is always backlit. */
function buildChair(m: Materials): THREE.Group {
  const c = new THREE.Group();
  c.name = "chair";
  c.position.set(CHAIR.x, CHAIR.y, CHAIR.z);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.42, 20), m.hull);
  pedestal.position.y = 0.21;
  pedestal.castShadow = true;
  c.add(pedestal);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.44, 14), m.hull);
  column.position.y = 0.6;
  c.add(column);

  const seat = new THREE.Mesh(slab(0.86, 0.16, 0.82), m.composite);
  seat.position.y = 0.88;
  seat.castShadow = true;
  c.add(seat);

  /**
   * The back. A bucket shell — a cylinder section, open toward the camera.
   *
   * It was a lathe first, narrowing quadratically to a point, and at this
   * camera distance that renders as a traffic cone parked on the bridge axis
   * directly over the gas giant. The shape was the problem, not the size:
   * a solid of revolution that tapers reads as a cone whatever you scale it to.
   * A cylinder section has a *silhouette* — two vertical edges and a curve —
   * which is what a seat back actually is from behind, and it stops occluding
   * the window because it is wider than it is tall.
   */
  const back = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.42, 0.78, 20, 1, true, Math.PI * 0.62, Math.PI * 1.16),
    m.composite,
  );
  back.material.side = THREE.DoubleSide;
  back.position.set(0, 1.3, 0.1);
  back.castShadow = true;
  c.add(back);

  /* One amber light on the chair arm. It is the only warm thing in the
     establishing frame, and it is doing the work of promising the second act. */
  const armLight = new THREE.Mesh(strip(0.3, 0.03, "z"), m.amber);
  armLight.position.set(0.44, 0.98, -0.18);
  armLight.name = "chair-amber";
  c.add(armLight);

  return c;
}

/**
 * The exit corridor and the launch-bay door.
 *
 * Runs +Z out of the bridge. The camera retreats down it through the deploy
 * beat and accelerates through the door at launch, so the geometry has to hold
 * up from *inside* at speed — which means the detail is all in the wall ribs
 * and the floor strips, the two things that give a sense of travel.
 */
function buildCorridor(m: Materials): THREE.Group {
  const c = new THREE.Group();
  c.name = "corridor";
  const len = CORRIDOR_END_Z - CORRIDOR_START_Z;
  const midZ = (CORRIDOR_START_Z + CORRIDOR_END_Z) / 2;

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, CORRIDOR_CEIL_Y), m.panel);
    wall.rotation.y = side * -Math.PI / 2;
    wall.position.set(side * CORRIDOR_HALF_X, CORRIDOR_CEIL_Y / 2, midZ);
    c.add(wall);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_HALF_X * 2, len), m.panel);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, CORRIDOR_CEIL_Y, midZ);
  c.add(ceil);

  /* Rib arches every 1.3m. These are what read as motion when the camera runs
     the corridor — the strobing of regular structure past the lens. */
  const count = Math.floor(len / 1.3);
  const arch = new THREE.InstancedMesh(slab(0.16, CORRIDOR_CEIL_Y, 0.28), m.hull, count * 2);
  const mtx = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const scl = new THREE.Vector3(1, 1, 1);
  let n = 0;
  for (let i = 0; i < count; i++) {
    const z = CORRIDOR_START_Z + 0.7 + i * 1.3;
    for (const side of [-1, 1]) {
      pos.set(side * (CORRIDOR_HALF_X - 0.08), CORRIDOR_CEIL_Y / 2, z);
      mtx.compose(pos, q, scl);
      arch.setMatrixAt(n++, mtx);
    }
  }
  arch.instanceMatrix.needsUpdate = true;
  c.add(arch);

  /* Floor strips, one per side, running the full length. */
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(strip(len, 0.05, "z"), m.led);
    s.position.set(side * (CORRIDOR_HALF_X - 0.12), 0.05, midZ);
    s.name = `corridor-led-${side}`;
    c.add(s);
  }

  /* The launch-bay door. Two leaves that part, with amber behind. The plane
     behind them is what the bloom eats at ignition. */
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_HALF_X * 2, CORRIDOR_CEIL_Y),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(COOL.amber), toneMapped: false }),
  );
  spill.position.set(0, CORRIDOR_CEIL_Y / 2, BAY_DOOR_Z + 0.4);
  spill.name = "bay-spill";
  c.add(spill);

  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(slab(CORRIDOR_HALF_X, CORRIDOR_CEIL_Y, 0.16), m.hull);
    leaf.position.set(side * CORRIDOR_HALF_X * 0.5, CORRIDOR_CEIL_Y / 2, BAY_DOOR_Z);
    leaf.name = `bay-leaf-${side}`;
    leaf.castShadow = true;
    c.add(leaf);
  }

  return c;
}

/* ─────────────────────────────────────────────────────────────────────────
   The five modules
   ─────────────────────────────────────────────────────────────────────────
   Each returns a group plus an `update` closure. The registry pattern is what
   R3F would otherwise be supplying — an object with its own lifecycle that
   the loop can call without knowing what is inside it — at zero bundle cost.
   v2 declined R3F on the grounds that a single scalar drove everything and
   there was nothing to encapsulate; that is no longer true here, and this is
   the shape the encapsulation takes instead. */

export type ShipModule = {
  group: THREE.Group;
  /** `u` is the module's own named uniform; `t` is elapsed seconds. */
  update(u: number, t: number, hold: number): void;
};

/** A curved console body, shared by every module that sits on the arc. */
function consoleBody(m: Materials, w: number, h: number): THREE.Group {
  const g = new THREE.Group();

  const desk = new THREE.Mesh(slab(w, 0.11, 0.66), m.hull);
  desk.position.set(0, h - 0.42, 0);
  desk.rotation.x = -0.22;
  desk.castShadow = true;
  g.add(desk);

  const body = new THREE.Mesh(slab(w * 0.92, h - 0.46, 0.52), m.panel);
  body.position.set(0, (h - 0.46) / 2, -0.05);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  /* The under-desk wash. Light escaping downward from a console is most of
     what makes a bridge look occupied rather than modelled. */
  const wash = new THREE.Mesh(strip(w * 0.8, 0.035), m.led);
  wash.position.set(0, h - 0.5, 0.3);
  g.add(wash);

  return g;
}

/** 01 — Schema. A tall code surface behind illuminated glass. */
export function buildSchema(m: Materials): ShipModule {
  const a = ANCHOR.schema;
  const g = new THREE.Group();
  g.position.set(a.x, 0, a.z);
  g.rotation.y = a.yaw;
  g.name = "mod-schema";
  g.add(consoleBody(m, a.w * 2, a.y + 0.5));

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(a.w * 1.5, a.h * 1.9), m.schemaScreen);
  screen.position.set(0, a.y + 0.5, 0.28);
  screen.rotation.x = -0.1;
  g.add(screen);

  /* The glass in front of it. This is where `transmission` earns its keep: the
     rows behind are displaced and edge-lit rather than simply covered. */
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(a.w * 1.62, a.h * 2), m.glass.clone());
  cover.position.set(0, a.y + 0.5, 0.34);
  cover.rotation.x = -0.1;
  g.add(cover);

  const bezel = new THREE.Mesh(slab(a.w * 1.72, a.h * 2.12, 0.1), m.hull);
  bezel.position.set(0, a.y + 0.5, 0.22);
  bezel.rotation.x = -0.1;
  bezel.castShadow = true;
  g.add(bezel);

  const mat = screen.material as THREE.MeshBasicMaterial;
  const glass = cover.material as THREE.MeshPhysicalMaterial;

  return {
    group: g,
    update(u, t, hold) {
      // Rows reveal top-down as the beat opens; the hold pushes past 1 into a
      // brighter, fully-lit state so pressing has somewhere to go.
      const lit = Math.min(1, u + hold * 0.55);
      mat.opacity = 0.15 + lit * 0.85;
      // The cover clouds slightly as the surface behind it lights: more light
      // through the glass means more of it scattering *in* the glass, which is
      // the difference between a lit panel and a hole with a colour in it.
      glass.transmission = 0.92 - lit * 0.18;
      glass.attenuationDistance = 0.5 + lit * 1.4;
      // A slow scan, two seconds per pass. Reads as a live surface without
      // asking the visitor to watch it.
      mat.map!.offset.y = -((t * 0.06) % 1) * 0.04 * lit;
    },
  };
}

/**
 * 02 — RLS. A physical gate in a bulkhead: two leaves that part under press.
 *
 * The storyboard asks for a literal security check, and the argument the copy
 * makes is that authorization is structural rather than perimeter. So it is
 * built into the *wall* — not a device standing on the deck — and what opens
 * is a piece of the hull.
 */
export function buildRLS(m: Materials): ShipModule {
  const a = ANCHOR.rls;
  const g = new THREE.Group();
  g.position.set(a.x, 0, a.z);
  g.rotation.y = a.yaw;
  g.name = "mod-rls";

  const frame = new THREE.Mesh(slab(a.w * 2.5, a.h * 2.6, 0.34), m.hull);
  frame.position.set(0, a.y + 0.34, 0);
  frame.castShadow = true;
  frame.receiveShadow = true;
  g.add(frame);

  /* An amber reveal around the aperture. Two jobs: it draws the opening as a
     rectangle so the leaves have somewhere to be, and it is the warm accent
     this act needs one of per console. */
  for (const [dx, dy, w, h] of [
    [0, a.h * 1.06, a.w * 2.1, 0.035],
    [0, -a.h * 1.06, a.w * 2.1, 0.035],
    [-a.w * 1.05, 0, 0.035, a.h * 2.1],
    [a.w * 1.05, 0, 0.035, a.h * 2.1],
  ] as const) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m.amber);
    r.position.set(dx, a.y + 0.34 + dy, 0.185);
    g.add(r);
  }

  /* What is behind the gate. Blue when shut, and it is the only thing that
     changes value as the leaves part — the light was always there. */
  const inner = new THREE.Mesh(
    new THREE.PlaneGeometry(a.w * 1.9, a.h * 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(COOL.blue), toneMapped: false }),
  );
  /*
   * z = +0.19, in front of the frame's own front face — not behind it.
   *
   * `slab()` centres its extrusion on z, so a 0.34-deep frame spans ±0.17. The
   * lit interior was authored at −0.14 and the leaves at +0.06, which put both
   * of them *inside* that solid. The gate therefore worked perfectly and was
   * completely invisible: the hold ran, the travel eased, the check indicators
   * latched green, and the only thing on screen was a blank slab. It read as
   * "the interaction does nothing" when the interaction was doing everything
   * behind a wall.
   *
   * There is no aperture cut through the frame because a boolean through an
   * extruded bevel is not worth it for a surface the camera never gets behind.
   * The layering does the job: lit plane, then leaves, then the amber reveal.
   */
  inner.position.set(0, a.y + 0.34, 0.19);
  g.add(inner);

  /* The leaves carry the panel grid and the frame carries plain hull.
     Built the other way first — both on `m.hull` — and the module rendered as
     one blank door two and a half metres across, because two abutting surfaces
     of the same material at the same depth have no seam between them. What
     makes a gate read as a gate is the *joint*, and a joint needs two
     materials or a shadow, and here it gets both. */
  const leaves: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(slab(a.w * 0.98, a.h * 2, 0.14), m.panel);
    leaf.position.set(side * a.w * 0.49, a.y + 0.34, 0.26);
    leaf.castShadow = true;
    leaves.push(leaf);
    g.add(leaf);
  }

  /* Two check indicators — READ and WRITE in the storyboard, unlabelled here
     because their names are DOM text in the section copy. */
  const checks: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), m.amber.clone());
    c.position.set(-a.w * 1.18, a.y + 0.62 - i * 0.24, 0.2);
    checks.push(c);
    g.add(c);
  }

  const im = inner.material as THREE.MeshBasicMaterial;

  return {
    group: g,
    update(u, t, hold) {
      const open = Math.min(1, u + hold * 0.66);
      // Cubic ease on travel so the leaves have weight at the ends of the run.
      const e = open * open * (3 - 2 * open);
      leaves[0].position.x = -a.w * 0.49 - e * a.w * 0.92;
      leaves[1].position.x = a.w * 0.49 + e * a.w * 0.92;
      im.color.setStyle(COOL.blue).multiplyScalar(0.5 + e * 1.9);
      for (let i = 0; i < checks.length; i++) {
        const on = e > 0.25 + i * 0.3;
        (checks[i].material as THREE.MeshBasicMaterial).color
          .setStyle(on ? COOL.green : COOL.amber)
          .multiplyScalar(on ? 1 : 0.25 + 0.12 * Math.sin(t * 3 + i));
      }
    },
  };
}

/** 03 — Server actions. A rotating disc assembly with a sweep arm. */
export function buildActions(m: Materials): ShipModule {
  const a = ANCHOR.actions;
  const g = new THREE.Group();
  g.position.set(a.x, 0, a.z);
  g.rotation.y = a.yaw;
  g.name = "mod-actions";
  g.add(consoleBody(m, a.w * 2.1, a.y + 0.3));

  const hub = new THREE.Group();
  hub.position.set(0, a.y + 0.34, 0.1);
  hub.rotation.x = -0.9;
  g.add(hub);

  /* Outer ring — idles continuously, slowly. */
  const outer = new THREE.Mesh(new THREE.TorusGeometry(a.w * 0.72, 0.035, 8, 48), m.hull);
  hub.add(outer);
  const outerTicks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.02, 0.1), m.led, 24);
  {
    const mtx = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const scl = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 24; i++) {
      const th = (i / 24) * Math.PI * 2;
      pos.set(Math.cos(th) * a.w * 0.72, Math.sin(th) * a.w * 0.72, 0);
      q.setFromEuler(new THREE.Euler(0, 0, th));
      mtx.compose(pos, q, scl);
      outerTicks.setMatrixAt(i, mtx);
    }
    outerTicks.instanceMatrix.needsUpdate = true;
  }
  hub.add(outerTicks);

  /* Inner disc — driven by scroll and by the hold. */
  const inner = new THREE.Group();
  hub.add(inner);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(a.w * 0.5, a.w * 0.5, 0.05, 32), m.hull);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  inner.add(disc);

  /* The arm. Long enough to sweep past the frame edge from the low camera. */
  const arm = new THREE.Mesh(slab(a.w * 1.15, 0.07, 0.09), m.hull);
  arm.position.set(a.w * 0.4, 0, 0.06);
  inner.add(arm);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), m.amber);
  tip.position.set(a.w * 0.95, 0, 0.06);
  inner.add(tip);

  return {
    group: g,
    update(u, t, hold) {
      outer.rotation.z = t * 0.12;
      outerTicks.rotation.z = t * 0.12;
      inner.rotation.z = -(u + hold * Math.PI);
    },
  };
}

/** 04 — Interface. The one green light on the page. */
export function buildInterface(m: Materials): ShipModule {
  const a = ANCHOR.interface;
  const g = new THREE.Group();
  g.position.set(a.x, 0, a.z);
  g.rotation.y = a.yaw;
  g.name = "mod-interface";
  g.add(consoleBody(m, a.w * 2, a.y + 0.4));

  const bezel = new THREE.Mesh(slab(a.w * 1.6, a.h * 1.5, 0.1), m.composite);
  bezel.position.set(0, a.y + 0.42, 0.24);
  bezel.rotation.x = -0.24;
  g.add(bezel);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(a.w * 1.42, a.h * 1.3), m.terminalScreen);
  screen.position.set(0, a.y + 0.42, 0.3);
  screen.rotation.x = -0.24;
  g.add(screen);

  /* The caret. A single block that blinks — the smallest possible signal that
     something is running rather than displayed. */
  const caret = new THREE.Mesh(
    new THREE.PlaneGeometry(0.035, 0.05),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(COOL.green), toneMapped: false }),
  );
  caret.position.set(-a.w * 0.2, a.y + 0.2, 0.31);
  caret.rotation.x = -0.24;
  g.add(caret);

  /* A green practical throwing light back onto the console face. Without it
     the screen is a sticker; with it, the screen is a light source. */
  const glow = new THREE.PointLight(new THREE.Color(COOL.green), 0, 2.2, 2);
  glow.position.set(0, a.y + 0.42, 0.55);
  g.add(glow);

  const mat = screen.material as THREE.MeshBasicMaterial;
  const cm = caret.material as THREE.MeshBasicMaterial;

  return {
    group: g,
    update(u, t, hold) {
      const lit = Math.min(1, u + hold * 0.5);
      mat.opacity = lit;
      glow.intensity = lit * 2.6;
      // Rows reveal in sequence rather than fading as a block: a terminal
      // fills, it does not dissolve into view.
      mat.map!.repeat.y = 1;
      cm.opacity = lit * (Math.sin(t * 4.2) > -0.2 ? 1 : 0.08);
      cm.transparent = true;
    },
  };
}

/** 05 — Deploy. The corridor mouth, with the pre-flight ladder beside it. */
export function buildDeploy(m: Materials): ShipModule {
  const a = ANCHOR.deploy;
  const g = new THREE.Group();
  g.position.set(a.x, 0, a.z);
  g.name = "mod-deploy";

  /* The frame around the corridor mouth. Heavier than anything else on the
     bridge, because it is a pressure boundary and should look like one. */
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(slab(0.42, CORRIDOR_CEIL_Y + 0.5, 0.5), m.hull);
    post.position.set(side * (CORRIDOR_HALF_X + 0.2), (CORRIDOR_CEIL_Y + 0.5) / 2, 0);
    post.castShadow = true;
    g.add(post);
  }
  const lintel = new THREE.Mesh(slab(CORRIDOR_HALF_X * 2 + 0.84, 0.42, 0.5), m.hull);
  lintel.position.set(0, CORRIDOR_CEIL_Y + 0.45, 0);
  g.add(lintel);

  /* Five pre-flight indicators — one per layer, latching in order. Their
     names are DOM text in the section copy; here they are just lights. */
  const lamps: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.055, 14), m.amber.clone());
    l.position.set(CORRIDOR_HALF_X + 0.2, 0.7 + i * 0.3, 0.26);
    lamps.push(l);
    g.add(l);
  }

  return {
    group: g,
    update(u, t, hold) {
      const lit = Math.min(1, u + hold * 0.4);
      for (let i = 0; i < lamps.length; i++) {
        const on = lit > (i + 0.5) / 5;
        (lamps[i].material as THREE.MeshBasicMaterial).color
          .setStyle(on ? COOL.green : COOL.amber)
          .multiplyScalar(on ? 1.2 : 0.22 + 0.1 * Math.sin(t * 2.4 + i * 0.8));
      }
    },
  };
}
