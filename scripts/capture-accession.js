// Recapture the Accession hero for the Work card.
//
// The committed master shows the old indigo theme, which production stopped
// serving on the 11th. A Work card advertising a version of the product that
// no longer exists is worse than no card.
//
// This reproduces the SHIPPED master's composition exactly and changes only
// the theme. That composition was not arbitrary -- it is level 6, the last of
// scenario 1, which is the densest frame the product has:
//
//   - an investigation, so the left column carries a full serif-italic case
//     brief instead of a one-line drill prompt
//   - the toolkit has accumulated all seven keywords with their explanations,
//     rather than collapsing to a chip row
//   - the schema panel is open on both tables
//   - the answer box is present, which only investigations have
//
// A level-2 capture was tried and rejected: a solved drill puts a share grid
// in the left column and leaves a third of the frame empty, and at the 536px
// the card actually renders it reads as Wordle.
//
// Captured against PRODUCTION rather than a local build, so what ships in the
// portfolio is what a visitor gets -- including the multi-zone rewrite and the
// real fonts.
//
// 1920x1080 is not a free choice: Shot.tsx declares width=1920 height=1080 on
// the img, .card-media is aspect-ratio 16/9, and build-shot-variants.py
// derives 640/960/1280/1920 from this master. A 16:10 master silently
// disagrees with the reserved box.

const { chromium } = require('C:/DEVELOPMENT/vx-elite-design-research/node_modules/playwright');

const URL = 'https://vertexapps.dev/sql/level/6';
const OUT = 'C:/DEVELOPMENT/vertex/public/work/accession/hero-desktop.png';

// The shipped master's query, character for character. Re-deriving it would
// change the frame for no reason; the point of this run is that only the
// palette moves.
const QUERY = [
  'SELECT title, valuation, received_on',
  'FROM objects',
  "WHERE received_on = DATE '2026-08-03'",
  'ORDER BY valuation DESC',
].join('\n');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark',
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);

  // A headless context is always a first-time visitor, so onboarding covers
  // the board.
  const skip = page.getByRole('button', { name: /^skip$/i });
  if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(800); }

  await page.waitForFunction(
    () => document.body.innerText.includes('DuckDB ready'),
    { timeout: 60000 },
  ).catch(() => {});

  const editor = await page.$('.monaco-editor textarea, .monaco-editor');
  if (editor) {
    await editor.click();
    await page.keyboard.press('Control+A');
    // insertText, not type(). Monaco fires autocomplete on keydown, and a
    // typed `received_on` came back as `receied_on` -- one dropped character,
    // which failed the query and put a red "Query didn't run" panel in frame.
    // insertText dispatches a single input event with no key events, so no
    // suggest widget, no auto-closing brackets, no reordering.
    await page.keyboard.insertText(QUERY);
    await page.waitForTimeout(400);

    // Read the editor back. This is the guard that the last pass lacked: the
    // shot is only correct if the text on screen is the text intended, and
    // that is cheaper to assert than to spot in a 1920px screenshot.
    const typed = await page.evaluate(() =>
      [...document.querySelectorAll('.monaco-editor .view-line')]
        .map((l) => l.textContent.replace(/\u00a0/g, ' ').trimEnd())
        .join('\n'));
    if (typed.replace(/\s+/g, ' ').trim() !== QUERY.replace(/\s+/g, ' ').trim()) {
      console.log('EDITOR MISMATCH -- do not ship');
      console.log('  wanted:', JSON.stringify(QUERY));
      console.log('  got   :', JSON.stringify(typed));
      await browser.close();
      process.exit(1);
    }
    const run = page.getByRole('button', { name: /^run$/i });
    if (await run.count()) { await run.first().click(); }
    await page.waitForTimeout(2500);
  }

  // Nothing focused. The shipped master has no focus ring on the editor and a
  // stray one would be the second difference between the two frames.
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(1900, 1070);
  await page.waitForTimeout(300);

  // Fonts settled before the shutter, or the capture bakes in the fallback.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  await page.screenshot({ path: OUT });

  // Report what is IN FRAME. Anything below y=1080 is cropped by the card, so
  // an error panel down there is not a reason to reject the shot -- and an
  // error panel above it is.
  const info = await page.evaluate(() => {
    const inFrame = (el) => {
      const r = el.getBoundingClientRect();
      return r.top < 1080 && r.bottom > 0;
    };
    const texts = [...document.querySelectorAll('body *')]
      .filter((e) => e.children.length === 0 && e.textContent.trim() && inFrame(e))
      .map((e) => e.textContent.trim());
    const blob = texts.join(' | ');
    return {
      h1: document.querySelector('h1')?.textContent?.trim(),
      badge: texts.find((t) => /^#\d{3}$/.test(t)),
      toolkitKeywords: texts.filter((t) =>
        /^(SELECT|FROM|WHERE|ORDER BY|DESC|LIKE|AND)$/.test(t)).length,
      schemaOpen: /SCHEMA . 2 TABLES/i.test(blob),
      answerBox: !!document.querySelector('input[placeholder*="title" i]'),
      resultRows: document.querySelectorAll('table tbody tr').length,
      // Not a guessed word list this time -- the previous pass shipped a red
      // error panel because Query didn't run was not in the list. Anything
      // the page paints in a red-ish box counts.
      redBoxes: [...document.querySelectorAll('body *')].filter((e) => {
        if (!inFrame(e) || !e.textContent.trim()) return false;
        const cs = getComputedStyle(e);
        const m = (cs.backgroundColor + cs.borderColor).match(/\d+/g);
        if (!m) return false;
        const [r, g, b] = m.map(Number);
        return r > 60 && r > g * 1.6 && r > b * 1.6;
      }).map((e) => e.textContent.trim().slice(0, 60)),
    };
  });
  console.log('captured:', OUT);
  console.log('  level    :', info.badge, info.h1);
  console.log('  toolkit  :', info.toolkitKeywords, 'keywords in frame');
  console.log('  schema   :', info.schemaOpen ? 'open' : 'MISSING');
  console.log('  answerbox:', info.answerBox ? 'present' : 'MISSING');
  console.log('  result   :', info.resultRows, 'rows');
  console.log('  state    :', info.redBoxes.length
    ? 'RED PANEL IN FRAME -- do not ship: ' + JSON.stringify(info.redBoxes)
    : 'clean');
  await browser.close();
})();
