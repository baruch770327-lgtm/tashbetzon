// Small overview of the board with the visible area outlined; shown while zoomed in.
import { h } from './dom.js';

const MARGIN = 8;

export function createMinimap(game) {
  const { cells } = game.puzzle;
  const n = cells.length;
  const dots = [];
  const grid = h('div', { class: 'mini-grid', style: `--n:${n}` });
  cells.forEach((row, r) => row.forEach((cell, c) => {
    const dot = h('i', { class: cell.block ? 'b' : '' });
    grid.append(dot);
    if (!cell.block) dots.push({ dot, r, c });
  }));
  const frame = h('div', { class: 'mini-frame' });
  const el = h('div', { class: 'minimap', 'aria-hidden': 'true', hidden: true }, grid, frame);

  return {
    el,
    /** entryRect: current word in unscaled content coordinates; the map moves away from it. */
    update(t, d, entryRect) {
      el.hidden = d.contentW * t.scale <= d.viewW + 1 && d.contentH * t.scale <= d.viewH + 1; // whole board visible
      if (el.hidden) return;
      if (entryRect) {
        const e = { left: t.x + entryRect.x * t.scale, top: t.y + entryRect.y * t.scale };
        e.right = e.left + entryRect.w * t.scale;
        e.bottom = e.top + entryRect.h * t.scale;
        const w = el.offsetWidth + MARGIN, hgt = el.offsetHeight + MARGIN;
        const hits = (x0, x1) => e.left < x1 && x0 < e.right && e.top < hgt && 0 < e.bottom;
        const rightBusy = hits(d.viewW - w, d.viewW);
        const leftBusy = hits(0, w);
        el.classList.toggle('left', rightBusy && !leftBusy);
        el.style.visibility = rightBusy && leftBusy ? 'hidden' : '';
      }
      const entry = game.currentEntry();
      const inWord = new Set(entry.cells.map(([r, c]) => `${r},${c}`));
      const solved = game.solvedCells();
      for (const { dot, r, c } of dots) {
        const k = `${r},${c}`;
        dot.className = inWord.has(k) ? 'w' : solved.has(k) ? 'g' : game.fills[r][c] ? 'f' : '';
      }
      const cw = d.contentW * t.scale, ch = d.contentH * t.scale;
      frame.style.left = `${(100 * -t.x) / cw}%`;
      frame.style.top = `${(100 * -t.y) / ch}%`;
      frame.style.width = `${(100 * d.viewW) / cw}%`;
      frame.style.height = `${(100 * d.viewH) / ch}%`;
    },
  };
}
