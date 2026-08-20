/**
 * The kit of parts. Rooms are placements of these, not bespoke models.
 *
 * The argument for a kit is measured: bruno-simon.com ships an entire
 * explorable world in 974 KB across 23 files, and the gap between that and the
 * 12 MB studio sites is instancing, not quality. Interiors are the ideal case —
 * a ship is overwhelmingly the same panel, the same rib, the same conduit,
 * rotated and placed.
 *
 * Everything here returns a `BufferGeometry` in a frame this module authored.
 * That matters: `ExtrudeGeometry` extrudes from z=0 to z=depth rather than
 * centring on the origin, and a previous build lost a debugging round to
 * exactly that class of error — a helper applying its own transform, so every
 * position passed to it was in a frame the caller did not author. Every builder
 * below re-centres explicitly and says so.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
} from "three/webgpu";

/**
 * A rectangle with its corners cut at 45°, centred on the origin in XY.
 *
 * This single outline is most of the room's visual signature. Every panel,
 * every console face and the viewport frame share it, which is what makes a
 * set of unrelated boxes read as one designed vehicle.
 */
export function chamferRect(w: number, h: number, c: number): Shape {
  const x = w / 2;
  const y = h / 2;
  const k = Math.min(c, x, y);
  const s = new Shape();
  s.moveTo(-x + k, -y);
  s.lineTo(x - k, -y);
  s.lineTo(x, -y + k);
  s.lineTo(x, y - k);
  s.lineTo(x - k, y);
  s.lineTo(-x + k, y);
  s.lineTo(-x, y - k);
  s.lineTo(-x, -y + k);
  s.closePath();
  return s;
}

/**
 * A chamfered panel with a hard bevel on its face.
 *
 * The bevel is the whole point and it is not decoration: a flat quad lit by a
 * strip light returns one flat value, and a bevelled edge returns a bright
 * line where it turns through the key. That bright line is what separates a
 * machined panel from a painted rectangle, and it costs two triangles.
 *
 * Centred on the origin in all three axes.
 */
export function bevelPanel(
  w: number,
  h: number,
  depth: number,
  chamfer = 0.12,
  bevel = 0.02,
): BufferGeometry {
  const g = new ExtrudeGeometry(chamferRect(w, h, chamfer), {
    depth: Math.max(depth - bevel * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // ExtrudeGeometry runs 0..depth on z. Re-centre so callers can position by
  // the panel's middle rather than its back face.
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * A chamfered frame — the same outline with a smaller one cut out of it.
 *
 * The viewport surround. Centred on the origin.
 */
export function bevelFrame(
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number,
  depth: number,
  chamfer = 0.18,
  bevel = 0.025,
): BufferGeometry {
  const outer = chamferRect(outerW, outerH, chamfer);
  outer.holes.push(chamferRect(innerW, innerH, chamfer * 0.75));
  const g = new ExtrudeGeometry(outer, {
    depth: Math.max(depth - bevel * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * A box with every visible edge chamfered. Centred.
 *
 * This replaces the plain `BoxGeometry` the first pass used everywhere, and the
 * difference is the whole "boxy and dated" complaint in one function. A hard
 * 90° edge returns a single discontinuity between two flat shaded faces — there
 * is nothing there for a light to catch, so the form reads as an untextured
 * primitive no matter how good the material is. A chamfer as small as 0.02 m
 * puts a third surface at 45° between them, which catches the ceiling runs and
 * draws a bright line down every edge in the room. That line is what the eye
 * reads as "machined".
 *
 * Built by extruding a chamfered rectangle and bevelling the extrusion, so the
 * chamfer runs in all three axes rather than only around the profile.
 */
export function bevelBox(
  w: number,
  h: number,
  d: number,
  chamfer = 0.02,
): BufferGeometry {
  // Keep the chamfer under a third of the smallest dimension, or the shape
  // collapses into a wedge on thin parts like LED strips.
  const c = Math.min(chamfer, w / 3, h / 3, d / 3);
  const g = new ExtrudeGeometry(chamferRect(w, h, c), {
    depth: Math.max(d - c * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: c,
    bevelSize: c,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * A plain box, centred.
 *
 * Retained only for parts no edge of which is ever visible — interior blocking,
 * and the backing behind a recess. If it can be seen, it wants `bevelBox`.
 */
export function slab(w: number, h: number, d: number): BufferGeometry {
  return new BoxGeometry(w, h, d);
}

/** A flat quad on the XY plane, centred. Screens, decals, deck sections. */
export function quad(w: number, h: number, seg = 1): BufferGeometry {
  return new PlaneGeometry(w, h, seg, seg);
}

/**
 * An arbitrary flat polygon, built on the XY plane for the caller to rotate.
 *
 * Used for the deck and ceiling now that the room is an octagon rather than a
 * rectangle — a `PlaneGeometry` cannot describe either.
 *
 * UVs are re-normalised to 0..1 across the polygon's bounds. `ShapeGeometry`
 * writes the vertex position straight into the UV, so on a 22-metre room the
 * incoming UVs run 0..22 — and every material here multiplies UV by a division
 * count expecting 0..1. Left alone, the deck grid comes out at twenty-two times
 * its intended density, which reads as noise rather than as plating.
 */
export function polygonPlate(points: [number, number][]): BufferGeometry {
  const s = new Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();

  const g = new ShapeGeometry(s);

  const uv = g.getAttribute("uv");
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    minX = Math.min(minX, uv.getX(i));
    maxX = Math.max(maxX, uv.getX(i));
    minY = Math.min(minY, uv.getY(i));
    maxY = Math.max(maxY, uv.getY(i));
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - minX) / spanX, (uv.getY(i) - minY) / spanY);
  }
  uv.needsUpdate = true;

  g.computeVertexNormals();
  return g;
}

/**
 * The command chair's back.
 *
 * Explicitly NOT a lathe or a tapered solid of revolution. A previous build
 * shipped one and it rendered as a traffic cone parked on the bridge axis,
 * directly over the viewport, in the establishing frame — and scaling it down
 * produced a smaller cone. A solid of revolution that tapers reads as a cone at
 * any size; a seat back needs a silhouette. So: an open cylinder section,
 * wider than it is tall, facing away from the camera.
 *
 * Centred on the origin, opening toward +Z.
 */
export function seatBack(
  radius: number,
  height: number,
  arc = Math.PI * 1.05,
): BufferGeometry {
  const g = new CylinderGeometry(
    radius,
    radius * 0.94,
    height,
    24,
    1,
    true,
    // three builds a cylinder with x = r·sin(θ), z = r·cos(θ), so θ=0 points at
    // +Z. Starting the arc at −arc/2 therefore opens it toward the camera,
    // which is what we want, and getting this backwards builds the shell
    // behind the sitter. A previous build put a whole viewport 25 units behind
    // the camera on exactly this mistake.
    -arc / 2,
    arc,
  );
  return g;
}

/** A cylinder, centred. Pedestals, conduit runs, stanchions. */
export function post(
  radius: number,
  height: number,
  segments = 16,
): BufferGeometry {
  return new CylinderGeometry(radius, radius, height, segments, 1, false);
}
