/**
 * The Dune world — ground, monoliths, the landed ship, and a low sun.
 *
 * Built to a different rule than the bridge. The ship interior earns its
 * fidelity from *density* — ribs, fasteners, seams, practicals, all of it close
 * to the lens. This is the opposite problem: one enormous empty plain, four
 * objects on it, and a sun almost on the horizon. Adding detail here would work
 * against it. What carries a landscape is **shadow length and atmosphere**, and
 * essentially the whole budget for this act goes to those two things.
 *
 * That is the same argument Rule 2 makes about the full-bleed photograph: this
 * is dense, delivered sparsely, and the density is in the light.
 */

import * as THREE from "three";
import {
  DUNE_RADIUS,
  LANDING,
  MONOLITHS,
  SUN_AZ,
  SUN_EL,
  SUN_EL_DUSK,
} from "./ship-layout";
import { WARM } from "./palette";

/**
 * Sand: colour and roughness from one generated map.
 *
 * Two frequencies of value noise plus a ripple term. The ripples are the tell —
 * wind-formed sand has a directional micro-corrugation, and without it a
 * displaced plane reads as a crumpled bedsheet.
 */
function sandMaps(): { color: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const S = 512;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    return c;
  };
  const cc = mk();
  const rc = mk();
  const cg = cc.getContext("2d")!;
  const rg = rc.getContext("2d")!;

  const img = cg.createImageData(S, S);
  const rim = rg.createImageData(S, S);

  // Fixed-seed value noise. Identical on every client, 0 KB of bundle.
  const seed = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const smooth = (x: number, y: number, f: number) => {
    const xf = x * f;
    const yf = y * f;
    const xi = Math.floor(xf);
    const yi = Math.floor(yf);
    const tx = xf - xi;
    const ty = yf - yi;
    const u = tx * tx * (3 - 2 * tx);
    const v = ty * ty * (3 - 2 * ty);
    const a = seed(xi, yi);
    const b = seed(xi + 1, yi);
    const cq = seed(xi, yi + 1);
    const d = seed(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + cq * (1 - u) * v + d * u * v;
  };

  const base = new THREE.Color(WARM.ochre);
  const dark = new THREE.Color(WARM.stone);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const n = smooth(x, y, 0.02) * 0.6 + smooth(x, y, 0.09) * 0.3;
      // The ripple. High frequency, one direction, low amplitude.
      // 0.055, down from 0.1. Wind ripple is a *low-contrast* corrugation;
      // at the first amplitude it survived minification as noise instead of
      // averaging out to a tone, which is what real sand does with distance.
      const rip = 0.055 * Math.sin((x * 0.55 + y * 0.13) + smooth(x, y, 0.03) * 6);
      const v = Math.min(1, Math.max(0, n + rip));
      img.data[i] = (dark.r + (base.r - dark.r) * v) * 255;
      img.data[i + 1] = (dark.g + (base.g - dark.g) * v) * 255;
      img.data[i + 2] = (dark.b + (base.b - dark.b) * v) * 255;
      img.data[i + 3] = 255;
      // Rougher in the troughs, where the fines collect.
      const r = 205 - v * 45;
      rim.data[i] = rim.data[i + 1] = rim.data[i + 2] = r;
      rim.data[i + 3] = 255;
    }
  }
  cg.putImageData(img, 0, 0);
  rg.putImageData(rim, 0, 0);

  const color = new THREE.CanvasTexture(cc);
  color.colorSpace = THREE.SRGBColorSpace;
  const rough = new THREE.CanvasTexture(rc);
  for (const t of [color, rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // 11, down from 26. Over a 220-unit disc the higher value drove the ripple
    // period below a pixel through the mid-ground and the sand read as
    // corduroy — the same class of error as the v2 log's fog frequency
    // constant, one texture out. Correct detail at the wrong frequency is noise.
    t.repeat.set(11, 11);
    // 16, and it is not optional here. The plain is seen at a grazing angle
    // from 20 metres up, which is the worst case for anisotropic minification:
    // at 8 the ripple aliased into a shimmering moiré that read as fabric.
    t.anisotropy = 16;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
  }
  return { color, rough };
}

