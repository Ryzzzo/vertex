/**
 * The ship palette. One source, three consumers.
 *
 * Authored here as hex and read as (a) CSS custom properties written onto the
 * ship shell by the server, (b) linear-light triples for materials and lights,
 * and (c) uniform values for the TSL node graphs. There is no second copy of a
 * hex anywhere — a colour that exists in a stylesheet *and* in a constant is
 * two values that agree today.
 *
 * ── Direction ─────────────────────────────────────────────────────────────
 *
 * Grey, white, black. Blue appears in exactly three places and nowhere else:
 * the LED strips, the star field behind the viewport, and interactive
 * highlights. There are no warm tones in this room at all — the previous
 * bridge's tan hull banding read as wooden venetian blinds, which is the
 * failure this palette exists to prevent.
 *
 * ── Contrast, computed rather than asserted ───────────────────────────────
 *
 * WCAG 2 ratios, computed by `scripts/check-palette-contrast.mjs`, 2026-08-19.
 * Re-run it after changing any value here; the numbers below are output, not
 * intent.
 *
 *   On `scrim` #0A0C10 (the HUD ground, at full opacity):
 *     hull       #E9EBEE   16.39:1   headings, primary HUD text
 *     text       #C9D0DA   12.60:1   body copy
 *     accent     #4FA8FF    7.81:1   links, active room, focus ring
 *     textDim    #98A2B2    7.59:1   secondary copy, micro-labels
 *     hullShade  #7C8595    5.26:1   the floor for text. Below this, structural
 *
 *   Structural only — never text:
 *     hullEdge  #C2C8D1  11.63:1  (high, but it is a bevel, not a surface)
 *     accentDim #2B6FB0   3.73:1
 *     deckLine  #2E333B   1.54:1
 *     screen    #0E2438   1.24:1
 *     recess    #0C0E11   1.01:1
 *
 * `accentDim` at 3.73:1 is the one to watch: it is the obvious choice for an
 * inactive HUD label and it would ship a failing colour. Use `textDim` there.
 */

/** Surfaces, structure and light. Hex, sRGB. */
export const SHIP = {
  /** Panel face. The dominant surface in the room — semi-gloss, not matte. */
  hull: "#E9EBEE",
  /** Panel bevel catching the key. One step down from `hull`. */
  hullEdge: "#C2C8D1",
  /** Panel side and hairline. Structural only — see the contrast note. */
  hullShade: "#7C8595",
  /**
   * The base metal. Brushed titanium / gunmetal, run deep.
   *
   * ── How this can be near-black and still legible ─────────────────────────
   *
   * An earlier pass at #0A0D14 lost all form, and the correction to #1F2530
   * recovered it — but by lifting the field, which costs the contrast the white
   * strips need to pop. Both of those treat albedo as the only lever.
   *
   * The Blender VFX corridor shows the actual mechanism: its walls are nearly
   * black and you can still read every panel division, because the dark metal
   * is catching the light strips as **narrow specular highlights**. Form is
   * described by reflection, not by diffuse value. That is why "darker but
   * still legible" is not a contradiction — it is a shift from one channel to
   * another.
   *
   * So the albedo goes deep (#10151D) while metalness stays high and roughness
   * sits at 0.35–0.45: dark enough that the field reads as black, reflective
   * enough that every bevel returns a thin bright line, and rough enough that
   * those lines are soft rather than mirror-sharp.
   */
  slate: "#10151D",
  /** The lighter slate, for faces catching the ceiling runs. */
  slateLit: "#1A212B",
  /**
   * Deep recessed channel between panels. Stays near-black — the recess is the
   * joint, not the plate, and it is what gives the slate somewhere to be light
   * against.
   */
  recess: "#0C0E11",
  /**
   * Phosphor green. Terminal readouts and status indicators only.
   *
   * Roughly one part in ten of the emissive budget. Calibrated down from a pure
   * #00FF88 — at emissive intensity through bloom, full-saturation green is
   * eye-watering and drags the whole room toward a colour the brief explicitly
   * caps at a tenth. Green is a signal here, never a wash.
   */
  phosphor: "#3BE89A",
  /** Deck plate. */
  deck: "#16181C",
  /** Inscribed seam in the deck plating. */
  deckLine: "#2E333B",
  /** LED strip emissive. Near-white with just enough blue to not read warm. */
  strip: "#E4ECF7",
  /** The one saturated colour. Screens, star field, interactive highlight. */
  accent: "#4FA8FF",
  /** Accent at rest — unlit console trim, inactive indicator. */
  accentDim: "#2B6FB0",
  /** Unlit screen face. */
  screen: "#0E2438",
  /** The void beyond the viewport. */
  space: "#04060B",
  /** HUD ground. Slightly off the recess so the panel reads as an overlay. */
  scrim: "#0A0C10",
  /** Body copy. */
  text: "#C9D0DA",
  /** Secondary copy and micro-labels. */
  textDim: "#98A2B2",
} as const;

export type ShipColour = keyof typeof SHIP;

/**
 * The palette as CSS custom properties, for the ship shell's inline style.
 *
 * Server-rendered from the same object the renderer reads, so the stylesheet
 * and the scene cannot drift apart.
 */
export function shipVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(SHIP)) {
    out[`--sh-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`] = v;
  }
  return out;
}

/**
 * sRGB hex to linear-light [r, g, b].
 *
 * Materials and lights want linear. Doing this by hand rather than leaning on
 * `THREE.Color` keeps the palette module free of a three import, so it can be
 * read by a Server Component without pulling the renderer into that graph.
 */
export function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
}
