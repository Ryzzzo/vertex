/**
 * Room 01 — the Bridge.
 *
 * ── The composition, read off the reference rather than described ─────────
 *
 * Symmetric one-point perspective on the centre axis. A chamfered viewport
 * dominates the far wall with a gas giant behind it. Three console pods per
 * side recede toward it. A command chair sits small and mid-ground on a raised
 * dais, its headrest well below the viewport sill. A coffered ceiling carries
 * two longitudinal light strips that do most of the lighting, and the deck is
 * dark plate with inscribed seams.
 *
 * Grey, white, black. Blue appears in the star field, the screens and the
 * interactive highlights, and nowhere else.
 *
 * ── The three failures this layout exists to avoid ────────────────────────
 *
 * The previous bridge was rejected on camera, palette and scale, and each has a
 * number here rather than an intention:
 *
 *   Cramped — the chair back filled a third of the frame and occluded the
 *     viewport. Here the camera is at y=3.5 and z=+7.0 with a 55° vertical
 *     field, and the chair tops out at y=1.88 at z=-2.2. That puts the chair
 *     silhouette roughly 8° below the camera axis and the viewport sill roughly
 *     1.4° below it — the chair sits in the lower third and never crosses the
 *     glass. Verified by looking, not by this arithmetic.
 *
 *   Palette — a warm tan banded planet that read as wooden venetian blinds.
 *     The gas giant here is cold and its bands are warped by a second noise
 *     octave so they shear rather than run parallel. Parallel stripes are the
 *     failure; turbulence is atmosphere.
 *
 *   Scale — nothing conveyed room size. Here the ceiling and the deck are both
 *     in frame with their perspective lines converging, the side walls run the
 *     full 23 m of the room, and there is a deliberate expanse of empty deck in
 *     the foreground. Spaciousness comes from what is in the corners of the
 *     frame, not from the lens.
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
  post,
  quad,
  seatBack,
} from "../kit/shapes";
import {
  accentStripMaterial,
  chromeMaterial,
  darkPanelMaterial,
  deckMaterial,
  gasGiantMaterial,
  hullEdgeMaterial,
  hullMaterial,
  markedHullMaterial,
  materialBag,
  recessMaterial,
  screenMaterial,
  starFieldMaterial,
  stripMaterial,
} from "../kit/materials";
import { createVideoScreen } from "../kit/videoScreen";
import type { FrameState, RoomModule } from "../scene/types";
import type { QualityTier } from "../scene/quality";

/* ── Layout. Every number the room's proportions depend on, in one place. ── */

const ROOM = {
  halfWidth: 9,
  ceiling: 5.6,
  /** The viewport wall. */
  farZ: -14,
  /** Rear bulkhead, behind the camera — closes the box so nothing reads open. */
  nearZ: 9,
} as const;

const VIEWPORT = {
  width: 8.2,
  height: 3.1,
  /** Bottom edge. Above the chair's headrest (1.88) by design. */
  sill: 1.95,
  frame: 0.5,
} as const;

const CHAIR = { z: -2.2, daisRadius: 1.65, daisHeight: 0.3 } as const;

/**
 * Console pods, per side. Sliced to the quality tier's station count.
 *
 * Pushed outboard and spread further apart than the first pass, where they
 * overlapped one another in projection and crowded the lower third — the
 * stations should flank the viewport and lead the eye to it, not compete with
 * it for the same screen space.
 */
const STATION_Z = [-4.4, -7.8, -11.0] as const;
const STATION_X = 6.6;

