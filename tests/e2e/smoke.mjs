// End-to-end smoke test: plays stage A1-01 by tapping cells and keys like a person would.
// Run: npm run e2e   (uses the preinstalled Playwright + Chromium; screenshots → test-results/screens/)
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { startServer } from '../../tools/serve.mjs';
import { loadPuzzle } from '../../app/js/core/puzzle.js';
import { displayLetter } from '../../app/js/core/hebrew.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = new URL('../../test-results/screens/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const level = JSON.parse(readFileSync(new URL('../../app/data/puzzles/a1.json', import.meta.url), 'utf8'));
const puzzle = loadPuzzle(level.puzzles[0]);

const errors = [];
const fail = (msg) => { throw new Error(msg); };
const server = await startServer(0);
const browser = await chromium.launch();
let exitCode = 0;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });

  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForSelector('[data-screen=home]');
  await shot('1-home');
  await page.click('[data-tab=map]');
  await page.waitForSelector('[data-screen=map] [data-stage="A1-01"]');
  await shot('2-map');
  await page.click('[data-tab=home]');
  await page.click('[data-action=play]');
  await page.waitForSelector('[data-screen=game] [data-cell]');

  // Zoom toggle changes the board scale and back.
  const scaleOf = () => page.$eval('.board', (b) => b.style.transform);
  const before = await scaleOf();
  await page.click('[data-action=zoom]');
  if ((await scaleOf()) === before || !(await scaleOf()).includes('scale(2.2)')) fail('zoom button did not zoom');
  // The minimap must not cover or swallow taps on the current word's cells (cell 0,0 starts word 1).
  const covered = await page.evaluate(() => {
    const cell = document.querySelector('[data-cell="0,0"]').getBoundingClientRect();
    const mini = document.querySelector('.minimap');
    const m = mini.getBoundingClientRect();
    const hit = document.elementFromPoint(cell.left + cell.width / 2, cell.top + cell.height / 2);
    const overlaps = !mini.hidden && m.left < cell.right && cell.left < m.right && m.top < cell.bottom && cell.top < m.bottom;
    return { overlaps, hitCell: Boolean(hit?.closest('[data-cell="0,0"]')) };
  });
  if (covered.overlaps || !covered.hitCell) fail(`minimap covers cell 0,0 (${JSON.stringify(covered)})`);
  await page.click('[data-action=zoom]');
  if (!(await scaleOf()).includes('scale(1)')) fail('zoom button did not reset');

  // The on-screen ⏎ key moves to the next clue.
  const badge = () => page.textContent('.clue-badge');
  const firstBadge = await badge();
  await page.click('[data-key=next]');
  if ((await badge()) === firstBadge) fail('⏎ key did not move to the next clue');

  const filled = new Set();
  const typed = { finals: 0 };
  for (const [n, entry] of puzzle.entries.entries()) {
    if (entry.cells.every(([r, c]) => filled.has(`${r},${c}`))) continue;
    const [r0, c0] = entry.cells[0];
    await page.click(`[data-cell="${r0},${c0}"]`);
    if ((await page.$eval('.board', (b) => b.dataset.dir)) !== entry.dir) await page.click(`[data-cell="${r0},${c0}"]`);
    if ((await page.$eval('.board', (b) => b.dataset.dir)) !== entry.dir) fail(`could not select ${entry.num} ${entry.dir}`);
    for (const [r, c] of entry.cells) {
      const cell = puzzle.cells[r][c];
      const key = displayLetter(cell.answer, cell.finalForm);
      if (key !== cell.answer) typed.finals++;
      await page.click(`[data-key="${key}"]`);
      filled.add(`${r},${c}`);
      if (entry.cells.every(([rr, cc]) => filled.has(`${rr},${cc}`))) break;
    }
    if (n === 12) {
      await shot('3-game');
      await page.click('[data-action=clues]');
      await page.waitForSelector('.sheet-backdrop:not([hidden])');
      await shot('4-clues');
      // Android back with the clue list open closes the list and stays in the puzzle.
      if (!(await page.evaluate(() => window.tashbetzonBack()))) fail('back with clue list open exited');
      await page.waitForSelector('.sheet-backdrop[hidden]', { state: 'attached', timeout: 2000 });
      if (!(await page.$('[data-screen=game]'))) fail('back with clue list open left the game');
    }
  }
  await page.waitForSelector('[data-screen=complete]', { timeout: 5000 });
  const stars = await page.$$eval('.star.on', (s) => s.length);
  if (stars !== 3) fail(`expected 3 stars, got ${stars}`);
  await page.waitForTimeout(1000); // let the star animation finish
  await shot('5-complete');

  await page.reload();
  await page.waitForSelector('[data-screen=home]');
  const homeText = await page.textContent('[data-screen=home]');
  if (!homeText.includes('1 / 50')) fail('home does not show 1 / 50 after reload');
  await page.click('[data-tab=map]');
  if (await page.$eval('[data-stage="A1-02"]', (b) => b.disabled)) fail('A1-02 is still locked');
  if (!(await page.$eval('[data-stage="A1-01"]', (b) => b.classList.contains('done')))) fail('A1-01 not marked done');
  // Viewing a finished stage without changing it must not hijack "play now".
  await page.click('[data-stage="A1-01"]');
  await page.waitForSelector('[data-screen=game]');
  await page.click('[data-action=close]');
  await page.click('[data-tab=home]');
  const card = await page.textContent('.continue');
  if (!card.includes('שלב 2')) fail(`home points to the wrong stage after viewing A1-01: ${card}`);
  await page.click('[data-tab=words]');
  const wordRows = await page.$$eval('[data-word]', (w) => w.length);
  if (wordRows < puzzle.entries.length - 5) fail(`word book has only ${wordRows} words`);
  await shot('6-words');
  await page.click('[data-tab=settings]');
  await shot('7-settings');

  if (typed.finals === 0) fail('no final letters were exercised');
  if (errors.length) fail(`console errors: ${errors.join(' | ')}`);
  console.log(`E2E PASS — ${puzzle.entries.length} entries solved, ${typed.finals} final-letter keys, ${wordRows} words in the book, screenshots in test-results/screens/`);
} catch (err) {
  exitCode = 1;
  console.error('E2E FAIL —', err.message);
} finally {
  await browser.close();
  server.close();
}
process.exit(exitCode);
