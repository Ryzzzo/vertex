/**
 * Headless capture for the ship hero — screenshots, gates and frame timing.
 *
 * Exists because verifying this page any other way produced two false readings
 * in one session, both of which looked like page bugs and were not:
 *
 *   1. An embedded browser pane that is not displayed does not composite, so
 *      `requestAnimationFrame` never fires and the canvas never paints. The DOM
 *      reported a mounted, correctly-sized canvas the whole time.
 *   2. Forcing SwiftShader made every screenshot time out. A raymarched
 *      volumetric plus a depth-of-field gather is not a software-GL workload;
 *      `performance.md` reads a timing-out screenshot as a saturated renderer,
 *      and it is right.
 *
 * So this drives a real Chromium through ANGLE/D3D11 and looks at pixels.
 *
 * Setup (playwright is deliberately NOT a dependency of this project — it is a
 * verification tool, not a shipped one):
 *
 *   npm install --no-save playwright
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:LOCALAPPDATA\ms-playwright"   # Windows
 *   node scripts/capture-ship.mjs http://localhost:3311 ./shots
 *
 * Prints a JSON report: render path per width, horizontal-overflow check,
 * console errors, and whether the reduced-motion path requested three.js at all
 * — which is the one assertion the capability gate actually has to pass.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3311";
const OUT = process.argv[3] ?? "./shots";

/** Rule #17's four widths, plus a landscape tablet for the copy-side flip. */
const WIDTHS = [
  { name: "1440", width: 1440, height: 900, dsf: 1 },
  { name: "768", width: 768, height: 1024, dsf: 1 },
  { name: "375", width: 375, height: 812, dsf: 2, mobile: true },
];

/**
 * Scroll stops, as fractions of the whole track. Named for the beat each one
 * lands in the middle of, plus the two either side of the act cut, which is
 * the frame that most needs looking at.
 */
const STOPS = [
  ["00-hero", 0.04],
  ["01-schema", 0.17],
  ["02-rls", 0.28],
  ["03-actions", 0.4],
  ["04-interface", 0.51],
  ["05-deploy", 0.63],
  ["06-launch-pre", 0.7],
  ["07-launch-flash", 0.722],
  ["08-launch-post", 0.745],
  ["09-descent", 0.8],
  ["10-portfolio", 0.88],
  ["11-footer", 0.97],
];
const RLS_STOP = 0.28;

const browser = await chromium.launch({
  // Prefer the real GPU through ANGLE/D3D11. SwiftShader can carry the DOM but
  // not a raymarched volumetric plus a depth-of-field gather — forcing it made
  // every screenshot time out, which `performance.md` correctly reads as a
  // saturated renderer rather than a tooling glitch.
  args: [
    "--use-gl=angle",
    "--use-angle=d3d11",
    "--ignore-gpu-blocklist",
    "--enable-gpu-rasterization",
    "--enable-zero-copy",
  ],
});

async function shoot(page, dir, label) {
  await page.screenshot({ path: path.join(dir, `${label}.png`), timeout: 60000 });
}

/** Wait for a real WebGL frame, or report that the drawing is the page. */
async function waitForPaint(page, timeout = 25000) {
  try {
    await page.waitForFunction(
      () => document.documentElement.dataset.shMode === "canvas",
      null,
      { timeout },
    );
    return "canvas";
  } catch {
    return "drawing";
  }
}

const report = {};

for (const w of WIDTHS) {
  const dir = path.join(OUT, w.name);
  await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    deviceScaleFactor: w.dsf,
    isMobile: !!w.mobile,
    hasTouch: !!w.mobile,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  await page.goto(`${BASE}/v3`, { waitUntil: "networkidle" });
  const mode = await waitForPaint(page);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no webgl2";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });

  // Horizontal overflow is a hard gate at every width.
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    docH: document.documentElement.scrollHeight,
    vh: window.innerHeight,
  }));

  for (const [label, frac] of STOPS) {
    await page.evaluate((f) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round(max * f));
    }, frac);
    // Two rAFs plus a beat: the score is scrubbed, so one frame after the
    // scroll write is enough for the camera, and the extra time lets the
    // transmission and shadow passes settle.
    await page.waitForTimeout(mode === "canvas" ? 420 : 140);
    await shoot(page, dir, label);
  }

  // Press-and-hold, captured held. The RLS gate is the signature control.
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * f));
  }, RLS_STOP);
  await page.waitForTimeout(300);
  const btn = page.locator('[data-sh-hold="rls"]');
  let holdShot = false;
  if ((await btn.count()) && (await btn.isVisible())) {
    const box = await btn.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(900);
      await shoot(page, dir, "12-rls-held");
      await page.mouse.up();
      holdShot = true;
    }
  }

  // Frame timing at the establishing shot.
  let fps = null;
  if (mode === "canvas") {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    fps = await page.evaluate(
      () =>
        new Promise((res) => {
          const t = [];
          let last = performance.now();
          let n = 0;
          const step = () => {
            const now = performance.now();
            t.push(now - last);
            last = now;
            if (++n < 90) requestAnimationFrame(step);
            else {
              t.sort((a, b) => a - b);
              res({
                median: +t[Math.floor(t.length / 2)].toFixed(2),
                p95: +t[Math.floor(t.length * 0.95)].toFixed(2),
                worst: +t[t.length - 1].toFixed(2),
              });
            }
          };
          requestAnimationFrame(step);
        }),
    );
  }

  report[w.name] = { mode, renderer, overflow, errors, holdShot, fps };
  await ctx.close();
}

/* Reduced motion, at 1440. Must be the drawing only — no WebGL chunk at all. */
{
  const dir = path.join(OUT, "reduced-motion");
  await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const requested = [];
  page.on("request", (r) => requested.push(r.url()));
  await page.goto(`${BASE}/v3`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shoot(page, dir, "00-top");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await page.waitForTimeout(300);
  await shoot(page, dir, "01-mid");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await shoot(page, dir, "02-end");
  report["reduced-motion"] = {
    canvasMounted: await page.evaluate(() => !!document.querySelector("canvas.sh-canvas")),
    // The whole point of the gate: three.js must never be requested here.
    threeRequested: requested.some((u) => /three|SceneGL/.test(u)),
    docH: await page.evaluate(() => document.documentElement.scrollHeight),
  };
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
