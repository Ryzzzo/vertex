/**
 * Room 01 — the Bridge.
 *
 * ── The shell, and why it was rebuilt ─────────────────────────────────────
 *
 * The previous bridge was a rectangle 18 m wide by 23 m deep and still read as
 * a small box. Size was never the problem; three other things were, and the
 * rebuild addresses each with geometry rather than with lighting:
 *
 *   1. **A right angle in peripheral vision says "box".** Two parallel side
 *      walls meeting a flat back wall put a hard 90° corner in both bottom
 *      corners of frame, and no amount of depth behind that undoes it. The
 *      plan is now an elongated octagon (`kit/plan.ts`), so every corner the
 *      viewer sees is 135°.
 *   2. **A room is only as deep as its furthest interesting thing.** The old
 *      viewport took under half the front wall, so the wall was the subject and
 *      the window a feature on it. It is now ~72% of the front wall and the
 *      brightest thing in the room.
 *   3. **Perspective needs something at intermediate distance.** An empty floor
 *      between near and far gives the eye nothing to measure with, so twelve
 *      metres and four metres look alike. There is now a helm arc at the
 *      mid-point, a raised dais, and floor tracks converging the full length.
 *
 * The camera also moved back and up. The chair sits at the near end of a long
 * room rather than in the middle of a short one.
 *
 * ── What carried over unchanged ───────────────────────────────────────────
 *
 * Deep slate albedo with form described by specular rather than diffuse, the
 * glowing traced outlines, stencil ink that lifts rather than darkens, the blue
 * floor track, green at roughly a tenth, cast shadows and the chair rim light.
 */
import {
  Group,
  HemisphereLight,
  DirectionalLight,
  PointLight,
  Mesh,
  SphereGeometry,
  type BufferGeometry,
  type Material,
  type PerspectiveCamera,
} from "three/webgpu";
import {
  bevelBox,
  bevelFrame,
  bevelPanel,
  polygonPlate,
  post,
  quad,
  seatBack,
} from "../kit/shapes";
import { octagonPlan, BRIDGE_PLAN_CONFIG } from "../kit/plan";
import {
  accentStripMaterial,
  chromeMaterial,
  darkPanelMaterial,
  deckMaterial,
  gasGiantMaterial,
  hullEdgeMaterial,
  hullMaterial,
  ledMaterial,
  markedHullMaterial,
  materialBag,
  recessMaterial,
  screenMaterial,
  starFieldMaterial,
  stripMaterial,
} from "../kit/materials";
import { createVideoScreen } from "../kit/videoScreen";
import { SHIP } from "../palette";
import type { FrameState, RoomModule } from "../scene/types";
import type { QualityTier } from "../scene/quality";

/* ── Layout ─────────────────────────────────────────────────────────────── */

const PLAN = octagonPlan();

const ROOM = {
  /** At the spine. The vault rises to this at the centre line. */
  ceilingCrown: 8.6,
  /** Where the vault meets the side walls. Must clear the viewport top. */
  ceilingSpring: 6.2,
} as const;

/** ~72% of the 14 m front wall. The room's defining feature. */
const VIEWPORT = {
  width: 10.2,
  height: 4.0,
  sill: 1.7,
  frame: 0.42,
} as const;

const CHAIR = { z: 1.5, daisRadius: 2.0, daisHeight: 0.42 } as const;

/** The helm arc — the mid-ground object that makes the depth legible. */
const HELM = { z: -6.6, halfSpan: 4.6 } as const;

export const BRIDGE_CAMERA = {
  /** Behind and above the chair, at the room's near end. */
  position: [0, 5.4, 10.5] as [number, number, number],
  /**
   * Aimed low, at the deck rather than at the viewport's centre.
   *
   * The previous target sat at y=3.0 and put the camera almost level, which
   * spent the top 40% of frame on unlit ceiling void and gave the eye no floor
   * to measure the room against. Looking *down* a long room is the classic
   * depth read — the deck recedes, the guide tracks converge, and the vault
   * crops out of frame instead of dominating it. The viewport still lands in
   * the upper third because it is four metres tall.
   */
  target: [0, 1.6, PLAN.frontZ] as [number, number, number],
  /** Vertical; ~86° horizontal at 16:9. */
  fov: 55,
} as const;

