/**
 * Headless capture for the ship — screenshots, gates and frame timing.
 *
 * Ported and generalised from `vx/ship-hero-v3`, where it existed because
 * verifying this class of work any other way produced two false readings in one
 * session, neither of which was a page bug:
 *
 *   1. An embedded browser pane that is not displayed does not composite, so
 *      `requestAnimationFrame` never fires and the canvas never paints. The DOM
 *      reported a mounted, correctly-sized canvas the whole time.
 *   2. Forcing SwiftShader made every screenshot time out. A screenshot that
 *      times out against your own page means a saturated renderer, which is a
 *      performance signal rather than a tooling glitch — but software GL is not
 *      the workload this scene is built for, so the reading was meaningless.
 *
 * So this drives a real Chromium through ANGLE/D3D11 and looks at pixels.
 *
 * Setup — playwright is deliberately NOT a dependency of this project. It is a
 * verification tool, not a shipped one:
 *
 *   npm install --no-save playwright
 *   node scripts/capture-ship.mjs http://localhost:3311 ./shots
 *
 * Prints a JSON report: which backend resolved per width, whether the room's
 * memory returns to baseline, horizontal-overflow, console errors, and — the
 * one assertion that actually has to pass — whether the reduced-motion path
 * requested three.js at all.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3311";
const OUT = process.argv[3] ?? "./shots";
const ROOM = process.argv[4] ?? "bridge";

const WIDTHS = [
  { name: "1440", width: 1440, height: 900, dsf: 1 },
  { name: "768", width: 768, height: 1024, dsf: 1 },
  { name: "375", width: 375, height: 812, dsf: 2, mobile: true },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    // Prefer the real GPU through ANGLE/D3D11. SwiftShader can carry the DOM
    // but not this scene, and forcing it makes every screenshot time out.
    "--use-gl=angle",
    "--use-angle=d3d11",
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--ignore-gpu-blocklist",
    "--disable-lcd-text",
  ],
});

const report = { base: BASE, room: ROOM, runs: [], assertions: {} };

/** Wait until the scene has genuinely produced frames, not merely mounted. */
async function waitForPaint(page, timeout = 25000) {
  try {
    await page.waitForFunction(
      () => document.documentElement.dataset.shipScene === "live",
      null,
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    deviceScaleFactor: w.dsf,
    isMobile: Boolean(w.mobile),
    hasTouch: Boolean(w.mobile),
  });
  const page = await ctx.newPage();

  const errors = [];
  const requested3D = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (/three|webgpu/i.test(r.url())) requested3D.push(r.url());
  });

  await page.goto(`${BASE}/ship/${ROOM}`, { waitUntil: "load" });
  const painted = await waitForPaint(page);

  // Let the boot ramp finish and the gas giant turn a little, so the frame that
  // gets looked at is the frame a visitor settles on rather than frame zero.
  await page.waitForTimeout(painted ? 3400 : 1200);

  const probe = await page.evaluate(async () => {
    const ship = window.__ship;
    const doc = document.documentElement;

    // rAF deltas over ~60 frames. This measures dropped frames, NOT GPU cost —
    // a 16.6 ms median is the vsync interval and proves no drops, not headroom.
    const frames = await new Promise((resolve) => {
      const out = [];
      let last = performance.now();
      let n = 0;
      const tick = (now) => {
        out.push(now - last);
        last = now;
        if (++n < 60) requestAnimationFrame(tick);
        else resolve(out);
      };
      requestAnimationFrame(tick);
    });

    const sorted = [...frames].sort((a, b) => a - b);
    return {
      tier: doc.dataset.shipTier ?? null,
      scene: doc.dataset.shipScene ?? null,
      backend: ship?.backend?.() ?? null,
      quality: ship?.quality ?? null,
      memory: ship?.memory?.() ?? null,
      room: ship?.room?.() ?? null,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      canvas: (() => {
        const c = document.querySelector("canvas.ship-canvas");
        return c ? { w: c.width, h: c.height } : null;
      })(),
      frameMedian: sorted[Math.floor(sorted.length / 2)],
      frameP95: sorted[Math.floor(sorted.length * 0.95)],
      frameWorst: sorted[sorted.length - 1],
    };
  });

  await page.screenshot({
    path: path.join(OUT, `${ROOM}-${w.name}.png`),
    animations: "disabled",
  });

  report.runs.push({
    width: w.name,
    painted,
    ...probe,
    overflow: probe.scrollWidth > probe.clientWidth,
    errors: errors.slice(0, 6),
    requested3D: requested3D.length,
  });

  await ctx.close();
}

/* ── Assertion 1: the WebGL2 backend, forced ──────────────────────────────
   Compute shaders and storage buffers silently do nothing on this backend.
   Nothing in this build is load-bearing in one, and forcing the path routinely
   is how that stays true rather than becoming an assumption. */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/ship/${ROOM}?gl=webgl2`, { waitUntil: "load" });
  const painted = await waitForPaint(page);
  await page.waitForTimeout(painted ? 3200 : 1200);
  const backend = await page.evaluate(() => window.__ship?.backend?.() ?? null);
  await page.screenshot({ path: path.join(OUT, `${ROOM}-webgl2.png`) });
  report.assertions.webgl2 = { painted, backend, errors: errors.slice(0, 6) };
  await ctx.close();
}

/* ── Assertion 2: reduced motion never requests three ─────────────────────
   The one gate that actually has to hold. `prefers-reduced-motion` skips the
   effect rather than slowing it, and for a scene whose entire content is motion
   that means the renderer is never started — so the chunk is never fetched. */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  let threeRequested = false;
  page.on("request", (r) => {
    if (/three|webgpu/i.test(r.url())) threeRequested = true;
  });
  await page.goto(`${BASE}/ship/${ROOM}`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => ({
    tier: document.documentElement.dataset.shipTier ?? null,
    canvas: Boolean(document.querySelector("canvas.ship-canvas")),
    drawing: Boolean(document.querySelector(".bridge-drawing")),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  await page.screenshot({
    path: path.join(OUT, `${ROOM}-reduced-motion.png`),
    fullPage: false,
  });
  report.assertions.reducedMotion = { threeRequested, ...state };
  await ctx.close();
}

/* ── Assertion 3: room disposal returns memory to baseline ────────────────
   `scene.clear()` frees nothing on the GPU. This is the check that turns the
   disposal discipline into a gate rather than a hope. With one open room there
   is nothing to navigate to yet, so this records the mounted baseline and will
   assert the round trip from Phase 1b. */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ship/${ROOM}`, { waitUntil: "load" });
  await waitForPaint(page);
  await page.waitForTimeout(1200);
  report.assertions.memory = await page.evaluate(
    () => window.__ship?.memory?.() ?? null,
  );
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