export const BRIDGE_CAMERA = {
  position: [0, 3.5, 7.0] as [number, number, number],
  target: [0, 2.9, ROOM.farZ] as [number, number, number],
  /** Vertical. At 16:9 this is ~86° horizontal — wide enough to hold both side
   *  walls and the ceiling without the barrel distortion a 75° vertical would
   *  put on the straight panel runs. */
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

  const add = (
    g: BufferGeometry,
    m: Material,
    pos: [number, number, number],
    rot?: [number, number, number],
  ) => {
    const mesh = new Mesh(track(g), m);
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    group.add(mesh);
    return mesh;
  };

  /* ── Deck ──────────────────────────────────────────────────────────────
     One plate with the seams inscribed by the material rather than modelled.
     A deck built from individual plate meshes is several hundred draw calls
     for a pattern a grid function returns for free. */
  const deckLength = ROOM.nearZ - ROOM.farZ;
  add(
    quad(ROOM.halfWidth * 2, deckLength),
    deckMaterial(bag, quality.deckDivisions),
    [0, 0, (ROOM.nearZ + ROOM.farZ) / 2],
    [-Math.PI / 2, 0, 0],
  );

  /* ── Ceiling ───────────────────────────────────────────────────────────
     Dark, so it reads as a lid rather than a fifth wall, with the coffer ribs
     and two light runs doing the perspective work. The ribs are what carry
     depth — a flat dark ceiling gives the eye nothing to measure the room by. */
  add(
    quad(ROOM.halfWidth * 2, deckLength),
    recess,
    [0, ROOM.ceiling, (ROOM.nearZ + ROOM.farZ) / 2],
    [Math.PI / 2, 0, 0],
  );

  // Ribs are DARK. The first pass made them `hullEdge`, and a run of bright
  // horizontal bars across the ceiling read as venetian blinds — the exact
  // texture the previous bridge was rejected for, reproduced overhead in white.
  // A coffered ceiling is recesses with light between them, so the structure
  // has to be the shadow and the strips have to be the only bright thing up
  // there.
  const ribSpan = deckLength / (quality.ceilingRibs + 1);
  const ribGeo = track(bevelBox(ROOM.halfWidth * 2 - 0.4, 0.17, 0.3));
  const ribLightGeo = track(bevelBox(ROOM.halfWidth * 2 - 1.9, 0.06, 0.07, 0.015));
  for (let i = 1; i <= quality.ceilingRibs; i++) {
    const z = ROOM.farZ + ribSpan * i;
    const rib = new Mesh(ribGeo, recess);
    rib.position.set(0, ROOM.ceiling - 0.09, z);
    group.add(rib);

    // A lit inlay every third coffer. Every other one, against the two long
    // runs already up there, turned the ceiling into a solid sheet of light —
    // the ceiling is nearly half the frame, so it is the fastest surface in the
    // room to overload.
    if (i % 3 === 1) {
      const inlay = new Mesh(ribLightGeo, strip);
      inlay.position.set(0, ROOM.ceiling - 0.2, z);
      group.add(inlay);
    }
  }

  // The two longitudinal runs. These are the room's actual light source, and
  // their convergence toward the viewport is the strongest depth cue in frame.
  for (const x of [-2.8, 2.8]) {
    add(bevelBox(0.3, 0.1, deckLength - 1.2), strip, [
      x,
      ROOM.ceiling - 0.28,
      (ROOM.nearZ + ROOM.farZ) / 2,
    ]);
    // A recessed housing around each run so the light reads as built in.
    add(bevelBox(0.72, 0.3, deckLength - 1.0), recess, [
      x,
      ROOM.ceiling - 0.16,
      (ROOM.nearZ + ROOM.farZ) / 2,
    ]);
  }

  /* ── Side walls ────────────────────────────────────────────────────────
     The signature motif, and the thing that makes the reference read as
     cinematic rather than architectural: a near-black panel with a **glowing
     chamfered outline traced around it**.

     Not a white panel with a light near it. The outline is the light source,
     the panel is the dark ground it reads against, and the panel's own bevel
     carries the reflection of the outline back into the room. Inverting those
     two roles is the entire difference between this and a lit interior.

     Geometry is built once per course and shared across all 28 placements.
     Twenty-eight identical shapes allocated separately is the kit-of-parts
     principle stated and then ignored — one mesh, many placements, is the
     whole reason a room like this costs kilobytes. */
  const panelCount = 7;
  const panelPitch = deckLength / panelCount;
  const panelW = panelPitch - 0.24;
  // 0.05, down from 0.085. The reference outlines are hairlines against a large
  // dark panel; at 0.085 they read as wide bands and the panel becomes a small
  // dark hole in a white surround, which inverts the ratio again.
  const trim = 0.05;

  // Shared geometry. Disposed once via `geometries`, referenced many times.
  const upperPanelGeo = track(bevelPanel(panelW, 2.44, 0.16));
  const lowerPanelGeo = track(bevelPanel(panelW, 2.04, 0.16));
  const upperFrameGeo = track(
    bevelFrame(panelW + 0.1, 2.54, panelW + 0.1 - trim * 2, 2.54 - trim * 2, 0.07, 0.16, 0.012),
  );
  const lowerFrameGeo = track(
    bevelFrame(panelW + 0.1, 2.14, panelW + 0.1 - trim * 2, 2.14 - trim * 2, 0.07, 0.16, 0.012),
  );

  const placeShared = (
    g: BufferGeometry,
    m: Material,
    pos: [number, number, number],
    rot: [number, number, number],
  ) => {
    const mesh = new Mesh(g, m);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    group.add(mesh);
  };

  for (const side of [-1, 1] as const) {
    const x = ROOM.halfWidth * side;
    const yaw: [number, number, number] = [0, (-Math.PI / 2) * side, 0];

    // The wall behind the panels, so the gaps read as depth rather than holes.
    add(
      quad(deckLength, ROOM.ceiling),
      recess,
      [x, ROOM.ceiling / 2, (ROOM.nearZ + ROOM.farZ) / 2],
      yaw,
    );

    for (let i = 0; i < panelCount; i++) {
      const z = ROOM.farZ + panelPitch * (i + 0.5);

      // Every third panel carries hull stencilling. Every panel marked would
      // read as wallpaper; one in three reads as a hull where only some plates
      // are access panels, which is what real hardware looks like.
      placeShared(
        upperPanelGeo,
        i % 3 === 1 ? marked : darkPanel,
        [x - 0.12 * side, 4.0, z],
        yaw,
      );
      placeShared(
        lowerPanelGeo,
        i % 3 === 2 ? marked : darkPanel,
        [x - 0.12 * side, 1.35, z],
        yaw,
      );

      // The outlines, standing proud of the panel face so they cast their own
      // highlight down the chamfer rather than sitting flush and flat.
      placeShared(upperFrameGeo, strip, [x - 0.19 * side, 4.0, z], yaw);
      placeShared(lowerFrameGeo, strip, [x - 0.19 * side, 1.35, z], yaw);
    }

    // Continuous strips: one in the channel between panel courses, one at the
    // deck line washing the floor.
    add(
      bevelBox(0.08, 0.1, deckLength - 0.6, 0.015),
      strip,
      [x - 0.22 * side, 2.62, (ROOM.nearZ + ROOM.farZ) / 2],
    );
    add(
      bevelBox(0.08, 0.08, deckLength - 0.6, 0.015),
      strip,
      [x - 0.22 * side, 0.16, (ROOM.nearZ + ROOM.farZ) / 2],
    );
  }

  /* ── Far wall and the viewport ─────────────────────────────────────────
     Built as four panels around the opening plus a chamfered frame, rather
     than a wall with a hole punched in it. The frame is the piece that reads. */
  const vpTop = VIEWPORT.sill + VIEWPORT.height;
  const vpHalf = VIEWPORT.width / 2;

  // The far wall is dark field, like the sides. It exists to be the ground the
  // viewport's glow reads against.
  add(quad(ROOM.halfWidth * 2, VIEWPORT.sill), darkPanel, [
    0,
    VIEWPORT.sill / 2,
    ROOM.farZ,
  ]);
  add(quad(ROOM.halfWidth * 2, ROOM.ceiling - vpTop), darkPanel, [
    0,
    (ROOM.ceiling + vpTop) / 2,
    ROOM.farZ,
  ]);
  for (const side of [-1, 1] as const) {
    const w = ROOM.halfWidth - vpHalf;
    add(quad(w, VIEWPORT.height), darkPanel, [
      side * (vpHalf + w / 2),
      VIEWPORT.sill + VIEWPORT.height / 2,
      ROOM.farZ,
    ]);
  }

  // The structural surround, in pale metal — the one large white form on this
  // wall, matching how the reference keeps its viewport housing bright while
  // the wall around it goes black.
  add(
    bevelFrame(
      VIEWPORT.width + VIEWPORT.frame * 2,
      VIEWPORT.height + VIEWPORT.frame * 2,
      VIEWPORT.width,
      VIEWPORT.height,
      0.34,
    ),
    hull,
    [0, VIEWPORT.sill + VIEWPORT.height / 2, ROOM.farZ + 0.2],
  );

  // And the glowing outline traced around it — the same motif as every wall
  // panel, at the scale of the thing the room is built around.
  add(
    bevelFrame(
      VIEWPORT.width + VIEWPORT.frame * 2 + 0.16,
      VIEWPORT.height + VIEWPORT.frame * 2 + 0.16,
      VIEWPORT.width + VIEWPORT.frame * 2,
      VIEWPORT.height + VIEWPORT.frame * 2,
      0.08,
      0.3,
      0.014,
    ),
    strip,
    [0, VIEWPORT.sill + VIEWPORT.height / 2, ROOM.farZ + 0.3],
  );
  // Accent trim on the inner lip — one of the three places blue is allowed.
  add(
    bevelFrame(
      VIEWPORT.width + 0.14,
      VIEWPORT.height + 0.14,
      VIEWPORT.width,
      VIEWPORT.height,
      0.06,
      0.24,
      0.01,
    ),
    accentStrip,
    [0, VIEWPORT.sill + VIEWPORT.height / 2, ROOM.farZ + 0.36],
  );

  /**
   * The forward console bank, under the viewport.
   *
   * The first pass left the far wall a flat grey expanse either side of the
   * window, which is where the frame lost most of its density — Rule 2's point
   * is that a surface reads as cheap when it carries too little information,
   * and a 18 m wall with one hole in it carries almost none. The reference has
   * a continuous bank here, and it is also what stops the viewport looking like
   * a picture hung on a wall.
   */
  add(bevelPanel(VIEWPORT.width + 1.4, 0.72, 1.0, 0.14), hull, [
    0,
    0.5,
    ROOM.farZ + 0.62,
  ]);
  add(
    bevelPanel(VIEWPORT.width + 1.0, 0.62, 0.12, 0.1),
    hullEdge,
    [0, 0.93, ROOM.farZ + 0.86],
    [-1.15, 0, 0],
  );
  add(
    quad(VIEWPORT.width * 0.42, 0.3),
    screenMaterial(bag, seed + 71, 8),
    [-VIEWPORT.width * 0.24, 1.06, ROOM.farZ + 0.94],
    [-1.15, 0, 0],
  );
  add(
    quad(VIEWPORT.width * 0.42, 0.3),
    screenMaterial(bag, seed + 72, 8),
    [VIEWPORT.width * 0.24, 1.06, ROOM.farZ + 0.94],
    [-1.15, 0, 0],
  );
  add(bevelBox(VIEWPORT.width + 1.2, 0.04, 0.05), accentStrip, [
    0,
    0.87,
    ROOM.farZ + 1.12,
  ]);

  // Vertical panel divisions on the far wall, so it is panelled rather than
  // blank. Recessed, because the joint is what makes a panel read as a panel.
  for (const s of [-1, 1] as const) {
    for (const d of [0, 1] as const) {
      add(bevelBox(0.09, ROOM.ceiling - 0.4, 0.06), recess, [
        s * (vpHalf + 0.95 + d * 1.65),
        ROOM.ceiling / 2,
        ROOM.farZ + 0.06,
      ]);
    }
    // A strip washing the wall either side of the window.
    add(bevelBox(0.05, VIEWPORT.height * 0.8, 0.05), strip, [
      s * (vpHalf + 0.62),
      VIEWPORT.sill + VIEWPORT.height / 2,
      ROOM.farZ + 0.1,
    ]);
  }

  /* ── What is outside ───────────────────────────────────────────────────
     A star-field backdrop far behind the wall, and the gas giant as real
     geometry between them so it can actually rotate. */
  add(
    quad(190, 110),
    starFieldMaterial(bag, quality.stars > 1500 ? 190 : 120),
    [0, 24, -95],
  );

  const giantMat = gasGiantMaterial(bag, seed);
  const giant = new Mesh(
    track(new SphereGeometry(13, quality.name === "full" ? 96 : 48, 48)),
    giantMat,
  );
  // Off-centre and low, so the viewport frames a limb rather than a bullseye.
  // A planet centred in a centred window is a target; offset, it is a view.
  giant.position.set(-9.5, 5.5, -58);
  group.add(giant);

  /**
   * The viewport display, showing the rendered gas giant.
   *
   * Sits just inside the aperture, sized to the opening. The procedural planet
   * above stays in the scene behind it — if the video never plays, that is what
   * shows through, and it is a correct frame rather than a hole. So the
   * fallback needs no state machine: one surface becomes opaque in front of
   * another, or it does not.
   */
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
    ROOM.farZ + 0.05,
  );
  screenMesh.visible = false;
  group.add(screenMesh);
  void screen.ready.then((ok) => {
    screenMesh.visible = ok;
  });

  /* ── Console pods ──────────────────────────────────────────────────────
     Three per side on the full tier. Each is a plinth, a canted desk and a
     screen, rotated to face the centre axis — the inward cant is what makes a
     row of desks read as stations rather than as furniture. */
  const stations = STATION_Z.slice(0, quality.stationsPerSide);
  stations.forEach((z, i) => {
    for (const side of [-1, 1] as const) {
      const x = STATION_X * side;

      /**
       * Yaw, derived rather than guessed.
       *
       * A panel built in the XY plane faces +Z. Rotating it by θ about Y makes
       * it face (sin θ, 0, cos θ). For this pod's screen to face the camera at
       * (0, 3.5, 7), the wanted direction is normalize(0 - x, 0, 7 - z), which
       * for the middle station works out at about 23° — and its sign is
       * opposite the side, because a pod on -X must turn toward +X.
       *
       * The first pass used ±70° with the sign the other way, and the stations
       * rendered as slabs scattered at random angles with their screens edge-on
       * and unreadable. Deriving it from the camera position instead of picking
       * a number is the difference.
       */
      const yaw = Math.atan2(-x, 7 - z);

      // Plinth.
      add(bevelPanel(2.7, 0.86, 1.4, 0.16), hull, [x, 0.43, z], [0, yaw, 0]);
      // Desk surface, near-flat, catching the ceiling runs.
      add(
        bevelPanel(2.5, 1.15, 0.1, 0.12),
        hullEdge,
        [x, 0.89, z + 0.1],
        [-1.32, yaw, 0],
      );
      // Screen, canted back so it faces the camera rather than the ceiling.
      // Each station runs a different readout — code, bar chart, plot, wave —
      // so the bridge reads as a room where several different things are being
      // watched, rather than six copies of one panel. Blank rectangles were a
      // large part of why the first pass read as empty.
      add(
        quad(2.0, 0.78),
        screenMaterial(
          bag,
          seed + i * 13 + (side > 0 ? 101 : 0),
          22,
          (i * 2 + (side > 0 ? 1 : 0)) % 4,
        ),
        [x, 1.32, z - 0.34],
        [-0.34, yaw, 0],
      );
      // Screen bezel behind it, so the glow sits in something.
      add(
        bevelPanel(2.2, 0.96, 0.1, 0.1),
        recess,
        [x, 1.31, z - 0.38],
        [-0.34, yaw, 0],
      );
      // Base accent — one of the three places blue is allowed.
      add(bevelBox(2.4, 0.05, 0.05), accentStrip, [x, 0.88, z + 0.62], [0, yaw, 0]);
    }
  });

  /* ── Dais and command chair ────────────────────────────────────────────
     Small in frame on purpose. The chair is a scale reference for the room,
     not the subject — the moment the chair becomes the subject, the room stops
     reading as a room. */
  // The dais is DARK. The first pass made it `hullEdge` and it rendered as a
  // bright white disc on a dark deck — a spotlight puddle with a silhouette
  // standing in it, which pulled the eye straight off the viewport. In the
  // reference the platform is the darkest thing in the middle distance and the
  // chair is the bright object on it. That order matters.
  add(post(CHAIR.daisRadius, CHAIR.daisHeight, 40), recess, [
    0,
    CHAIR.daisHeight / 2,
    CHAIR.z,
  ]);
  /**
   * The dais rim light, as a band on the side rather than a disc on the top.
   *
   * The first version was a 0.04-tall cylinder centred at `daisHeight - 0.02`,
   * so its top cap sat exactly on the dais's own top cap. Two coplanar faces at
   * 40 segments z-fought into a blue starburst that dominated the lower third
   * of the frame — the single most visible defect in that pass, and it read as
   * a deliberate effect rather than as the depth-buffer artefact it was.
   *
   * Sunk to the dais's mid-height so no face is shared with anything.
   */
  add(post(CHAIR.daisRadius + 0.03, 0.06, 40), accentStrip, [
    0,
    CHAIR.daisHeight * 0.55,
    CHAIR.z,
  ]);
  // Pedestal, in polished chrome. One chrome element against brushed metal
  // reads as engineering; a room of chrome reads as a car advert.
  add(post(0.2, 0.46, 24), chrome, [0, CHAIR.daisHeight + 0.23, CHAIR.z]);

  /**
   * Seat, back and arms, all in hull so the chair is the bright object on a
   * dark platform.
   *
   * Read at roughly ninety pixels tall, so the silhouette is the entire
   * budget. What makes a chair legible at that size is three steps — a seat pan
   * that projects forward of the back, a back taller than it is wide, and arms
   * that break the outline. An octagonal cap on top of the back read as a bin
   * lid and is gone.
   */
  const seatY = CHAIR.daisHeight + 0.46;
  // Seat pan, well forward of the back. The step between pan and back is the
  // single strongest cue that this is a seat and not a cylinder — the previous
  // pass had them nearly coincident and the chair read as a white mug.
  add(bevelPanel(0.94, 0.98, 0.14, 0.09), hull, [0, seatY, CHAIR.z + 0.3], [
    -Math.PI / 2,
    0,
    0,
  ]);
  // Back — an open cylinder section, never a taper. See `seatBack`: a solid of
  // revolution that narrows reads as a traffic cone at any scale, and a
  // previous build shipped exactly that, parked on the bridge axis directly
  // over the viewport in the establishing frame. Narrower than it is tall, and
  // reclined a few degrees so the top edge catches the ceiling runs.
  //
  // Height is load-bearing twice over. At 1.3 the back topped out at y=2.09,
  // which is above the viewport sill at 1.95 — it cleared the glass only
  // because the camera is elevated, which is a coincidence rather than a
  // design. At 1.1 it tops out at 1.89 and is below the sill in world space,
  // so the chair cannot occlude the window from any camera height.
  add(seatBack(0.34, 1.1), hull, [0, seatY + 0.58, CHAIR.z - 0.14], [
    -0.09,
    0,
    0,
  ]);
  // Arms set well outboard of the 0.34 back radius. Inboard of it they merged
  // into one white mass and the whole chair read as a pillar; the flare is what
  // makes the silhouette say "seat" at ninety pixels.
  for (const s of [-1, 1] as const) {
    add(bevelBox(0.13, 0.11, 0.8), hullEdge, [s * 0.62, seatY + 0.27, CHAIR.z + 0.2]);
    add(bevelBox(0.1, 0.28, 0.1), hullEdge, [s * 0.62, seatY + 0.13, CHAIR.z + 0.52]);
  }

  /* ── Rear bulkhead ─────────────────────────────────────────────────────
     Behind the camera at rest, so it is never in frame — but it closes the box,
     which the scattering composite needs so the room does not fade into an
     open end. */
  add(quad(ROOM.halfWidth * 2, ROOM.ceiling), recess, [
    0,
    ROOM.ceiling / 2,
    ROOM.nearZ,
  ]);

  /* ── Light ─────────────────────────────────────────────────────────────
     The strips are `MeshBasicNodeMaterial`, so they look like they emit but do
     not actually light anything — three has no global illumination. These are
     the lights that do the work, positioned to agree with the strips so the
     lie is consistent. */
  // 0.35, down from 0.95. Ambient is what fills the recesses, and the recesses
  // are supposed to be the black the white panels read against — the reference
  // is a dark room with lit accents, not a lit room. The strips carry the
  // illumination now; this only stops the shadow side going to pure zero.
  const hemi = new HemisphereLight(0xbcd0e8, 0x090c11, 0.35);
  group.add(hemi);

  // Key, coming through the viewport. Cold, and the only shadow caster.
  const key = new DirectionalLight(0xcfe0f5, 0.85);
  key.position.set(-4, 7, -18);
  key.target.position.set(0, 1.6, -2);
  if (quality.shadowLights > 0) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0012;
  }
  group.add(key, key.target);

  // Practicals along the ceiling runs, so the room has falloff down its length
  // rather than one flat exposure.
  const practicals: PointLight[] = [];
  for (const x of [-2.8, 2.8]) {
    for (const z of [-11, -6.5, -2, 2.5]) {
      const p = new PointLight(0xdce8f7, 10, 18, 2);
      p.position.set(x, ROOM.ceiling - 0.5, z);
      practicals.push(p);
      group.add(p);
    }
  }

  /**
   * The camera-side fill.
   *
   * Cheating, and every real lighting setup does it. The key comes through the
   * viewport, which means every surface facing the camera — the chair back, the
   * console fronts, the near ends of the side panels — is by definition facing
   * away from the only directional light in the room. Physically correct, and
   * it rendered the chair as a black blob on a bright disc.
   *
   * Kept dim and cool so it lifts the near surfaces off black without
   * flattening the key's modelling.
   */
  const fill = new DirectionalLight(0xb9c8dc, 0.22);
  fill.position.set(2.5, 5.5, 12);
  fill.target.position.set(0, 1.4, -4);
  group.add(fill, fill.target);

  /* ── Motion ────────────────────────────────────────────────────────────
     One thing happens: the gas giant turns. At 0.02 rad/s a full rotation is
     about five minutes, which is slow enough to be atmosphere and fast enough
     that a visitor who sits for twenty seconds sees it move.

     The camera carries a few degrees of pointer parallax on top. It is not the
     moment — it is what stops a static frame reading as a still. */
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
      const px = state.pointer.x * 0.55;
      const py = state.pointer.y * 0.3;

      /**
       * Portrait recompose.
       *
       * At 375×812 the frame is 0.46 aspect, so a target set for 16:9 puts the
       * viewport dead centre — which is exactly where the copy card sits. The
       * room was rendering correctly and was almost entirely hidden behind its
       * own overlay, which is the kind of defect that only a screenshot finds.
       *
       * Raising the target lifts the window into the upper third and drops the
       * empty foreground deck out of frame, where on a phone it was costing
       * half the screen for nothing.
       */
      const portrait = Math.max(0, Math.min(1, (0.95 - state.aspect) / 0.4));
      const targetY = restTarget[1] + portrait * 1.55;
      const camY = restPos[1] + portrait * 0.7;
      const camZ = restPos[2] - portrait * 2.4;

      // Ease toward the parallax target rather than snapping, so a fast pointer
      // sweep does not whip the camera.
      cam.position.x += (restPos[0] + px - cam.position.x) * 0.045;
      cam.position.y += (camY + py - cam.position.y) * 0.045;
      cam.position.z = camZ;
      cam.lookAt(restTarget[0] + px * 0.35, targetY + py * 0.2, restTarget[2]);

      // The boot brings the practicals and the strips up. Held on one channel
      // so the whole room resolves together rather than in pieces.
      const lit = state.boot;
      hemi.intensity = 0.35 * lit;
      key.intensity = 0.85 * lit;
      fill.intensity = 0.22 * lit;
      for (const p of practicals) p.intensity = 10 * lit;
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
