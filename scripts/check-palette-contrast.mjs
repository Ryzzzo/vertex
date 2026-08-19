/**
 * WCAG 2 contrast ratios for the ship palette.
 *
 * The header comment in `lib/ship/palette.ts` quotes numbers. This is what
 * produces them. Run it after changing any value there:
 *
 *   node scripts/check-palette-contrast.mjs
 *
 * Exits non-zero if anything declared as a text colour falls below 4.5:1, so
 * it can be wired into a gate later.
 */
import { readFileSync } from "node:fs";

const src = readFileSync(
  new URL("../lib/ship/palette.ts", import.meta.url),
  "utf8",
);

/** Pull `name: "#RRGGBB",` pairs out of the SHIP object literal. */
const palette = Object.fromEntries(
  [...src.matchAll(/^\s{2}(\w+):\s*"(#[0-9A-Fa-f]{6})",/gm)].map((m) => [
    m[1],
    m[2],
  ]),
);

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((c) => c / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Colours that carry text, and the ground each is measured against. */
const TEXT_ON_SCRIM = ["hull", "text", "textDim", "accent", "hullShade"];
/** Declared structural — reported for information, never gated. */
const STRUCTURAL = ["recess", "deckLine", "accentDim", "screen", "hullEdge"];

const ground = palette.scrim;
let failed = 0;

console.log(`\nGround: scrim ${ground}\n`);
console.log("TEXT COLOURS — gated at 4.5:1");
for (const k of TEXT_ON_SCRIM) {
  const r = ratio(palette[k], ground);
  const ok = r >= 4.5;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${k.padEnd(10)} ${palette[k]}  ${r.toFixed(2)}:1`,
  );
}

console.log("\nSTRUCTURAL — reported, not gated (never put text on these)");
for (const k of STRUCTURAL) {
  console.log(
    `        ${k.padEnd(10)} ${palette[k]}  ${ratio(palette[k], ground).toFixed(2)}:1`,
  );
}

console.log(
  `\n${failed === 0 ? "All text colours clear 4.5:1." : `${failed} text colour(s) below 4.5:1.`}\n`,
);
process.exit(failed === 0 ? 0 : 1);
