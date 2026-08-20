/**
 * Rewrite `clamp(Arem, Nvw, Brem)` so the middle term responds to browser zoom.
 *
 * A bare `vw` in a clamp's middle stops responding at a fixed viewport width:
 * zooming changes what a `rem` is worth but not what a `vw` is worth, so the
 * value freezes while everything around it grows. On text that fails WCAG 1.4.4
 * outright; on spacing it means the layout stops breathing at exactly the
 * moment someone needed it to.
 *
 * The transform keeps both endpoints and half the ramp in `rem`:
 *
 *   clamp(A, N vw, B)  ->  clamp(A, A/2 + M vw, B)
 *
 * with `M` chosen so the new middle still reaches `B` at the same viewport
 * width the old one did — so the value where the clamp tops out is unchanged
 * and only the ramp between the endpoints differs, slightly.
 *
 *   node scripts/fix-clamp-zoom.mjs [--write]
 *
 * Without `--write` it prints the diff it would make and changes nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../app/globals.css", import.meta.url);
const WRITE = process.argv.includes("--write");

const src = readFileSync(FILE, "utf8");

// clamp( <num>rem , <num>vw , <num>rem )  — only the bare-vw middles.
const RE = /clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)/g;

const changes = [];
const out = src.replace(RE, (whole, aStr, nStr, bStr) => {
  const a = parseFloat(aStr);
  const n = parseFloat(nStr);
  const b = parseFloat(bStr);

  // Viewport width, in px, at which the original middle reaches the maximum.
  const topOutPx = (b * 16 * 100) / n;
  // Half the minimum stays as a rem floor; the vw term covers the rest.
  const remTerm = a / 2;
  const vwTerm = ((b * 16 - remTerm * 16) * 100) / topOutPx;

  const next = `clamp(${a}rem, ${round(remTerm)}rem + ${round(vwTerm)}vw, ${b}rem)`;
  changes.push({ from: whole, to: next });
  return next;
});

function round(v) {
  return Math.round(v * 1000) / 1000;
}

if (changes.length === 0) {
  console.log("No bare-vw clamp middles found.");
  process.exit(0);
}

for (const c of changes) console.log(`  ${c.from}\n→ ${c.to}\n`);
console.log(`${changes.length} clamp(s) ${WRITE ? "rewritten" : "would be rewritten"}.`);

if (WRITE) {
  writeFileSync(FILE, out, "utf8");
  console.log("Written. Verify the landing page before committing.");
}
