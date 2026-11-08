// End-to-end smoke test: plays stage A1-01 by tapping cells and typing on the (phone) keyboard like a person would.
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
const typed = { finals: 0 };
const nativeFocused = (page) => page.evaluate(() => document.activeElement?.matches('[data-native-input]') ?? false);

/** Solve A1-01 by tapping cells and typing. keys: 'phone' types into the phone keyboard, 'game' taps the built-in keys. */
async function solve(page, { onEntry = async () => {}, lastThenClose = false, keys = 'phone' } = {}) {
  const filled = new Set();
  const targets = [];
  for (const entry of puzzle.entries) {
    for (const [r, c] of entry.cells) if (!targets.some(([rr, cc]) => rr === r && cc === c)) targets.push([r, c]);
  }
  const total = targets.length;
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
      if (keys === 'game') await page.click(`[data-key="${key}"]`);
      else await page.keyboard.type(key);
      filled.add(`${r},${c}`);
      if (lastThenClose && filled.size === total) {
        await page.click('[data-action=close]');
        return;
      }
      if (entry.cells.every(([rr, cc]) => filled.has(`${rr},${cc}`))) break;
    }
    await onEntry(n);
  }
}

const fail = (msg) => { throw new Error(msg); };
const server = await startServer(0);
const browser = await chromium.launch();
let exitCode = 0;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });

  const bootStart = Date.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForSelector('[data-screen=home]');
  const bootMs = Date.now() - bootStart;
  if (bootMs > 1500) fail(`home took ${bootMs} ms to appear (limit 1500)`);
  await shot('1-home');
  await page.click('[data-tab=map]');
  await page.waitForSelector('[data-screen=map] [data-stage="A1-01"]');
  await shot('2-map');
  await page.click('[data-tab=home]');
  await page.click('[data-action=play]');
  await page.waitForSelector('[data-screen=game] [data-cell]');

  // The phone keyboard opens when the stage opens, and there are no built-in keys.
  if (!(await nativeFocused(page))) fail('phone keyboard did not open on entering the stage');
  if (await page.$('[data-key]')) fail('built-in keyboard shown although the phone keyboard is selected');
  // Typing then Backspace leaves the square empty.
  await page.click('[data-cell="0,0"]');
  await page.keyboard.type('א');
  await page.keyboard.press('Backspace');
  if ((await page.textContent('[data-cell="0,0"] .letter')) !== '') fail('Backspace did not clear the square');
  // English letters are not typed; the player is told to switch the keyboard to Hebrew.
  await page.keyboard.type('a');
  await page.waitForSelector('.toast:not([hidden])', { timeout: 1000 });
  if (!(await page.textContent('.toast')).includes('לעברית')) fail('no hint to switch the keyboard to Hebrew');
  // Hint buttons do not close the keyboard; the ⌨️ button toggles it.
  await page.click('[data-action=check]');
  if (!(await nativeFocused(page))) fail('a hint button closed the phone keyboard');
  await page.click('[data-action=keyboard]');
  if (await nativeFocused(page)) fail('⌨️ did not close the keyboard');
  await page.click('[data-action=keyboard]');
  if (!(await nativeFocused(page))) fail('⌨️ did not open the keyboard');

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
    const shown = !mini.hidden && getComputedStyle(mini).visibility !== 'hidden';
    const overlaps = shown && m.left < cell.right && cell.left < m.right && m.top < cell.bottom && cell.top < m.bottom;
    return { overlaps, hitCell: Boolean(hit?.closest('[data-cell="0,0"]')) };
  });
  if (covered.overlaps || !covered.hitCell) fail(`minimap covers cell 0,0 (${JSON.stringify(covered)})`);
  await page.click('[data-action=zoom]');
  if (!(await scaleOf()).includes('scale(1)')) fail('zoom button did not reset');

  // The keyboard's Enter key moves to the next clue.
  const badge = () => page.textContent('.clue-badge');
  await page.click('[data-cell="0,0"]');
  const firstBadge = await badge();
  await page.keyboard.press('Enter');
  if ((await badge()) === firstBadge) fail('Enter did not move to the next clue');

  await solve(page, { onEntry: async (n) => {
    if (n === 12) {
      await shot('3-game');
      await page.click('[data-action=clues]');
      await page.waitForSelector('.sheet-backdrop:not([hidden])');
      if (await nativeFocused(page)) fail('the clue list opened over the phone keyboard');
      await shot('4-clues');
      // Android back with the clue list open closes the list and stays in the puzzle.
      if (!(await page.evaluate(() => window.tashbetzonBack()))) fail('back with clue list open exited');
      await page.waitForSelector('.sheet-backdrop[hidden]', { state: 'attached', timeout: 2000 });
      if (!(await page.$('[data-screen=game]'))) fail('back with clue list open left the game');
    }
  } });
  await page.waitForSelector('[data-screen=complete]', { timeout: 5000 });
  if (await nativeFocused(page)) fail('the phone keyboard stayed open after the stage was solved');
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
  // After a reset the switches show the defaults again (auto-check off).
  await page.click('[data-setting=autoCheck]');
  await page.click('[data-action=reset]');
  await page.click('[data-action=reset]');
  const autoCheck = await page.getAttribute('[data-setting=autoCheck]', 'aria-checked');
  if (autoCheck !== 'false') fail(`auto-check switch shows ${autoCheck} after reset`);

  // The built-in game keyboard (settings fallback) still works.
  await page.click('[data-setting=keyboard]');
  if ((await page.getAttribute('[data-setting=keyboard]', 'aria-checked')) !== 'false') fail('keyboard switch did not turn off');
  // Closing the puzzle right after the last letter must not leave the complete screen as the root.
  await page.click('[data-tab=home]');
  await page.click('[data-action=play]');
  await page.waitForSelector('[data-screen=game] [data-key]');
  await solve(page, { lastThenClose: true, keys: 'game' });
  await page.waitForTimeout(800);
  const screenNow = await page.getAttribute('[data-screen]', 'data-screen');
  if (screenNow !== 'home') fail(`after fast close the screen is ${screenNow}`);
  if (await page.evaluate(() => window.tashbetzonBack())) fail('home is not the root after fast close');

  // Six levels: 40 finished A1 stages open A2 (B1 stays locked); a B1 game in progress survives a reload.
  const levelsMeta = JSON.parse(readFileSync(new URL('../../app/data/levels.json', import.meta.url), 'utf8'));
  const available = levelsMeta.filter((l) => l.available).map((l) => l.id);
  if (available.length !== 6) fail(`expected 6 available levels, got ${available.join(',')}`);
  const doneStages = (lvl, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${lvl}-${String(i + 1).padStart(2, '0')}`, { stars: 3, bestMs: 1000 }]));
  const inject = (stages) => page.evaluate((st) => {
    localStorage.setItem('tashbetzon.progress', JSON.stringify({ version: 1, coins: 100, stages: st, inProgress: {}, words: {},
      settings: { sound: false, vibrate: false, autoCheck: false, keyboard: 'phone' }, lastPlayed: null }));
  }, stages);
  await inject(doneStages('A1', 40));
  await page.reload();
  await page.click('[data-tab=map]');
  await page.click('[data-level=A2]');
  if (await page.$eval('[data-level=A2]', (b) => b.classList.contains('dim'))) fail('A2 still locked after 40 A1 stages');
  if (!(await page.$eval('[data-level=B1]', (b) => b.classList.contains('dim')))) fail('B1 unlocked too early');
  if (await page.$eval('[data-stage="A2-01"]', (b) => b.disabled)) fail('A2-01 not playable');
  await inject({ ...doneStages('A1', 40), ...doneStages('A2', 40) });
  await page.reload();
  await page.click('[data-tab=map]');
  for (const id of available) {
    await page.click(`[data-level=${id}]`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}map-${id}.png` });
  }
  await page.click('[data-level=B1]');
  await page.click('[data-stage="B1-01"]');
  await page.waitForSelector('[data-screen=game] [data-cell]');
  const b1 = loadPuzzle(JSON.parse(readFileSync(new URL('../../app/data/puzzles/b1.json', import.meta.url), 'utf8')).puzzles[0]);
  const e0 = b1.entries[0];
  await page.click(`[data-cell="${e0.cells[0][0]},${e0.cells[0][1]}"]`);
  if ((await page.$eval('.board', (b) => b.dataset.dir)) !== e0.dir) await page.click(`[data-cell="${e0.cells[0][0]},${e0.cells[0][1]}"]`);
  await page.keyboard.type('אבג');
  await page.waitForTimeout(700); // autosave
  await page.reload();
  await page.click('[data-action=play]');
  await page.waitForSelector('[data-screen=game] [data-cell]');
  const kept = await page.textContent(`[data-cell="${e0.cells[2][0]},${e0.cells[2][1]}"] .letter`);
  if (kept !== 'ג' && kept !== 'ג') fail(`B1 letters were not restored after reload (got "${kept}")`);
  if (!(await page.textContent('.game-title')).includes('B1')) fail('play did not resume the B1 stage');
  await page.screenshot({ path: `${OUT}8-game-b1.png` });

  if (typed.finals === 0) fail('no final letters were exercised');
  if (errors.length) fail(`console errors: ${errors.join(' | ')}`);
  console.log(`E2E PASS — boot ${bootMs} ms, ${puzzle.entries.length} entries solved, ${typed.finals} final-letter keys, ${wordRows} words in the book, screenshots in test-results/screens/`);
} catch (err) {
  exitCode = 1;
  console.error('E2E FAIL —', err.message);
} finally {
  await browser.close();
  server.close();
}
process.exit(exitCode);
