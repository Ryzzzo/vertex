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
  MeshPhysicalNodeMaterial,
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
  mx_noise_float,
  normalWorld,
  positionLocal,
  select,
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
export function hullMaterial(bag: MaterialBag): MeshPhysicalNodeMaterial {
  // Physical rather than Standard, for the clearcoat. A coated panel has two
  // reflections — a broad one from the metal and a tight one from the lacquer
  // over it — and that second highlight is most of what reads as
  // manufacturing quality rather than as a shaded polygon.
  //
  // These values do nothing without `scene.environment`. At metalness 0.92
  // there is almost no diffuse term, so with nothing to reflect the panel
  // resolves to flat grey — which is precisely how the first pass looked and
  // why it read as an untextured primitive.
  const m = new MeshPhysicalNodeMaterial({
    color: SHIP.hull,
    metalness: 0.92,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
  });

  /**
   * Roughness is a map, not a constant.
   *
   * A uniformly polished panel is the tell of a render. Real hardware has
   * brushed direction, patchy wear where hands and tools reach, and slightly
   * duller edges where coating is thinner. None of that needs a texture: two
   * octaves of noise stretched along one axis give the brushing, a broader
   * octave gives the wear, and both cost nothing to download.
   */
  m.roughnessNode = Fn(() => {
    const p = positionLocal;
    // Stretched hard along Y so the grain runs one way, like a brushed sheet.
    const brushed = mx_noise_float(
      vec3(p.x.mul(1.4), p.y.mul(46.0), p.z.mul(1.4)),
    ).mul(0.055);
    // Broad patches, so the surface is not uniformly anything.
    const wear = mx_fractal_noise_float(
      vec3(p.x.mul(0.55), p.y.mul(0.55), p.z.mul(0.55)),
      3,
      2.0,
      0.5,
      1.0,
    ).mul(0.07);
    return float(0.3).add(brushed).add(wear).clamp(0.12, 0.62);
  })();

  return bag.add(m);
}

/**
 * Stencilled hull markings — panel indices, hazard striping, alignment ticks.
 *
 * Not typography, and deliberately not legible. There is no font atlas here and
 * baking real text into a surface would fail WCAG 1.4.5 anyway. What this
 * draws is the *rhythm* of hull stencilling: a block of index marks, a run of
 * hazard chevrons, a row of alignment ticks. At the distance these are seen it
 * is the same information a real stencil delivers — that the surface is a
 * manufactured part with a part number — without pretending to words.
 *
 * Applied as a darkening over the hull, so markings read as printed onto the
 * panel rather than glowing out of it.
 */
export function markedHullMaterial(
  bag: MaterialBag,
  seed: number,
): MeshPhysicalNodeMaterial {
  const m = new MeshPhysicalNodeMaterial({
    metalness: 0.9,
    roughness: 0.34,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
  });
  const uSeed = uniform(float(seed % 53));

  m.colorNode = Fn(() => {
    const p = uv();
    const base = color(SHIP.hull);

    // A block of index marks in the upper-left corner of the panel: four short
    // bars of varying length, the silhouette of a stamped part number.
    const ix = p.sub(vec2(0.09, 0.86)).mul(vec2(9.0, 26.0));
    const inBlock = step(float(0), ix.x)
      .mul(step(ix.x, 1))
      .mul(step(float(0), ix.y))
      .mul(step(ix.y, 1));
    const markRow = ix.y.mul(4).floor();
    const markLen = markRow
      .add(uSeed)
      .mul(12.9898)
      .sin()
      .mul(43758.5453)
      .fract()
      .mul(0.55)
      .add(0.35);
    const markInk = inBlock
      .mul(step(ix.x, markLen))
      .mul(smoothstep(0.0, 0.22, ix.y.mul(4).fract()))
      .mul(smoothstep(1.0, 0.78, ix.y.mul(4).fract()));

    // Hazard chevrons along the bottom edge. Diagonal stripes are the single
    // most recognisable piece of industrial marking there is.
    const inHazard = smoothstep(0.055, 0.045, p.y);
    const chevron = p.x.mul(26).add(p.y.mul(26)).fract();
    const hazardInk = inHazard.mul(
      smoothstep(0.46, 0.5, chevron).mul(smoothstep(0.96, 0.92, chevron)),
    );

    // Alignment ticks down the right edge.
    const inTicks = smoothstep(0.955, 0.965, p.x);
    const tick = smoothstep(0.42, 0.5, p.y.mul(14).fract().sub(0.5).abs().mul(2));
    const tickInk = inTicks.mul(tick);

    const ink = max(max(markInk, hazardInk), tickInk).mul(0.72);
    return mix(base, color(SHIP.recess), ink);
  })();

  return bag.add(m);
}

