// The crossword grid. Rendered RTL: column 0 is on the right.
import { h } from './dom.js';
import { displayLetter } from '../core/hebrew.js';

export const BOARD_PAD = 4;
export const BOARD_GAP = 2;

export function createBoard(game) {
  const { cells } = game.puzzle;
  const n = cells.length;
  const items = [];
  const el = h('div', { class: 'board', style: `--n:${n}`, role: 'grid', 'aria-label': 'לוח התשבץ' });
  cells.forEach((row, r) => row.forEach((cell, c) => {
    if (cell.block) {
      el.append(h('div', { class: 'cell block', 'aria-hidden': 'true' }));
      return;
    }
    const letter = h('span', { class: 'letter' });
    const div = h('div', {
      class: `cell${cell.barAfter.across ? ' bar-a' : ''}${cell.barAfter.down ? ' bar-d' : ''}`,
      role: 'gridcell', dataset: { cell: `${r},${c}` },
    }, cell.num ? h('span', { class: 'num' }, cell.num) : null, letter);
    el.append(div);
    items.push({ div, letter, r, c, cell });
  }));

  let cs = 30;
  return {
    el,
    /** Size cells to fit `px` pixels; returns the content size in unscaled pixels. */
    layout(px) {
      cs = Math.max(16, Math.floor((px - 2 * BOARD_PAD - (n - 1) * BOARD_GAP) / n));
      el.style.setProperty('--cs', `${cs}px`);
      return this.contentSize();
    },
    contentSize: () => n * cs + (n - 1) * BOARD_GAP + 2 * BOARD_PAD,
    /** Rect of an entry in unscaled content coordinates (RTL columns). */
    entryRect(entry) {
      const xs = entry.cells.map(([, c]) => BOARD_PAD + (n - 1 - c) * (cs + BOARD_GAP));
      const ys = entry.cells.map(([r]) => BOARD_PAD + r * (cs + BOARD_GAP));
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) + cs - x, h: Math.max(...ys) + cs - y };
    },
    update(wrong) {
      const entry = game.currentEntry();
      const inWord = new Set(entry.cells.map(([r, c]) => `${r},${c}`));
      const solved = game.solvedCells();
      el.dataset.dir = game.cursor.dir;
      for (const it of items) {
        const k = `${it.r},${it.c}`;
        const fill = game.fills[it.r][it.c];
        it.letter.textContent = displayLetter(fill, it.cell.finalForm);
        const cl = it.div.classList;
        cl.toggle('cur', it.r === game.cursor.row && it.c === game.cursor.col);
        cl.toggle('word', inWord.has(k));
        cl.toggle('solved', solved.has(k));
        cl.toggle('wrong', wrong.has(k));
        cl.toggle('revealed', game.revealed.has(k));
      }
    },
  };
}
