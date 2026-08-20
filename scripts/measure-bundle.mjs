/**
 * What the ship actually costs, gzipped, per route.
 *
 * The build plan set a hard gate before any room was built: the shell —
 * `three/webgpu` plus TSL plus the scene manager plus the HUD — must come in
 * at or under 300 KB gz, with a named abort condition above it. Whole-build
 * file sizes off the registry are an upper bound on the ratio, not a bundle
 * prediction, so the only figure worth having is this one.
 *
 *   node scripts/measure-bundle.mjs
 *
 * Reads the emitted client chunks, gzips each at level 9, and attributes them
 * to routes by walking the server-rendered HTML for the script tags it loads.
 * That attribution is what separates "the ship route costs X" from "the app
 * contains X somewhere".
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NEXT = join(ROOT, ".next");

if (!existsSync(NEXT)) {
  console.error("No .next directory. Run `npm run build` first.");
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/** Every emitted client JS chunk, with its gzipped size. */
function collectChunks(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (entry.endsWith(".js")) {
        out.set(
          "/" + relative(join(NEXT), p).replace(/\\/g, "/"),
          gzipSync(readFileSync(p), { level: 9 }).length,
        );
      }
    }
  };
  walk(dir);
  return out;
}

const chunks = collectChunks(join(NEXT, "static"));

/** Script URLs a prerendered page actually references. */
function scriptsFor(htmlPath) {
  if (!existsSync(htmlPath)) return null;
  const html = readFileSync(htmlPath, "utf8");
  const refs = new Set();
  for (const m of html.matchAll(/\/_next\/(static\/[^"'\\\s>]+?\.js)/g)) {
    refs.add("/" + m[1]);
  }
  return refs;
}

const ROUTES = [
  ["/", join(NEXT, "server/app/index.html")],
  ["/ship/bridge", join(NEXT, "server/app/ship/bridge.html")],
  ["/labs", join(NEXT, "server/app/labs.html")],
];

console.log("\nGzipped client JS, attributed by the prerendered HTML\n");

const totals = new Map();
for (const [route, html] of ROUTES) {
  const refs = scriptsFor(html);
  if (!refs) {
    console.log(`  ${route.padEnd(16)} (no prerendered HTML found)`);
    continue;
  }
  let total = 0;
  const owned = [];
  for (const r of refs) {
    const size = chunks.get(r);
    if (size !== undefined) {
      total += size;
      owned.push([r, size]);
    }
  }
  totals.set(route, { total, owned });
  console.log(`  ${route.padEnd(16)} ${kb(total).padStart(10)}  (${owned.length} chunks)`);
}

const home = totals.get("/");
const ship = totals.get("/ship/bridge");

if (home && ship) {
  const shared = new Set(home.owned.map(([r]) => r));
  const shipOnly = ship.owned.filter(([r]) => !shared.has(r));
  const delta = shipOnly.reduce((a, [, s]) => a + s, 0);

  console.log("\nShip-only chunks — the shell, on top of what every page pays:\n");
  for (const [r, s] of shipOnly.sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kb(s).padStart(10)}  ${r.split("/").pop()}`);
  }

  /**
   * The renderer is behind `next/dynamic` with `ssr: false`, so it is
   * deliberately absent from every page's HTML — that is what keeps LCP off the
   * WebGPU critical path, and it is also why the figure above is not the one
   * the gate was written about.
   *
   * The deferred set is every emitted chunk no prerendered page references. On
   * this app that is the renderer and the room modules, which is exactly what
   * the shell gate meant.
   */
  const referenced = new Set();
  for (const { owned } of totals.values()) for (const [r] of owned) referenced.add(r);

  const deferred = [...chunks.entries()]
    .filter(([r]) => !referenced.has(r))
    .sort((a, b) => b[1] - a[1]);
  const deferredTotal = deferred.reduce((a, [, s]) => a + s, 0);

  console.log("\nDeferred — fetched after first paint, never by a Tier C client:\n");
  for (const [r, s] of deferred.slice(0, 8)) {
    console.log(`  ${kb(s).padStart(10)}  ${r.split("/").pop()}`);
  }
  if (deferred.length > 8) {
    console.log(`  ${" ".repeat(10)}  …and ${deferred.length - 8} smaller`);
  }

  const GATE = 300 * 1024;
  const shell = delta + deferredTotal;
  console.log(`\n  Ship initial JS    ${kb(delta)}  (on the critical path)`);
  console.log(`  Deferred renderer  ${kb(deferredTotal)}  (after first paint)`);
  console.log(`  Shell total        ${kb(shell)}`);
  console.log(`  Gate               300.0 KB`);
  console.log(
    shell <= GATE
      ? `  PASS — ${kb(GATE - shell)} of headroom.\n`
      : `  FAIL — ${kb(shell - GATE)} over. Stop and reconsider before building rooms.\n`,
  );
  process.exit(shell <= GATE ? 0 : 1);
}
