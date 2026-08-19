/**
 * TSL node materials for the ship.
 *
 * Written once as a node graph; the renderer lowers it to WGSL on the WebGPU
 * backend and GLSL on the WebGL2 fallback at compile time. That is why this
 * build has no raw GLSL anywhere — mixing the two means two shader codebases
 * and forfeits the fallback.
 *
 * Nothing here uses a compute shader or a storage buffer. Those silently do
 * nothing on the WebGL2 backend, with no error, so the page renders minus
 * whatever the pass contributed. Keeping them out entirely is cheaper than
 * testing for their absence.
 *
 * Every surface detail is derived from the surface's own structure rather than
 * sampled from a texture — the technique three's own city example uses for
 * grid-aligned road markings. It ships zero bytes of texture, it re-scales
 * without resampling, and for deck plating, panel seams and hazard striping it
 * is simply the correct tool.
 */
import {
  DoubleSide,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  type Material,
} from "three/webgpu";
import {
  color,
  float,
  Fn,
  max,
  mix,
  mx_fractal_noise_float,
  normalWorld,
  positionLocal,
  smoothstep,
  step,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";
import { SHIP } from "../palette";

/** Materials created here are tracked so a room can dispose all of them. */
export type MaterialBag = { list: Material[]; add<T extends Material>(m: T): T };

export function materialBag(): MaterialBag {
  const list: Material[] = [];
  return {
    list,
    add(m) {
      list.push(m);
      return m;
    },
  };
}

/**
 * The dominant surface. White, semi-gloss, metallic.
 *
 * Metalness sits at 0.62 rather than 1: a fully metallic surface has no diffuse
 * term at all, so anywhere the key misses it goes to the environment colour and
 * white panels read as charcoal plastic. A previous build learned this on hull
 * ribs at metalness 1 and had to buy the surface back with reflectance.
 */
export function hullMaterial(bag: MaterialBag): MeshStandardNodeMaterial {
  const m = new MeshStandardNodeMaterial({
    color: SHIP.hull,
    metalness: 0.62,
    roughness: 0.34,
  });
  return bag.add(m);
}

/** Panel sides and secondary structure — a step down, slightly rougher. */
export function hullEdgeMaterial(bag: MaterialBag): MeshStandardNodeMaterial {
  return bag.add(
    new MeshStandardNodeMaterial({
      color: SHIP.hullEdge,
      metalness: 0.55,
      roughness: 0.42,
    }),
  );
}

/**
 * The deep recess between panels.
 *
 * This is doing more work than any white surface. Two abutting surfaces of the
 * same material at the same depth have no seam, and what makes a panelled wall
 * read as panelled is the joint — a previous build shipped a gate whose frame
 * and leaves shared one material and it rendered as one flat slab.
 */
export function recessMaterial(bag: MaterialBag): MeshStandardNodeMaterial {
  return bag.add(
    new MeshStandardNodeMaterial({
      color: SHIP.recess,
      metalness: 0.1,
      roughness: 0.86,
    }),
  );
}

/**
 * Deck plating: dark plate with inscribed seams on a grid, plus a lighter
 * inspection panel every fourth cell.
 *
 * `divisions` is cells across the deck's full width, so the seam density
 * follows the quality tier without the room knowing.
 */
export function deckMaterial(
  bag: MaterialBag,
  divisions: number,
): MeshStandardNodeMaterial {
  const m = new MeshStandardNodeMaterial({ metalness: 0.5, roughness: 0.58 });

  const grid = Fn(() => {
    const cell = uv().mul(divisions);
    // 0 at cell centre, 0.5 at the seam.
    const e = cell.fract().sub(0.5).abs();
    const seam = max(
      smoothstep(0.47, 0.5, e.x),
      smoothstep(0.47, 0.5, e.y),
    );

    // A finer secondary score inside each plate, so the deck carries detail at
    // two frequencies. Correct detail at one frequency reads as a pattern;
    // at two it reads as a surface.
    const fine = uv().mul(divisions * 4);
    const fe = fine.fract().sub(0.5).abs();
    const score = max(
      smoothstep(0.485, 0.5, fe.x),
      smoothstep(0.485, 0.5, fe.y),
    ).mul(0.35);

    const base = color(SHIP.deck);
    const line = color(SHIP.deckLine);
    return mix(base, line, max(seam, score));
  });

  m.colorNode = grid();
  return bag.add(m);
}

/**
 * LED strip. The room's actual light source, so it is emissive rather than lit.
 *
 * `MeshBasicNodeMaterial` on purpose — a strip that responds to lighting is a
 * strip that goes dim in shadow, which is exactly wrong for something that is
 * supposed to be producing the light.
 */
export function stripMaterial(
  bag: MaterialBag,
  intensity = 1.6,
): MeshBasicNodeMaterial {
  const m = new MeshBasicNodeMaterial();
  m.colorNode = color(SHIP.strip).mul(intensity);
  m.toneMapped = false;
  return bag.add(m);
}

/** The same, in the accent. Console trim and active indicators only. */
export function accentStripMaterial(
  bag: MaterialBag,
  intensity = 1.35,
): MeshBasicNodeMaterial {
  const m = new MeshBasicNodeMaterial();
  m.colorNode = color(SHIP.accent).mul(intensity);
  m.toneMapped = false;
  return bag.add(m);
}

/**
 * A console screen: generated row rhythm, never text.
 *
 * Baking legible type into a texture fails WCAG 1.4.5, and it is also the wrong
 * picture. A screen six metres away at a yaw renders eight-pixel glyphs, which
 * is a smear — what actually reads as code at that distance is indent depth and
 * line-length variance. So the screens carry a row rhythm derived from a
 * line-length profile, and the real text lives in the page's DOM copy where a
 * screen reader can reach it. The compliant version is the more filmic one.
 */
export function screenMaterial(
  bag: MaterialBag,
  seed: number,
  rows = 22,
): MeshBasicNodeMaterial {
  const m = new MeshBasicNodeMaterial({ side: DoubleSide });
  const uSeed = uniform(float(seed));

  const face = Fn(() => {
    const p = uv();
    const row = p.y.mul(rows).floor();

    // Classic sin-fract hash. Deterministic per row per screen, so a screen's
    // rhythm is a property of its seed and survives a reload.
    const h = row
      .mul(12.9898)
      .add(uSeed.mul(7.13))
      .sin()
      .mul(43758.5453)
      .fract();

    // Indent and length, both from the same hash — the two things that make a
    // block of code recognisable in silhouette.
    const indent = h.mul(0.22);
    const len = h.mul(0.52).add(0.18).add(indent);

    const inBar = step(indent, p.x).mul(step(p.x, len));
    // Leave a gap between rows so they read as discrete lines rather than fill.
    const rowGap = smoothstep(0.0, 0.16, p.y.mul(rows).fract()).mul(
      smoothstep(1.0, 0.84, p.y.mul(rows).fract()),
    );

    // One row per screen is "active" and brighter, drifting slowly. It is the
    // only thing on a console that moves at rest, which is enough.
    const active = step(
      float(0.5),
      float(1).sub(row.sub(time.mul(0.55).add(uSeed).floor().mod(rows)).abs()),
    );

    const lit = color(SHIP.accent).mul(inBar.mul(rowGap).mul(active.mul(0.9).add(0.42)));
    return mix(color(SHIP.screen), lit.add(color(SHIP.screen)), inBar.mul(rowGap));
  });

  m.colorNode = face();
  m.toneMapped = false;
  return bag.add(m);
}

/**
 * The gas giant.
 *
 * Applied to a real sphere rather than faked on a quad, because the signature
 * moment is that it *rotates* — a scrolling flat disc reads as a scrolling flat
 * disc, and the limb darkening and terminator come free from real geometry.
 *
 * Bands are turbulent, not parallel. This matters more than it sounds: the
 * previous bridge's planet was warm horizontal stripes and read unmistakably as
 * wooden venetian blinds. Hard parallel banding is the failure; latitudinal
 * noise warped by a second octave is atmosphere. And the palette is cold —
 * there is no warm tone anywhere in this room.
 */
export function gasGiantMaterial(
  bag: MaterialBag,
  seed: number,
): MeshBasicNodeMaterial {
  // Basic rather than Standard, with the lighting authored into the graph.
  //
  // The first build made this a lit material and it rendered almost black: the
  // room's key light sits at z=-18 pointing into the room, and the planet is at
  // z=-58 — so the only light in the scene was behind it and the camera saw its
  // night side. Chasing that with another real light means a light that has to
  // miss the entire room, which is a layer-mask problem to solve a lighting
  // problem.
  //
  // It is a backdrop, not a scene object. Baking the terminator against a fixed
  // world direction makes it exactly as bright as the composition needs, costs
  // nothing, and cannot be disturbed by anything that happens inside the room.
  const m = new MeshBasicNodeMaterial();
  const uSeed = uniform(float(seed % 97));

  const bands = Fn(() => {
    const p = positionLocal.normalize();

    // Squash the sample along the equator so noise stretches into latitudinal
    // bands, then warp it with a coarser octave so the bands shear and curl
    // instead of running parallel.
    const warp = mx_fractal_noise_float(
      vec3(p.x.mul(1.7), p.y.mul(2.4).add(uSeed), p.z.mul(1.7)),
      3,
      2.0,
      0.5,
      1.0,
    ).mul(0.22);

    const lat = p.y.add(warp);
    const detail = mx_fractal_noise_float(
      vec3(p.x.mul(0.9), lat.mul(11.0), p.z.mul(0.9)),
      4,
      2.0,
      0.55,
      1.0,
    );

    const t = detail.mul(0.5).add(0.5);

    // Three cold stops. Deep blue-grey shadow, mid slate, pale highlight.
    const deep = color("#243244");
    const mid = color("#5E708A");
    const pale = color("#C8D6E6");

    const lower = mix(deep, mid, smoothstep(0.18, 0.55, t));
    const albedo = mix(lower, pale, smoothstep(0.58, 0.86, t));

    // Terminator, against a fixed direction in WORLD space. Using the world
    // normal rather than the local one is the whole point — the planet rotates,
    // and a terminator built on the local normal would rotate with it, which
    // reads as the star moving rather than the planet turning.
    const sun = vec3(0.42, 0.34, 0.84).normalize();
    const lambert = normalWorld.normalize().dot(sun);
    // A wide, soft terminator. Gas giants have deep atmospheres and a hard
    // edge here is the tell of a sphere with a light on it.
    const day = smoothstep(-0.28, 0.55, lambert);

    // Limb darkening, plus a thin rim where the atmosphere catches the star.
    const facing = normalWorld.normalize().dot(vec3(0, 0, 1));
    const limb = smoothstep(0.0, 0.62, facing.abs());
    const rim = smoothstep(0.42, 0.0, facing.abs()).mul(day).mul(0.55);

    const night = color("#0B1119");
    const lit = albedo.mul(day.mul(0.92).add(0.06)).mul(limb.mul(0.55).add(0.45));
    return mix(night, lit, day.mul(0.88).add(0.12)).add(
      color(SHIP.accent).mul(rim),
    );
  });

  m.colorNode = bands();
  m.toneMapped = false;
  return bag.add(m);
}

/**
 * The star field, on a large backdrop quad behind everything.
 *
 * Basic rather than standard — stars are emitters and there is nothing out
 * there to light them.
 */
export function starFieldMaterial(
  bag: MaterialBag,
  density: number,
): MeshBasicNodeMaterial {
  const m = new MeshBasicNodeMaterial();

  const field = Fn(() => {
    const p = uv().mul(density);
    const cell = p.floor();
    const h = cell.x
      .mul(127.1)
      .add(cell.y.mul(311.7))
      .sin()
      .mul(43758.5453)
      .fract();

    // Sparse: only the top few per cent of cells carry a star at all, which is
    // what keeps a field from reading as noise.
    const isStar = step(float(0.965), h);

    // Sub-cell position, also from the hash, so stars are not on a lattice.
    const jx = h.mul(31.7).fract();
    const jy = h.mul(57.3).fract();
    const d = p.fract().distance(vec2(jx, jy));
    const point = smoothstep(0.42, 0.0, d).mul(isStar);

    // A faint cold nebula behind them. Two octaves is enough at this scale, and
    // it exists to stop the void reading as flat black rather than to be looked
    // at.
    const neb = mx_fractal_noise_float(
      vec3(uv().x.mul(3.1), uv().y.mul(2.2), 0.5),
      4,
      2.0,
      0.5,
      1.0,
    )
      .mul(0.5)
      .add(0.5);

    // Composed with `mix` rather than additively. On a near-black ground the
    // result is the same picture, it cannot blow out, and it keeps every
    // operand a vec3 — chained `.add()` across colour nodes resolves to the
    // float overload and does not typecheck.
    //
    // The first pass ran this far darker and the viewport read as a switched-off
    // screen rather than a window. The void has to be visibly *deep* — a
    // gradient of cold haze with stars in it — or the brightest thing in the
    // room is the ceiling, which inverts the whole composition.
    const withHaze = mix(
      color(SHIP.space),
      color("#1E3A5C"),
      smoothstep(0.34, 0.92, neb).mul(0.85),
    );
    return mix(
      withHaze,
      color("#EAF2FF"),
      point.mul(h.mul(0.7).add(0.55)).clamp(0, 1),
    );
  });

  m.colorNode = field();
  m.toneMapped = false;
  return bag.add(m);
}
