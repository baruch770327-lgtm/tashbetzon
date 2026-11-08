// Game screen: zoomable board, clue bar, hints, Hebrew keyboard, autosave, completion.
import { h } from '../dom.js';
import { loadPuzzle } from '../../core/puzzle.js';
import { Game } from '../../core/game.js';
import { HINT_COST } from '../../core/scoring.js';
import { spendCoins, recordCompletion } from '../../core/progress.js';
import { clampTransform, ensureVisible } from '../viewport.js';
import { attachGestures } from '../gestures.js';
import { createBoard } from '../board.js';
import { createMinimap } from '../minimap.js';
import { createKeyboard } from '../keyboard.js';
import { createClueBar } from '../clue-bar.js';
import { createClueList } from '../clue-list.js';
import { findPuzzle, levelOf } from '../common.js';

const SAVE_DELAY_MS = 500;
const ZOOM_IN_SCALE = 2.2;
let cleanup = null;
let backHandler = null;

export function dispose() {
  cleanup?.();
  cleanup = null;
  backHandler = null;
}

/** Android back / router back: close the clue list first, if it is open. */
export function onBack() {
  return backHandler ? backHandler() : false;
}

export function render(ctx, { id }) {
  const raw = findPuzzle(ctx, id);
  const level = levelOf(ctx, id);
  const puzzle = loadPuzzle(raw);
  const game = new Game(puzzle, ctx.progress.inProgress[id] ?? null);
  const world = level.worlds?.[puzzle.world - 1];
  let wrong = new Set();
  let finished = false;

  // ---- timer (counts only while the app is visible) ----
  let lastTick = document.hidden ? null : performance.now();
  const tick = () => {
    if (lastTick !== null) {
      const now = performance.now();
      game.elapsedMs += now - lastTick;
      lastTick = now;
    }
  };

  // ---- saving ----
  let saveTimer = null;
  let dirty = false; // only a real change (letters, hints) is saved; just looking at a stage is not
  const saveNow = () => {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (finished || !dirty) return;
    tick();
    ctx.progress.inProgress[id] = game.toJSON();
    ctx.progress.lastPlayed = id;
    ctx.save();
  };
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
  };
  const onVisibility = () => {
    if (document.hidden) { saveNow(); lastTick = null; } else { lastTick = performance.now(); }
  };

  // ---- view state ----
  const board = createBoard(game);
  const minimap = createMinimap(game);
  const viewport = h('div', { class: 'board-viewport' }, board.el, minimap.el);
  let t = { scale: 1, x: 0, y: 0 };
  const dims = () => ({ viewW: viewport.clientWidth, viewH: viewport.clientHeight, contentW: board.contentSize(), contentH: board.contentSize() });
  const applyTransform = () => {
    board.el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    minimap.update(t, dims(), board.entryRect(game.currentEntry()));
    zoomBtn.textContent = t.scale > 1.2 ? '🔍−' : '🔍+';
  };
  const setTransform = (next) => { t = clampTransform(next, dims()); applyTransform(); };
  const followCursor = () => {
    if (t.scale > 1.05) setTransform(ensureVisible(t, board.entryRect(game.currentEntry()), dims()));
  };
  const layout = () => {
    if (!viewport.isConnected || viewport.clientWidth === 0) return;
    board.layout(Math.min(viewport.clientWidth, viewport.clientHeight));
    setTransform(t);
  };

  // ---- feedback ----
  const toast = h('div', { class: 'toast', role: 'status', hidden: true });
  let toastTimer = null;
  const say = (msg) => {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  };
  const vibrate = (pattern) => { if (ctx.progress.settings.vibrate) navigator.vibrate?.(pattern); };

  // ---- header / progress ----
  const coins = h('b', { 'data-coins': '' });
  const solvedCount = h('span', { class: 'muted small', dir: 'ltr' });
  const barFill = h('i');

  const clueBar = createClueBar({
    onSpeak: () => ctx.speak?.(game.currentEntry().en),
    onPrev: () => { game.nextEntry(-1); refresh(); followCursor(); },
    onNext: () => { game.nextEntry(1); refresh(); followCursor(); },
    onOpenList: () => clueList.open(),
  });
  const clueList = createClueList(game, { onPick: (i) => { game.goToEntry(i); refresh(); followCursor(); } });

  function refresh() {
    if (ctx.progress.settings.autoCheck) wrong = new Set(game.wrongCells().map(([r, c]) => `${r},${c}`));
    board.update(wrong);
    clueBar.set(game.currentEntry());
    const solved = puzzle.entries.filter((e) => game.isEntrySolved(e.index)).length;
    solvedCount.textContent = `${solved}/${puzzle.entries.length}`;
    barFill.style.width = `${(100 * solved) / puzzle.entries.length}%`;
    coins.textContent = ctx.progress.coins;
    minimap.update(t, dims(), board.entryRect(game.currentEntry()));
  }

  /** After the current entry gets solved, jump to the next unsolved one. */
  function advanceIfSolved(index, wasSolved) {
    if (wasSolved || !game.isEntrySolved(index)) return;
    const n = puzzle.entries.length;
    for (let k = 1; k < n; k++) {
      const j = (index + k) % n;
      if (!game.isEntrySolved(j)) { game.goToEntry(j); return; }
    }
  }

  function afterChange() {
    dirty = true;
    refresh();
    followCursor();
    if (game.isComplete()) finish();
    else scheduleSave();
  }

  function finish() {
    if (finished) return;
    tick();
    finished = true;
    clearTimeout(saveTimer);
    const result = recordCompletion(ctx.progress, puzzle, { reveals: game.reveals, elapsedMs: game.elapsedMs, now: Date.now() });
    ctx.progress.lastPlayed = id;
    ctx.save();
    vibrate([40, 60, 40]);
    setTimeout(() => ctx.router.replace('complete', {
      id, stars: result.stars, coinsEarned: result.coinsEarned, elapsedMs: game.elapsedMs, newWords: result.newWords.length,
    }), 450);
  }

  // ---- input ----
  function typeLetter(ch) {
    if (finished) return;
    const { row, col } = game.cursor;
    const index = game.currentEntry().index;
    const wasSolved = game.isEntrySolved(index);
    game.type(ch);
    wrong.delete(`${row},${col}`);
    advanceIfSolved(index, wasSolved);
    afterChange();
  }
  function erase() {
    if (finished) return;
    game.erase();
    wrong.delete(`${game.cursor.row},${game.cursor.col}`);
    afterChange();
  }
  function checkWord() {
    const entry = game.currentEntry();
    const bad = game.wrongCells(entry.index);
    bad.forEach(([r, c]) => wrong.add(`${r},${c}`));
    if (bad.length) { say(`יש ${bad.length === 1 ? 'אות שגויה אחת' : `${bad.length} אותיות שגויות`}`); vibrate(30); }
    else if (game.isEntrySolved(entry.index)) say('נכון! ✓');
    else say('אין טעויות עד עכשיו');
    refresh();
  }
  function revealLetter() {
    if (ctx.progress.coins < HINT_COST.letter) { say('אין מספיק מטבעות'); return; }
    const { row, col } = game.cursor;
    const index = game.currentEntry().index;
    const wasSolved = game.isEntrySolved(index);
    if (!game.revealLetter()) { say('האות הזו כבר נכונה'); return; }
    spendCoins(ctx.progress, HINT_COST.letter);
    wrong.delete(`${row},${col}`);
    game.type(game.fills[row][col]); // revealed cells keep their letter; this just advances the cursor
    advanceIfSolved(index, wasSolved);
    afterChange();
  }
  function revealWord() {
    if (ctx.progress.coins < HINT_COST.word) { say('אין מספיק מטבעות'); return; }
    const entry = game.currentEntry();
    if (game.revealWord() === 0) { say('המילה כבר נכונה'); return; }
    spendCoins(ctx.progress, HINT_COST.word);
    entry.cells.forEach(([r, c]) => wrong.delete(`${r},${c}`));
    advanceIfSolved(entry.index, false);
    afterChange();
  }

  const keyboard = createKeyboard({
    onLetter: typeLetter,
    onErase: erase,
    onNext: (delta = 1) => { game.nextEntry(delta); refresh(); followCursor(); },
  });

  const zoomBtn = h('button', {
    class: 'zoom-btn', 'aria-label': 'הגדלה', dataset: { action: 'zoom' },
    onClick: () => {
      if (t.scale > 1.2) setTransform({ scale: 1, x: 0, y: 0 });
      else {
        const r = board.entryRect(game.currentEntry());
        const d = dims();
        setTransform(ensureVisible({ scale: ZOOM_IN_SCALE, x: d.viewW / 2 - (r.x + r.w / 2) * ZOOM_IN_SCALE, y: d.viewH / 2 - (r.y + r.h / 2) * ZOOM_IN_SCALE }, r, d));
      }
    },
  }, '🔍+');
  viewport.append(zoomBtn);

  const detachGestures = attachGestures(viewport, {
    getTransform: () => t,
    setTransform,
    dims,
    onTap: (target) => {
      const cellEl = target?.closest?.('[data-cell]');
      if (!cellEl || finished) return;
      const [r, c] = cellEl.dataset.cell.split(',').map(Number);
      game.select(r, c);
      refresh();
      followCursor();
    },
  });

  const hint = (icon, label, cost, action, onClick) => h('button', { class: 'hint', dataset: { action }, onClick },
    h('span', { class: 'hint-icon', 'aria-hidden': 'true' }, icon), label,
    cost ? h('span', { class: 'hint-cost' }, `${cost}🪙`) : h('span', { class: 'hint-cost free' }, 'חינם'));

  const el = h('section', { class: 'game' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'סגירה', dataset: { action: 'close' }, onClick: () => { saveNow(); ctx.router.back(); } }, '✕'),
      h('div', { class: 'game-title' },
        h('div', { class: 'card-title' }, h('span', { dir: 'ltr' }, level.id), ` · שלב ${puzzle.stage}`),
        h('div', { class: 'muted small' }, `${world?.emoji ?? ''} ${world?.name ?? ''} · ${puzzle.entries.length} מילים`)),
      h('button', { class: 'icon-btn', 'aria-label': 'רשימת ההגדרות', dataset: { action: 'clues' }, onClick: () => clueList.open() }, '📋')),
    h('div', { class: 'row game-progress' },
      h('div', { class: 'bar grow' }, barFill), solvedCount, h('div', { class: 'pill small-pill' }, '🪙 ', coins)),
    viewport,
    clueBar.el,
    h('div', { class: 'hints' },
      hint('✅', 'בדוק מילה', 0, 'check', checkWord),
      hint('🔤', 'גלה אות', HINT_COST.letter, 'reveal-letter', revealLetter),
      hint('💡', 'גלה מילה', HINT_COST.word, 'reveal-word', revealWord)),
    keyboard.el,
    toast,
    clueList.el);

  backHandler = () => {
    if (clueList.el.hidden) return false;
    clueList.close();
    return true;
  };

  const resizeObserver = new ResizeObserver(layout);
  el.addEventListener('screen:mounted', () => {
    resizeObserver.observe(viewport);
    layout();
    refresh();
  });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', saveNow);

  cleanup = () => {
    if (!finished) saveNow();
    clearTimeout(toastTimer);
    resizeObserver.disconnect();
    detachGestures();
    keyboard.detach();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', saveNow);
  };
  return el;
}