/** Panel sides and secondary structure — a step down, slightly rougher. */
export function hullEdgeMaterial(bag: MaterialBag): MeshPhysicalNodeMaterial {
  return bag.add(
    new MeshPhysicalNodeMaterial({
      color: SHIP.hullEdge,
      metalness: 0.95,
      roughness: 0.38,
      clearcoat: 0.3,
      clearcoatRoughness: 0.25,
    }),
  );
}

/**
 * Polished chrome. Stanchions, trim rings, fasteners.
 *
 * Roughness 0.12 is a near-mirror, which is only worth having because there is
 * now an authored environment for it to mirror. Used sparingly — a room of
 * chrome reads as a car advert, and one chrome detail against brushed metal
 * reads as engineering.
 */
export function chromeMaterial(bag: MaterialBag): MeshPhysicalNodeMaterial {
  return bag.add(
    new MeshPhysicalNodeMaterial({
      color: "#DDE4EC",
      metalness: 1,
      roughness: 0.12,
      clearcoat: 0.8,
      clearcoatRoughness: 0.08,
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

    // Near-black, with the blue undertone living in the specular rather than
    // in the albedo. A dark floor that is *tinted* blue reads as painted; a
    // near-black floor that *reflects* blue reads as a wet-looking coated deck,
    // which is the difference the reference is showing.
    const base = color("#0B0D11");
    const line = color("#1A1F27");
    return mix(base, line, max(seam, score));
  });

  m.colorNode = grid();

  /**
   * Inscribed deck lighting.
   *
   * The reference floor is not merely dark — it carries a faint lit circuit
   * through the plating, which is most of why the deck reads as a surface with
   * engineering in it rather than as a dark rectangle. Only the primary seams
   * light, never the fine score, so the two frequencies stay distinguishable:
   * one is a joint between plates, the other is a scribe line on a plate.
   */
  m.emissiveNode = Fn(() => {
    const cell = uv().mul(divisions);
    const e = cell.fract().sub(0.5).abs();
    const seam = max(
      smoothstep(0.482, 0.5, e.x),
      smoothstep(0.482, 0.5, e.y),
    );
    // Falls off with distance from the room's centre line, so the deck lighting
    // reads as strongest under the command dais and fades toward the walls
    // instead of tiling out flat to the edges.
    const centre = uv().sub(vec2(0.5, 0.5)).length();
    const falloff = smoothstep(0.62, 0.12, centre);
    return color(SHIP.accent).mul(seam).mul(falloff).mul(0.22);
  })();

  return bag.add(m);
}

/**
 * LED strip. The room's actual light source, so it is emissive rather than lit.
 *
 * `MeshBasicNodeMaterial` on purpose — a strip that responds to lighting is a
 * strip that goes dim in shadow, which is exactly wrong for something that is
 * supposed to be producing the light.
 */
export function darkPanelMaterial(
  bag: MaterialBag,
): MeshPhysicalNodeMaterial {
  /**
   * The wall field.
   *
   * The reference inverts what a first pass assumes: the dark surfaces are the
   * field and the white surfaces are the accent, and the white is *emitting*
   * rather than being lit. So the large wall panels are near-black metal whose
   * job is to be the ground a glowing outline reads against, and to carry the
   * reflection of that outline down its own bevel.
   *
   * Metallic and fairly smooth on purpose. A near-black *diffuse* surface is
   * just a hole; a near-black *metal* still returns the strips and the
   * environment, which is what keeps it reading as a panel rather than as
   * absence.
   */
  const m = new MeshPhysicalNodeMaterial({
    color: "#0A0D14",
    metalness: 0.9,
    roughness: 0.35,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
  });
  return bag.add(m);
}

export function stripMaterial(
  bag: MaterialBag,
  intensity = 2.2,
): MeshStandardNodeMaterial {
  // Standard with an emissive term rather than Basic. Basic ignores the
  // environment entirely, so the strip's own housing got no reflection off it
  // and the fitting read as a white sticker on a grey wall. This still emits,
  // and it also sits in the room.
  //
  // Glow is a *ratio*, not a value — it exists only relative to how dark the
  // field around it is.
  //
  // Which is why 5.5 was wrong. Going from a handful of strips to ~30 traced
  // outlines multiplied the emissive *area* in the room, and raising intensity
  // at the same time compounded it: the bloom from adjacent outlines merged and
  // the walls resolved to solid white. The dark field disappeared, and with it
  // the contrast the outlines were there to create. More glowing surfaces means
  // each one has to be dimmer, not brighter.
  const m = new MeshStandardNodeMaterial({
    color: SHIP.recess,
    metalness: 0.1,
    roughness: 0.5,
    emissive: "#FFFFFF",
    emissiveIntensity: intensity,
  });
  return bag.add(m);
}

/** The same, in the accent. Console trim and active indicators only. */
export function accentStripMaterial(
  bag: MaterialBag,
  intensity = 2.6,
): MeshStandardNodeMaterial {
  return bag.add(
    new MeshStandardNodeMaterial({
      color: SHIP.recess,
      metalness: 0.1,
      roughness: 0.5,
      emissive: SHIP.accent,
      emissiveIntensity: intensity,
    }),
  );
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
  /** 0 code · 1 bar chart · 2 plot grid · 3 waveform. */
  kind = 0,
): MeshStandardNodeMaterial {
  // Standard with emissive so screens bloom and light their own bezels, rather
  // than sitting on the surface as flat colour.
  const m = new MeshStandardNodeMaterial({
    side: DoubleSide,
    color: SHIP.recess,
    metalness: 0.2,
    roughness: 0.35,
    emissiveIntensity: 1.9,
  });
  const uSeed = uniform(float(seed));

  const face = Fn(() => {
    const p = uv();

    /* ── 0 · Code. Indent depth and line-length variance, never glyphs. ──
       Baking legible type into a texture fails WCAG 1.4.5, and it is also the
       wrong picture: a screen six metres away at a yaw renders eight-pixel
       glyphs, which is a smear. What actually reads as code at that distance
       is the rhythm, so the compliant version is the more filmic one. */
    const row = p.y.mul(rows).floor();
    // Classic sin-fract hash, inlined at both use sites. Deterministic per row
    // per screen, so a console's content is a property of its seed and survives
    // a reload. Not extracted into a helper because typing a parameter that
    // accepts both `float()` (a VarNode) and `.floor()` (a plain Node) costs
    // more than the duplicated line saves.
    const h = row.mul(12.9898).add(uSeed.mul(7.13)).sin().mul(43758.5453).fract();
    const indent = h.mul(0.22);
    const len = h.mul(0.52).add(0.18).add(indent);
    const inBar = step(indent, p.x).mul(step(p.x, len));
    const rowGap = smoothstep(0.0, 0.16, p.y.mul(rows).fract()).mul(
      smoothstep(1.0, 0.84, p.y.mul(rows).fract()),
    );
    const codeInk = inBar.mul(rowGap).mul(h.mul(0.5).add(0.5));

    /* ── 1 · Bar chart. Twelve columns, heights from the hash, one sweeping
           highlight so the console reads as live rather than printed. ── */
    const colCount = float(12);
    const col = p.x.mul(colCount).floor();
    const ch = col
      .add(31.0)
      .mul(12.9898)
      .add(uSeed.mul(7.13))
      .sin()
      .mul(43758.5453)
      .fract();
    const barH = ch.mul(0.72).add(0.12);
    const inCol = smoothstep(0.06, 0.14, p.x.mul(colCount).fract()).mul(
      smoothstep(0.94, 0.86, p.x.mul(colCount).fract()),
    );
    const inBarH = step(p.y, barH);
    const sweep = smoothstep(
      0.14,
      0.0,
      col.div(colCount).sub(time.mul(0.16).fract()).abs(),
    );
    const chartInk = inCol.mul(inBarH).mul(sweep.mul(0.75).add(0.45));

    /* ── 2 · Plot grid with a trace across it. ── */
    const gx = smoothstep(0.94, 1.0, p.x.mul(9).fract().sub(0.5).abs().mul(2));
    const gy = smoothstep(0.94, 1.0, p.y.mul(5).fract().sub(0.5).abs().mul(2));
    const gridInk = max(gx, gy).mul(0.3);
    const traceY = mx_fractal_noise_float(
      vec3(p.x.mul(4.2), uSeed.mul(0.4), time.mul(0.08)),
      3,
      2.0,
      0.5,
      1.0,
    )
      .mul(0.22)
      .add(0.5);
    const traceInk = smoothstep(0.022, 0.0, p.y.sub(traceY).abs());
    const plotInk = max(gridInk, traceInk);

    /* ── 3 · Waveform, mirrored about the centre line. ── */
    const amp = mx_fractal_noise_float(
      vec3(p.x.mul(13.0), uSeed, time.mul(0.9)),
      2,
      2.0,
      0.6,
      1.0,
    )
      .abs()
      .mul(0.4)
      .add(0.02);
    const waveInk = smoothstep(0.012, 0.0, p.y.sub(0.5).abs().sub(amp));

    // Select by kind. `select` keeps this one shader with a branch resolved at
    // compile time per material instance, rather than four shader programs.
    const k = float(kind);
    const ink = select(
      k.lessThan(0.5),
      codeInk,
      select(
        k.lessThan(1.5),
        chartInk,
        select(k.lessThan(2.5), plotInk, waveInk),
      ),
    );

    // A faint scanline and a vignette, so the panel reads as a lit display
    // rather than as a decal.
    const scan = p.y.mul(rows * 3).fract().mul(0.06).add(0.94);
    const vig = smoothstep(1.05, 0.35, p.sub(vec2(0.5, 0.5)).length());

    return color(SHIP.accent).mul(ink).mul(scan).mul(vig.mul(0.5).add(0.6));
  });

  m.emissiveNode = face();
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
