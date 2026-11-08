// Small overview of the board with the visible area outlined; shown while zoomed in.
import { h } from './dom.js';

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
    update(t, d) {
      el.hidden = t.scale < 1.2;
      if (el.hidden) return;
      const entry = game.currentEntry();
      const inWord = new Set(entry.cells.map(([r, c]) => `${r},${c}`));
      for (const { dot, r, c } of dots) {
        dot.className = inWord.has(`${r},${c}`) ? 'w' : game.fills[r][c] === game.puzzle.cells[r][c].answer ? 'g' : '';
      }
      const cw = d.contentW * t.scale, ch = d.contentH * t.scale;
      frame.style.left = `${(100 * -t.x) / cw}%`;
      frame.style.top = `${(100 * -t.y) / ch}%`;
      frame.style.width = `${(100 * d.viewW) / cw}%`;
      frame.style.height = `${(100 * d.viewH) / ch}%`;
    },
  };
}
