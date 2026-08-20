/**
 * Atmosphere as state, not as constants.
 *
 * ── What this replaces, and why it matters ────────────────────────────────
 *
 * The Bridge lit itself by declaring light intensities as literals and then
 * multiplying every one of them by `state.boot`. That works, and it produces a
 * *lit render*: a fixed arrangement of values with a dimmer on the front.
 *
 * `brunosimon/folio-2025` builds it the other way round, as an enforced
 * dependency chain — DayCycles → Weather → Lighting → Fog — where the frame
 * reads from a state object that something upstream owns. The difference is not
 * organisational. A room whose light is *a value in a system that can be in
 * different states* reads as somewhere at a time; a room whose light is a
 * constant reads as a set that has been lit.
 *
 * So every lighting value the room uses lives here, named beats are presets,
 * and `boot` becomes an interpolation from the cold preset toward the idle one
 * rather than a scalar on everything. The room's `update` reads `atmosphere`
 * and never a literal.
 *
 * The practical payoff is immediate: adding a second beat is now a preset
 * rather than a refactor, and the Portfolio Bay can be authored as a different
 * point in the same space rather than as another pile of numbers.
 */

export type Atmosphere = {
  /** Which named state this is. Carried so a frame can be debugged by name. */
  beat: string;

  keyIntensity: number;
  keyColor: number;
  rimIntensity: number;
  fillIntensity: number;

  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;

  practicalIntensity: number;
  /** Emissive multiplier on the strips, so a beat can dim the room's own light. */
  stripLevel: number;

  fogColor: number;
  fogDensity: number;

  exposure: number;

  /** Volumetric density through the viewport. 0 disables the pass' contribution. */
  godrayDensity: number;
};

/**
 * Cold start. Everything off but the emergency minimum.
 *
 * This is what `boot` interpolates *from*, and authoring it as a real state
 * rather than as "multiply by zero" is what makes the arrival read as a room
 * powering up instead of a fade-in. At zero the practicals are dark, the fog is
 * denser and colder, and exposure is low — so the first moment is a cold hull,
 * not a dim version of the finished shot.
 */
const COLD: Atmosphere = {
  beat: "cold",
  keyIntensity: 0.12,
  keyColor: 0x8fa8c4,
  rimIntensity: 0.0,
  fillIntensity: 0.04,
  hemiSky: 0x6d7f96,
  hemiGround: 0x05070a,
  hemiIntensity: 0.06,
  practicalIntensity: 0.0,
  stripLevel: 0.12,
  fogColor: 0x070a10,
  fogDensity: 0.03,
  exposure: 0.42,
  godrayDensity: 0.25,
};

/** At rest. The shot the room is designed around. */
const IDLE: Atmosphere = {
  beat: "idle",
  keyIntensity: 0.85,
  keyColor: 0xcfe0f5,
  rimIntensity: 0.9,
  fillIntensity: 0.22,
  hemiSky: 0xbcd0e8,
  hemiGround: 0x090c11,
  hemiIntensity: 0.35,
  practicalIntensity: 11,
  stripLevel: 1,
  fogColor: 0x0a0c10,
  fogDensity: 0.009,
  exposure: 0.7,
  godrayDensity: 0.62,
};

/**
 * Leaning in. Reserved for a room-to-room transition or a hover on the HUD.
 *
 * Not wired to anything yet, and that is the point of writing it now — it costs
 * nothing to define and it proves the shape is a space rather than a pair.
 */
const ENGAGED: Atmosphere = {
  ...IDLE,
  beat: "engaged",
  keyIntensity: 1.05,
  rimIntensity: 1.15,
  practicalIntensity: 13,
  fogDensity: 0.0075,
  exposure: 0.78,
  godrayDensity: 0.78,
};

export const BEATS = { cold: COLD, idle: IDLE, engaged: ENGAGED } as const;
export type BeatName = keyof typeof BEATS;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Blend two colours as packed hex.
 *
 * Per channel in sRGB rather than in linear light. That is the wrong space for
 * a physical mix and the right one here: these are art-directed values, and
 * interpolating them in linear makes a dim beat pass through a brighter
 * midpoint than either end, which reads as a flare rather than a fade.
 */
function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    (Math.round(lerp(ar, br, t)) << 16) |
    (Math.round(lerp(ag, bg, t)) << 8) |
    Math.round(lerp(ab, bb, t))
  );
}

export function blendAtmosphere(
  a: Atmosphere,
  b: Atmosphere,
  t: number,
): Atmosphere {
  const k = Math.max(0, Math.min(1, t));
  return {
    beat: k < 0.5 ? a.beat : b.beat,
    keyIntensity: lerp(a.keyIntensity, b.keyIntensity, k),
    keyColor: mixHex(a.keyColor, b.keyColor, k),
    rimIntensity: lerp(a.rimIntensity, b.rimIntensity, k),
    fillIntensity: lerp(a.fillIntensity, b.fillIntensity, k),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, k),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, k),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, k),
    practicalIntensity: lerp(a.practicalIntensity, b.practicalIntensity, k),
    stripLevel: lerp(a.stripLevel, b.stripLevel, k),
    fogColor: mixHex(a.fogColor, b.fogColor, k),
    fogDensity: lerp(a.fogDensity, b.fogDensity, k),
    exposure: lerp(a.exposure, b.exposure, k),
    godrayDensity: lerp(a.godrayDensity, b.godrayDensity, k),
  };
}

/** The arrival: cold hull powering up to the resting shot. */
export function bootAtmosphere(boot: number): Atmosphere {
  return blendAtmosphere(COLD, IDLE, boot);
}
