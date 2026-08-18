/**
 * Two palettes, one source.
 *
 * The storyboard locks both sets. They are authored here as hex and consumed
 * three ways — as CSS custom properties (written onto the root element by the
 * server, so there is no second copy in a stylesheet to drift), as
 * `THREE.Color` instances for materials and lights, and as a blended pair for
 * the raymarched fog, which is the only thing on the page that crosses the act
 * break continuously rather than switching.
 *
 * ── Contrast, checked rather than asserted ────────────────────────────────
 *
 * Every value that carries text is measured against the ink it sits on, with
 * the copy scrim held at full opacity so the number below is the number
 * shipped. WCAG 2 ratios, computed 2026-08-17:
 *
 *   Cool act, on ink #050912
 *     chrome    #C4CCD8   12.31:1   body and headline
 *     amber     #E4B573   10.58:1   micro-labels, index numerals
 *     green     #42E27B   11.76:1   the interface terminal, and nothing else
 *     blue      #4A9BFF    7.04:1   links and rules
 *     dim       #8E99AC    6.92:1   secondary copy
 *
 *   Dune act, on dune ink #1F150C
 *     sand      #E4C89A   11.13:1   body and headline
 *     ochre     #C89568    6.79:1   micro-labels, monolith names
 *     dim       #B08A5E    5.67:1   secondary copy
 *     dust      #8A6842    3.54:1   FAILS 4.5:1 — structural only
 *
 * `dust` is the one that needs saying out loud: it is a beautiful mid-tone and
 * it is not a text colour. It carries rules, monolith stone and hairlines. The
 * `dim` value exists because the obvious secondary-text choice was `dust`, and
 * shipping it would have put a 3.54:1 body colour on a client-facing page.
 */

/** The cool ship interior. Hero through Deploy. */
export const COOL = {
  /** Deep space ink. The page ground for the whole first act. */
  ink: "#050912",
  /** Panel face. Every un-lit surface on the bridge settles here. */
  panel: "#12182A",
  /** LED strips, holographic displays, the light escaping the consoles. */
  blue: "#4A9BFF",
  /**
   * The bridge to the second act. One warm accent per console, present from
   * the first frame — so the Dune palette arrives as something the ship was
   * already carrying rather than as a different site.
   */
  amber: "#E4B573",
  /** Brushed and polished metal. Also the headline colour. */
  chrome: "#C4CCD8",
  /** The interface terminal, and nothing else anywhere on the page. */
  green: "#42E27B",
  /** Secondary copy. Not in the storyboard; added for the 4.5:1 floor. */
  dim: "#8E99AC",
} as const;

/** Dune warm brutalism. Descent through footer. */
export const WARM = {
  ink: "#1F150C",
  /** The long shadows the whole act is lit for. */
  shadow: "#3A2818",
  ochre: "#C89568",
  /** Body and headline in the warm act. */
  sand: "#E4C89A",
  /** Structural only — 3.54:1. Never small text. See the header note. */
  dust: "#8A6842",
  /** Monolith stone. */
  stone: "#5A3E23",
  /** Secondary copy. Added for the 4.5:1 floor; `dust` cannot carry it. */
  dim: "#B08A5E",
} as const;

export type CoolKey = keyof typeof COOL;
export type WarmKey = keyof typeof WARM;

/**
 * Both palettes as CSS custom properties, for the root element's inline style.
 *
 * Server-rendered from the same object the renderer reads, which is the whole
 * point: a hex that exists in a stylesheet *and* in a TypeScript constant is
 * two values that agree today.
 */
export function paletteVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(COOL)) out[`--sh-cool-${k}`] = v;
  for (const [k, v] of Object.entries(WARM)) out[`--sh-warm-${k}`] = v;
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
   The GL side
   ───────────────────────────────────────────────────────────────────────── */

/** Linear-space RGB triple. Materials and uniforms want these, not hex. */
export type RGB = [number, number, number];

/** sRGB hex to linear-light RGB, which is the space three.js works in. */
export function toLinear(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  ) as RGB;
}

/**
 * The uniform-facing palette. One flat object of linear triples, uploaded to
 * the fog shader and read by the material updater.
 *
 * Named by *role in the scene* rather than by act, so a material asks for
 * "the fog tint" and gets whichever act's fog tint the transition is currently
 * between. That is what lets one material list serve both worlds.
 */
export type ScenePalette = {
  /** The void the scene sits in. Drives `scene.background` and fog extinction. */
  ground: RGB;
  /** Un-lit surface albedo. */
  surface: RGB;
  /** The dominant practical — LED blue in the ship, low sun in the Dune. */
  key: RGB;
  /** The warm accent. Amber consoles, then the sun itself. */
  accent: RGB;
  /** What the fog scatters. Never the key at full chroma — see the v2 log §5. */
  vapour: RGB;
};

const SHIP_PALETTE: ScenePalette = {
  ground: toLinear(COOL.ink),
  surface: toLinear(COOL.panel),
  key: toLinear(COOL.blue),
  accent: toLinear(COOL.amber),
  /**
   * Halfway to grey from the LED blue, and deliberately so. v2's log records
   * the failure: lighting vapour with the accent at full chroma produced a
   * solid lavender bank rather than fog. Real vapour is grey and takes a tint.
   */
  vapour: mix(toLinear(COOL.blue), [0.16, 0.17, 0.19], 0.5),
};

const DUNE_PALETTE: ScenePalette = {
  ground: toLinear(WARM.ink),
  surface: toLinear(WARM.stone),
  key: toLinear(WARM.ochre),
  accent: toLinear(WARM.sand),
  /** Same halving. Dust hanging in low sun is pale, not saturated ochre. */
  vapour: mix(toLinear(WARM.ochre), [0.2, 0.18, 0.15], 0.5),
};

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * The blended palette at transition `t`, 0 = ship, 1 = Dune.
 *
 * Interpolation is in linear light, not sRGB. Mixing two saturated colours
 * through sRGB midpoints darkens them — the classic muddy-magenta seam — and
 * this particular mix runs blue to ochre, which is close to the worst case for
 * it. Linear is the correct space for what is physically a light source
 * changing colour, and it is also the space the uniforms want anyway.
 *
 * Writes into `out` rather than allocating: this runs once per frame.
 */
export function blendPalette(t: number, out: ScenePalette): ScenePalette {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  for (const key of ["ground", "surface", "key", "accent", "vapour"] as const) {
    const a = SHIP_PALETTE[key];
    const b = DUNE_PALETTE[key];
    const o = out[key];
    o[0] = a[0] + (b[0] - a[0]) * k;
    o[1] = a[1] + (b[1] - a[1]) * k;
    o[2] = a[2] + (b[2] - a[2]) * k;
  }
  return out;
}

/** A mutable palette instance for the render loop to blend into. */
export const scenePalette = (): ScenePalette => ({
  ground: [...SHIP_PALETTE.ground] as RGB,
  surface: [...SHIP_PALETTE.surface] as RGB,
  key: [...SHIP_PALETTE.key] as RGB,
  accent: [...SHIP_PALETTE.accent] as RGB,
  vapour: [...SHIP_PALETTE.vapour] as RGB,
});

export { SHIP_PALETTE, DUNE_PALETTE };
