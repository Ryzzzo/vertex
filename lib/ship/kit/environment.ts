/**
 * The environment map, generated rather than downloaded.
 *
 * ── Why this file is the largest single fidelity lever in the build ───────
 *
 * A metallic surface has no diffuse term. All it can do is reflect. With no
 * environment assigned, `metalness: 1` reflects *nothing* and resolves to a
 * flat colour — which is exactly why a bridge full of correctly-specified
 * metal panels can read as untextured primitives welded together. The geometry
 * was never the problem; there was nothing in the world for it to reflect.
 *
 * Both skills say the same thing and this build ignored it on the first pass:
 * check the environment map before adding triangles. It is the cheaper lever
 * and it is usually the actual defect.
 *
 * ── Why not `RoomEnvironment` ─────────────────────────────────────────────
 *
 * three ships `examples/jsm/environments/RoomEnvironment.js` and the PBR
 * reference demo uses it. It imports from `'three'` — the WebGL build — while
 * everything here imports from `'three/webgpu'`. Using it would pull a second
 * complete copy of three into the bundle, roughly 128 KB gz against 31 KB of
 * headroom. That is the dual-instance trap, and it is invisible until you
 * measure.
 *
 * Writing our own is about forty lines and it is better on the merits anyway.
 * `RoomEnvironment` is a neutral-to-warm photographic studio; this ship is
 * deliberately cold and has no warm tone anywhere in it. An environment
 * authored against the palette is the entire activity of getting a scene to
 * read — a generic one would put the wrong colour in every reflection.
 */
import {
  BackSide,
  BoxGeometry,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  PMREMGenerator,
  Scene,
  type Renderer,
  type Texture,
} from "three/webgpu";
import { SHIP } from "../palette";

/**
 * A small room whose only purpose is to be reflected.
 *
 * Nothing here is ever seen directly. It is a lighting rig: bright bands
 * overhead standing in for the ceiling runs, a dark floor, cool side walls, and
 * one brighter panel forward standing in for the viewport. Metal in the bridge
 * then reflects a room that agrees with the room it is actually in — which is
 * what separates "a reflection" from "the right reflection".
 */
function buildEnvironmentScene(): { scene: Scene; dispose: () => void } {
  const scene = new Scene();
  const geometries: BoxGeometry[] = [];
  const materials: (MeshBasicNodeMaterial | MeshStandardNodeMaterial)[] = [];

  const box = (
    w: number,
    h: number,
    d: number,
    pos: [number, number, number],
    colour: string,
    emissive: boolean,
  ) => {
    const g = new BoxGeometry(w, h, d);
    geometries.push(g);
    let m: MeshBasicNodeMaterial | MeshStandardNodeMaterial;
    if (emissive) {
      m = new MeshBasicNodeMaterial({ color: colour });
    } else {
      m = new MeshStandardNodeMaterial({ color: colour, roughness: 1 });
    }
    materials.push(m);
    const mesh = new Mesh(g, m);
    mesh.position.set(...pos);
    scene.add(mesh);
    return mesh;
  };

  // The enclosing shell, seen from inside.
  const shellGeo = new BoxGeometry(12, 8, 12);
  geometries.push(shellGeo);
  const shellMat = new MeshStandardNodeMaterial({
    color: SHIP.recess,
    side: BackSide,
    roughness: 1,
  });
  materials.push(shellMat);
  scene.add(new Mesh(shellGeo, shellMat));

  // Two bright bands overhead. These are what a bevel catches when it turns
  // through the key, and they are the reason a chamfered edge reads as
  // machined rather than as a shaded polygon.
  box(1.6, 0.1, 11, [-2.4, 3.7, 0], "#FFFFFF", true);
  box(1.6, 0.1, 11, [2.4, 3.7, 0], "#FFFFFF", true);

  // A cool wash from either side, so vertical faces are not black.
  box(0.1, 5, 10, [-5.6, 1.4, 0], "#5C7A9E", true);
  box(0.1, 5, 10, [5.6, 1.4, 0], "#5C7A9E", true);

  // Forward panel — the viewport's contribution, brighter and bluer.
  box(7, 3.4, 0.1, [0, 2, -5.6], "#9DBEE4", true);

  // Dark deck, so downward-facing surfaces stay grounded and the room does not
  // turn into a lightbox.
  box(11, 0.1, 11, [0, -3.6, 0], "#0A0C10", true);

  return {
    scene,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      scene.clear();
    },
  };
}

/**
 * Generate the environment texture. Called once per renderer, not per room.
 *
 * `sigma` at 0.045 gives soft, broad reflections — sharp enough that a bevel
 * shows a distinct highlight, blurred enough that the fake room never resolves
 * into recognisable boxes on a polished surface.
 */
export function createShipEnvironment(renderer: Renderer): {
  texture: Texture;
  dispose: () => void;
} {
  const pmrem = new PMREMGenerator(renderer);
  const { scene, dispose: disposeScene } = buildEnvironmentScene();
  const target = pmrem.fromScene(scene, 0.045, 0.1, 60);
  disposeScene();

  return {
    texture: target.texture,
    dispose() {
      target.dispose();
      pmrem.dispose();
    },
  };
}