export type DuneWorld = {
  group: THREE.Group;
  sun: THREE.DirectionalLight;
  /** The monolith meshes, in `MONOLITHS` order, for hover highlighting. */
  monoliths: THREE.Mesh[];
  update(u: {
    descent: number;
    arrival: number;
    spread: number;
    dusk: number;
    hovered: number;
    t: number;
  }): void;
};

export function buildDune(): DuneWorld {
  const group = new THREE.Group();
  group.name = "dune";

  const { color, rough } = sandMaps();

  /* ── The plain ────────────────────────────────────────────────────────
     A disc, not a plane, so the horizon is a real geometric edge the fog can
     eat rather than a hard rectangle running off frame. 160 radial segments
     because at a grazing sun angle the silhouette of the far edge is on
     screen, and a low-poly circle reads as a cog. */
  const geo = new THREE.CircleGeometry(DUNE_RADIUS, 160, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);

  /* Dune displacement, applied on the CPU at build time. A displacement map
     would need a subdivided mesh anyway, and doing it here means the shadow
     camera and the fog depth both see the real surface. */
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    // Flat where the monoliths and the ship stand; dunes build with distance,
    // so the foreground stays readable and the horizon stays interesting.
    const amp = Math.min(1, Math.max(0, (d - 26) / 90));
    const h =
      Math.sin(x * 0.031 + Math.cos(z * 0.017) * 2.1) * 3.1 +
      Math.sin(z * 0.048 - x * 0.011) * 1.7;
    pos.setY(i, h * amp);
  }
  geo.computeVertexNormals();

  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: color,
      roughnessMap: rough,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.65,
    }),
  );
  ground.receiveShadow = true;
  group.add(ground);

  /* ── The monoliths ────────────────────────────────────────────────────
     Warm stone, matte, unequal, and not in size order. Four identical slabs
     read as a chart; four different ones read as architecture built at
     different times for different reasons, which is what a portfolio is. */
  const stone = new THREE.MeshStandardMaterial({
    color: new THREE.Color(WARM.stone),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.5,
  });

  const monoliths: THREE.Mesh[] = [];
  for (const m of MONOLITHS) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(m.w, m.h, m.d), stone.clone());
    mesh.position.set(m.x, m.h / 2, m.z);
    mesh.rotation.y = m.yaw;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    monoliths.push(mesh);
    group.add(mesh);

    /* A recessed slot up one face, lit from inside. This is the only artificial
       light in the act and the only thing that says these are *built* rather
       than eroded. It is also the hover affordance. */
    const slot = new THREE.Mesh(
      new THREE.PlaneGeometry(m.w * 0.14, m.h * 0.66),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(WARM.sand),
        toneMapped: false,
        transparent: true,
        opacity: 0,
      }),
    );
    slot.position.set(
      m.x + Math.sin(m.yaw) * (m.d / 2 + 0.02) + Math.cos(m.yaw) * m.w * 0.22,
      m.h * 0.46,
      m.z + Math.cos(m.yaw) * (m.d / 2 + 0.02) - Math.sin(m.yaw) * m.w * 0.22,
    );
    slot.rotation.y = m.yaw;
    slot.name = "slot";
    mesh.userData.slot = slot;
    group.add(slot);
  }

  /* ── The landed ship, for scale ───────────────────────────────────────
     Read at 25 metres in silhouette, so it is four forms and no detail: hull,
     canopy, two gear legs. Anything finer is invisible and costs frame time. */
  const ship = new THREE.Group();
  ship.name = "landed-ship";
  ship.position.set(LANDING.x, LANDING.y, LANDING.z);
  ship.rotation.y = -0.5;
  /* Matte, not polished. At metalness 0.85 the low sun put a mirror streak down
     the whole hull and the ship read as a lit capsule rather than as a landed
     object — a machine that has just crossed an atmosphere is dusty. */
  const hullMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#6a6255"),
    roughness: 0.72,
    metalness: 0.25,
    envMapIntensity: 0.7,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 3.2, 6, 16), hullMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.5;
  body.castShadow = true;
  ship.add(body);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#101820"),
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.4,
      thickness: 0.2,
      transparent: true,
    }),
  );
  canopy.position.set(1.5, 1.9, 0);
  ship.add(canopy);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 8), hullMat);
    leg.position.set(-0.6, 0.75, s * 0.75);
    leg.rotation.z = s * 0.12;
    leg.castShadow = true;
    ship.add(leg);
  }
  group.add(ship);

  /* ── The sun ──────────────────────────────────────────────────────────
     One directional light almost on the horizon. The shadow frustum is wide
     and shallow because the shadows are *long* — at 7.7° elevation a 14-metre
     monolith throws a shadow over 100 metres, and a frustum sized for the
     objects rather than for their shadows clips them halfway across the plain,
     which reads as the ground changing colour. */
  const sun = new THREE.DirectionalLight(new THREE.Color(WARM.sand), 3.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(0, 0, 0);
  group.add(sun);
  group.add(sun.target);

  /* Sky fill from the opposite side, dim and cool-ish. Without it the shadow
     sides of the monoliths go to pure black and the act loses its volume —
     the same lesson as v2's second fill card (§7), in a different world. */
  const fill = new THREE.HemisphereLight(
    new THREE.Color(WARM.sand).multiplyScalar(0.55),
    new THREE.Color(WARM.ink),
    0.55,
  );
  group.add(fill);

  /* The sun disc itself, sitting in the haze just above the horizon. */
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(9, 40),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(WARM.sand),
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
    }),
  );
  disc.name = "sun-disc";
  group.add(disc);

  const placeSun = (el: number) => {
    const d = 190;
    const y = Math.sin(el) * d;
    const h = Math.cos(el) * d;
    sun.position.set(Math.sin(SUN_AZ) * h, Math.max(2, y), Math.cos(SUN_AZ) * h);
    disc.position.copy(sun.position).multiplyScalar(0.92);
    disc.lookAt(0, 6, 0);
  };
  placeSun(SUN_EL);

  return {
    group,
    sun,
    monoliths,
    update({ descent, arrival, spread, dusk, hovered, t }) {
      // The sun drops into dusk across the footer beat. Everything else in the
      // act is static; the light is what moves, and the shadows sweeping out
      // across the plain is the whole portfolio reveal.
      const el = SUN_EL + (SUN_EL_DUSK - SUN_EL) * dusk;
      placeSun(el);
      sun.intensity = 3.6 * (1 - dusk * 0.42) * (0.35 + spread * 0.65);
      // Warmer and redder as it sets. A sun that only dims reads as a cloud.
      sun.color.setStyle(WARM.sand).lerp(new THREE.Color(WARM.ochre), dusk * 0.8);

      for (let i = 0; i < monoliths.length; i++) {
        const slot = monoliths[i].userData.slot as THREE.Mesh;
        const sm = slot.material as THREE.MeshBasicMaterial;
        const own = i === hovered ? 1 : 0;
        // Staggered so the four do not light as a block — reading order, ~70ms
        // apart in scroll terms.
        const reveal = Math.min(1, Math.max(0, spread * 4 - i * 0.55));
        sm.opacity = reveal * (0.34 + own * 0.66) * (1 - dusk * 0.25);
      }

      // Touchdown: the ship settles the last few centimetres and the dust
      // plume is a one-shot on `arrival`. Both are pure functions of scroll.
      ship.position.y = LANDING.y + (1 - arrival) * 1.4 * (1 - descent * 0.3);
      ship.rotation.z = (1 - arrival) * 0.06;
      void t;
    },
  };
}