export function createBridge(opts: {
  seed: number;
  quality: QualityTier;
  camera: PerspectiveCamera;
}): RoomModule {
  const { seed, quality } = opts;
  const group = new Group();
  group.name = "bridge";

  const bag = materialBag();
  const geometries: BufferGeometry[] = [];
  const track = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const hull = hullMaterial(bag);
  const darkPanel = darkPanelMaterial(bag);
  const marked = markedHullMaterial(bag, seed);
  const hullEdge = hullEdgeMaterial(bag);
  const chrome = chromeMaterial(bag);
  const recess = recessMaterial(bag);
  const strip = stripMaterial(bag);
  const accentStrip = accentStripMaterial(bag);
  const ledGreen = ledMaterial(bag, SHIP.phosphor);
  const ledWhite = ledMaterial(bag, "#E4ECF7", 2.6);

  const add = (
    g: BufferGeometry,
    m: Material,
    pos: [number, number, number],
    rot?: [number, number, number],
  ) => {
    const mesh = new Mesh(track(g), m);
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    // Both flags on everything. Meshes default to neither, so a correctly
    // configured shadow-casting light renders no shadows at all without them.
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  /** Place an already-tracked geometry again. One shape, many placements. */
  const reuse = (
    g: BufferGeometry,
    m: Material,
    pos: [number, number, number],
    rot: [number, number, number],
  ) => {
    const mesh = new Mesh(g, m);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  /* ── Deck ──────────────────────────────────────────────────────────────
     The octagon itself, with seams inscribed by the material rather than
     modelled. */
  add(
    polygonPlate(PLAN.vertices),
    deckMaterial(bag, quality.deckDivisions),
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
  );

  /* ── Floor guide tracks ────────────────────────────────────────────────
     Two thin runs the full length of the room, stopping short of the dais.
     A lit line converging toward the viewport is the strongest depth cue
     available in one-point perspective — its convergence is unambiguous in a
     way a wall seam never is, which is exactly what the old room lacked. */
  const trackLength = CHAIR.z - CHAIR.daisRadius - PLAN.frontZ - 1.2;
  const trackGeo = track(bevelBox(0.08, 0.02, trackLength, 0.008));
  for (const tx of [-0.5, 0.5]) {
    const line = reuse(trackGeo, accentStrip, [
      tx,
      0.012,
      (CHAIR.z - CHAIR.daisRadius + PLAN.frontZ) / 2 - 0.6,
    ], [0, 0, 0]);
    line.castShadow = false;
    line.receiveShadow = false;
  }

  /* ── Walls ─────────────────────────────────────────────────────────────
     Each octagon edge gets a run of dark panels with glowing traced outlines.
     Segment geometry is derived from the plan, so reshaping the room does not
     mean re-deriving eight sets of angles by hand. */
  /**
   * Three courses, not two.
   *
   * Two topped out at y≈5.2 in a room whose walls run to 6.2, leaving a metre
   * of unlit backing above every bay — which from a camera tilted down reads as
   * a dead black band across the top third of frame. A wall has to be panelled
   * all the way to where it meets the ceiling, or the room appears to stop
   * before it does.
   */
  const COURSE = [
    { y: 5.42, h: 1.35 },
    { y: 3.62, h: 2.05 },
    { y: 1.28, h: 2.3 },
  ] as const;
  const trim = 0.05;

  for (const seg of PLAN.segments) {
    const [mx, mz] = seg.mid;
    const yaw: [number, number, number] = [0, seg.yaw, 0];

    // The front wall carries the viewport and builds its own surface below.
    //
    // This `continue` has to come BEFORE the backing quad, not after. Adding an
    // opaque near-black plate across the whole front wall and *then* skipping
    // the panel run left the viewport aperture covered by it — the frame and
    // its glowing outline drew correctly over a sealed hole, so the window read
    // as a switched-off panel while the planet and star field sat behind a
    // wall, rendering perfectly and visible to nobody.
    if (seg.kind === "front") continue;

    // Backing, so the gaps between panels read as depth rather than as holes.
    add(
      quad(seg.length, ROOM.ceilingSpring + 1.6),
      recess,
      [mx, (ROOM.ceilingSpring + 1.6) / 2, mz],
      yaw,
    );

    const bays = Math.max(2, Math.round(seg.length / 3.1));
    const pitch = seg.length / bays;
    const panelW = pitch - 0.26;
    const inward: [number, number] = [Math.sin(seg.yaw), Math.cos(seg.yaw)];
    const along: [number, number] = [inward[1], -inward[0]];

    for (const course of COURSE) {
      const panelGeo = track(bevelPanel(panelW, course.h, 0.16));
      const frameGeo = track(
        bevelFrame(
          panelW + 0.1,
          course.h + 0.1,
          panelW + 0.1 - trim * 2,
          course.h + 0.1 - trim * 2,
          0.07,
          0.16,
          0.012,
        ),
      );

      for (let i = 0; i < bays; i++) {
        const t = (i + 0.5 - bays / 2) * pitch;
        const px = mx + along[0] * t;
        const pz = mz + along[1] * t;

        // Every third bay is a marked access panel — a step lighter with hull
        // stencilling. Every bay marked would read as wallpaper.
        reuse(
          panelGeo,
          i % 3 === 1 ? marked : darkPanel,
          [px + inward[0] * 0.12, course.y, pz + inward[1] * 0.12],
          yaw,
        );
        reuse(
          frameGeo,
          strip,
          [px + inward[0] * 0.19, course.y, pz + inward[1] * 0.19],
          yaw,
        );
      }
    }

    // Continuous hairlines: one in the channel between courses, one washing
    // the deck. With a near-black field these are what keep the wall-to-floor
    // and wall-to-wall junctions legible.
    //
    // Length goes on **X**, not Z. `bevelBox(w, h, d)` puts `d` on the Z axis,
    // and these are placed with a yaw rotation that aligns X along the wall —
    // so building the length on Z made each rail a twelve-metre beam driven
    // perpendicular through the wall it was meant to trim. The back wall's ran
    // straight through the camera and filled the frame with a white column.
    const railGeo = track(bevelBox(seg.length - 0.5, 0.09, 0.07, 0.014));
    // 6.18 is the cornice, where the wall meets the vault. Without it the top
    // of frame is unlit ceiling with no edge on it, and a dark band with no
    // boundary reads as the room having no ceiling rather than a dark one.
    for (const railY of [6.18, 4.68, 2.44, 0.16]) {
      reuse(railGeo, strip, [
        mx + inward[0] * 0.22,
        railY,
        mz + inward[1] * 0.22,
      ], yaw);
    }
  }

  /* ── Vaulted ceiling ───────────────────────────────────────────────────
     Stepped longitudinal courses rising to a spine, in the same panel language
     as the walls. A flat lid over an octagon still reads as a box lid; a vault
     removes the last large right angle from the frame. */
  const STEPS = 5;
  // Stops short of the front wall so the vault never overhangs the viewport,
  // and short of the rear so the bulkhead reads as a wall rather than a seam.
  const vaultFrontZ = PLAN.frontZ + 1.6;
  const vaultDepth = PLAN.backZ - vaultFrontZ;
  const vaultMidZ = (PLAN.backZ + vaultFrontZ) / 2;

  for (let s = 0; s < STEPS; s++) {
    const t = s / (STEPS - 1);
    // Widest and lowest at the walls, narrowest and highest at the spine.
    const halfW = PLAN.halfWidth * (1 - t * 0.82);
    const y = ROOM.ceilingSpring + (ROOM.ceilingCrown - ROOM.ceilingSpring) * t;
    const stepGeo = track(bevelBox(halfW * 2, 0.24, vaultDepth, 0.03));
    reuse(stepGeo, s === STEPS - 1 ? darkPanel : recess, [0, y, vaultMidZ], [
      0, 0, 0,
    ]);

    // Lit edges sit BELOW their riser, not on top of it. Placed above, they
    // were occluded by the very step they were meant to describe — a ceiling
    // full of lights that nothing in the room could see.
    if (s < STEPS - 1) {
      const edgeGeo = track(bevelBox(0.07, 0.06, vaultDepth - 1.0, 0.014));
      for (const ex of [-halfW + 0.12, halfW - 0.12]) {
        reuse(edgeGeo, strip, [ex, y - 0.17, vaultMidZ], [0, 0, 0]);
      }
    }
  }

  // The two long spine runs, unchanged in role: the strongest depth cue up top.
  const spineGeo = track(bevelBox(0.32, 0.1, vaultDepth - 1.6, 0.02));
  for (const x of [-1.5, 1.5]) {
    reuse(spineGeo, strip, [x, ROOM.ceilingCrown - 0.26, vaultMidZ], [0, 0, 0]);
  }

  /* ── Front wall and the viewport ───────────────────────────────────────
     The viewport is 72% of the front wall. It is the room's defining feature
     and the furthest bright thing, which is what makes the depth read. */
  const vpTop = VIEWPORT.sill + VIEWPORT.height;
  const vpHalf = VIEWPORT.width / 2;
  const frontHalf = PLAN.frontHalfWidth;

  add(quad(frontHalf * 2, VIEWPORT.sill), darkPanel, [
    0,
    VIEWPORT.sill / 2,
    PLAN.frontZ,
  ]);
  add(quad(frontHalf * 2, ROOM.ceilingSpring + 1.6 - vpTop), darkPanel, [
    0,
    (ROOM.ceilingSpring + 1.6 + vpTop) / 2,
    PLAN.frontZ,
  ]);
  for (const side of [-1, 1] as const) {
    const w = frontHalf - vpHalf;
    add(quad(w, VIEWPORT.height), darkPanel, [
      side * (vpHalf + w / 2),
      VIEWPORT.sill + VIEWPORT.height / 2,
      PLAN.frontZ,
    ]);
  }

  // Structural surround in pale metal, then the glowing outline traced around
  // it — the same motif as every wall bay, at the scale of the thing the room
  // is built around.
  add(
    bevelFrame(
      VIEWPORT.width + VIEWPORT.frame * 2,
      VIEWPORT.height + VIEWPORT.frame * 2,
      VIEWPORT.width,
      VIEWPORT.height,
      0.34,
    ),
    hull,
    [0, VIEWPORT.sill + VIEWPORT.height / 2, PLAN.frontZ + 0.2],
  );
  add(
    bevelFrame(
      VIEWPORT.width + VIEWPORT.frame * 2 + 0.18,
      VIEWPORT.height + VIEWPORT.frame * 2 + 0.18,
      VIEWPORT.width + VIEWPORT.frame * 2,
      VIEWPORT.height + VIEWPORT.frame * 2,
      0.09,
      0.3,
      0.014,
    ),
    strip,
    [0, VIEWPORT.sill + VIEWPORT.height / 2, PLAN.frontZ + 0.3],
  );

  /**
   * The forward console bank, under the viewport.
   *
   * Restores the element the rewrite dropped. Without it the front wall is a
   * flat plane with one hole in it, which is where the old room lost most of
   * its density — and it is also what stops the viewport reading as a picture
   * hung on a wall rather than as an aperture in a structure.
   */
  add(bevelPanel(VIEWPORT.width + 1.6, 0.78, 1.1, 0.14), hull, [
    0,
    0.52,
    PLAN.frontZ + 0.68,
  ]);
  add(
    bevelPanel(VIEWPORT.width + 1.2, 0.66, 0.12, 0.1),
    hullEdge,
    [0, 0.98, PLAN.frontZ + 0.94],
    [-1.15, 0, 0],
  );
  for (const s of [-1, 1] as const) {
    add(
      quad(VIEWPORT.width * 0.4, 0.32),
      screenMaterial(bag, seed + 70 + s, 8, s > 0 ? 3 : 0),
      [s * VIEWPORT.width * 0.23, 1.12, PLAN.frontZ + 1.02],
      [-1.15, 0, 0],
    );
  }
  add(bevelBox(VIEWPORT.width + 1.4, 0.05, 0.06, 0.012), accentStrip, [
    0,
    0.92,
    PLAN.frontZ + 1.22,
  ]);

  /* ── What is outside ───────────────────────────────────────────────────*/
  add(
    quad(260, 150),
    starFieldMaterial(bag, quality.stars > 1500 ? 210 : 130),
    [0, 28, -110],
  );

  const giant = new Mesh(
    track(new SphereGeometry(16, quality.name === "full" ? 96 : 48, 48)),
    gasGiantMaterial(bag, seed),
  );
  // Off-centre and low, so the viewport frames a limb rather than a bullseye.
  giant.position.set(-11, 6, -66);
  giant.castShadow = false;
  giant.receiveShadow = false;
  group.add(giant);

  const screen = createVideoScreen({
    webm: "/ship/bridge/gasgiant.webm",
    mp4: "/ship/bridge/gasgiant.mp4",
  });
  const screenMesh = new Mesh(
    track(quad(VIEWPORT.width - 0.06, VIEWPORT.height - 0.06)),
    screen.material,
  );
  screenMesh.position.set(
    0,
    VIEWPORT.sill + VIEWPORT.height / 2,
    PLAN.frontZ + 0.05,
  );
  screenMesh.visible = false;
  screenMesh.castShadow = false;
  screenMesh.receiveShadow = false;
  group.add(screenMesh);
  void screen.ready.then((ok) => {
    screenMesh.visible = ok;
  });

  /* ── Helm arc ──────────────────────────────────────────────────────────
     The mid-ground. Two forward stations on a low arc between the chair and
     the viewport, at roughly the room's half-depth.

     This is the single most important addition of the rebuild. Perspective is
     only legible against objects at intermediate distances; with an empty floor
     between the chair and the far wall, four metres and twelve metres project
     almost identically and the room collapses. */
  for (const side of [-1, 1] as const) {
    const hx = side * HELM.halfSpan * 0.52;
    const yaw = Math.atan2(-hx, 9 - HELM.z);

    add(bevelPanel(3.0, 0.92, 1.5, 0.16), hull, [hx, 0.46, HELM.z], [0, yaw, 0]);
    add(
      bevelPanel(2.8, 1.2, 0.1, 0.12),
      hullEdge,
      [hx, 0.95, HELM.z + 0.12],
      [-1.3, yaw, 0],
    );
    add(
      quad(2.3, 0.82),
      screenMaterial(bag, seed + 400 + side, 20, side > 0 ? 2 : 1),
      [hx, 1.4, HELM.z - 0.36],
      [-0.36, yaw, 0],
    );
    // Length on X so the yaw aligns it along the console face.
    add(bevelBox(2.6, 0.05, 0.06, 0.012), accentStrip, [
      hx,
      0.94,
      HELM.z + 0.66,
    ], [0, yaw, 0]);
  }

  /* ── Perimeter stations, tucked into the angled walls ──────────────────
     Set into the octagon's cut corners rather than floating off a flat wall,
     which is what makes them read as built into the room. */
  const angled = PLAN.segments.filter((s) => s.kind === "frontAngle");
  angled.forEach((seg, si) => {
    const inward: [number, number] = [Math.sin(seg.yaw), Math.cos(seg.yaw)];
    const along: [number, number] = [inward[1], -inward[0]];

    for (let i = 0; i < 2; i++) {
      const t = (i - 0.5) * (seg.length * 0.42);
      const sx = seg.mid[0] + along[0] * t + inward[0] * 1.35;
      const sz = seg.mid[1] + along[1] * t + inward[1] * 1.35;
      const yaw = seg.yaw;
      const station = si * 2 + i;

      add(bevelPanel(2.7, 0.88, 1.4, 0.16), hull, [sx, 0.44, sz], [0, yaw, 0]);
      add(
        bevelPanel(2.5, 1.15, 0.1, 0.12),
        hullEdge,
        [sx, 0.92, sz + 0.1],
        [-1.32, yaw, 0],
      );
      // Exactly one station of the four runs a green phosphor terminal.
      add(
        quad(2.0, 0.78),
        screenMaterial(
          bag,
          seed + station * 13,
          22,
          station % 4,
          station === 1 ? SHIP.phosphor : SHIP.accent,
        ),
        [sx, 1.34, sz - 0.34],
        [-0.34, yaw, 0],
      );
      add(
        bevelPanel(2.2, 0.96, 0.1, 0.1),
        recess,
        [sx, 1.33, sz - 0.38],
        [-0.34, yaw, 0],
      );

      // Pinhead telltales. At viewing distance a point of colour, not an area.
      add(bevelBox(0.06, 0.05, 0.06, 0.012), ledGreen, [
        sx - 0.8,
        0.97,
        sz + 0.5,
      ]);
      add(bevelBox(0.06, 0.05, 0.06, 0.012), ledWhite, [
        sx - 0.68,
        0.97,
        sz + 0.5,
      ]);
    }
  });

  /* ── Dais and command chair ────────────────────────────────────────────*/
  add(post(CHAIR.daisRadius, CHAIR.daisHeight, 48), recess, [
    0,
    CHAIR.daisHeight / 2,
    CHAIR.z,
  ]);
  add(post(CHAIR.daisRadius + 0.03, 0.06, 48), accentStrip, [
    0,
    CHAIR.daisHeight * 0.55,
    CHAIR.z,
  ]);
  // A step up onto the dais, so the platform reads as raised rather than drawn.
  add(post(CHAIR.daisRadius + 0.7, 0.14, 48), darkPanel, [
    0,
    0.07,
    CHAIR.z,
  ]);
  add(post(0.2, 0.46, 24), chrome, [0, CHAIR.daisHeight + 0.23, CHAIR.z]);

  const seatY = CHAIR.daisHeight + 0.48;
  add(bevelPanel(0.94, 0.98, 0.14, 0.09), hull, [0, seatY, CHAIR.z + 0.3], [
    -Math.PI / 2,
    0,
    0,
  ]);
  // An open cylinder section, never a taper — a solid of revolution that
  // narrows reads as a traffic cone at any scale.
  add(seatBack(0.34, 1.1), hull, [0, seatY + 0.58, CHAIR.z - 0.14], [
    -0.09,
    0,
    0,
  ]);
  for (const s of [-1, 1] as const) {
    add(bevelBox(0.13, 0.11, 0.8, 0.02), hullEdge, [
      s * 0.62,
      seatY + 0.27,
      CHAIR.z + 0.2,
    ]);
    add(bevelBox(0.1, 0.28, 0.1, 0.02), hullEdge, [
      s * 0.62,
      seatY + 0.13,
      CHAIR.z + 0.52,
    ]);
  }

  /* ── Light ─────────────────────────────────────────────────────────────*/
  const hemi = new HemisphereLight(0xbcd0e8, 0x090c11, 0.35);
  group.add(hemi);

  const key = new DirectionalLight(0xcfe0f5, 0.85);
  key.position.set(-5, 8, -22);
  key.target.position.set(0, 1.6, -2);
  if (quality.shadowLights > 0) {
    // The shadow camera has to be *sized*. A DirectionalLight's is orthographic
    // and defaults to a ±5 unit box, which on this room covers a fifth of the
    // floor — and reads as "shadows are subtle" rather than "shadows are
    // missing from most of the frame".
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -PLAN.halfWidth - 3;
    sc.right = PLAN.halfWidth + 3;
    sc.top = ROOM.ceilingCrown + 6;
    sc.bottom = -ROOM.ceilingCrown - 6;
    sc.near = 0.5;
    sc.far = 90;
    sc.updateProjectionMatrix();
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.035;
  }
  group.add(key, key.target);

  // The chair's rim. The key comes through the viewport, so the chair's
  // camera-facing side is by definition its shadow side.
  const rim = new DirectionalLight(0xd6e4f7, 0.9);
  rim.position.set(2.4, 5.6, -6);
  rim.target.position.set(0, CHAIR.daisHeight + 0.9, CHAIR.z);
  group.add(rim, rim.target);

  const fill = new DirectionalLight(0xb9c8dc, 0.22);
  fill.position.set(3, 6, 14);
  fill.target.position.set(0, 1.4, -6);
  group.add(fill, fill.target);

  const practicals: PointLight[] = [];
  for (const x of [-1.5, 1.5]) {
    for (const z of [-13, -8, -3, 3]) {
      const p = new PointLight(0xdce8f7, 11, 20, 2);
      p.position.set(x, ROOM.ceilingCrown - 0.7, z);
      practicals.push(p);
      group.add(p);
    }
  }

  /* ── Motion ────────────────────────────────────────────────────────────*/
  const restPos = BRIDGE_CAMERA.position;
  const restTarget = BRIDGE_CAMERA.target;

  return {
    group,
    camera: {
      position: [...restPos] as [number, number, number],
      target: [...restTarget] as [number, number, number],
      fov: BRIDGE_CAMERA.fov,
    },
    update(state: FrameState) {
      giant.rotation.y += state.delta * 0.02;

      const cam = opts.camera;
      const px = state.pointer.x * 0.6;
      const py = state.pointer.y * 0.32;

      // Portrait recompose. At 0.46 aspect a target set for 16:9 puts the
      // viewport dead centre, which is exactly where the copy card sits.
      const portrait = Math.max(0, Math.min(1, (0.95 - state.aspect) / 0.4));
      const targetY = restTarget[1] + portrait * 1.7;
      const camY = restPos[1] + portrait * 0.8;
      const camZ = restPos[2] - portrait * 3.2;

      cam.position.x += (restPos[0] + px - cam.position.x) * 0.045;
      cam.position.y += (camY + py - cam.position.y) * 0.045;
      cam.position.z = camZ;
      cam.lookAt(restTarget[0] + px * 0.35, targetY + py * 0.2, restTarget[2]);

      const lit = state.boot;
      hemi.intensity = 0.35 * lit;
      key.intensity = 0.85 * lit;
      rim.intensity = 0.9 * lit;
      fill.intensity = 0.22 * lit;
      for (const p of practicals) p.intensity = 11 * lit;
    },
    dispose() {
      // The video element holds a decoder and a network handle, neither of
      // which the geometry sweep below would touch.
      screen.dispose();
      for (const g of geometries) g.dispose();
      for (const m of bag.list) m.dispose();
      group.clear();
    },
  };
}

export { BRIDGE_PLAN_CONFIG };
