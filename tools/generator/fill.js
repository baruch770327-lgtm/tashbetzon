// Backtracking crossword filler: most-constrained slot first, no repeated answers.
import { computeSlots, slotCells } from '../../app/js/core/grid.js';

const MAX_CANDIDATES = 40;

export function fillTemplate(blocks, lexicon, rng, { nodeBudget, score, isAllowed = () => true }) {
  const rowsTemplate = blocks.map((row) => row.map((b) => (b ? '#' : '.')).join(''));
  const slots = computeSlots(rowsTemplate).map((s) => ({ ...s, cells: slotCells(s) }));
  const grid = blocks.map((row) => row.map(() => ''));
  const assigned = new Array(slots.length).fill(null);
  const used = new Set();
  let nodes = 0;

  const pattern = (slot) => {
    const p = new Map();
    slot.cells.forEach(([r, c], i) => { if (grid[r][c]) p.set(i, grid[r][c]); });
    return p;
  };

  function candidatesFor(slot) {
    const p = pattern(slot);
    if (p.size === slot.len) {
      const w = slot.cells.map(([r, c]) => grid[r][c]).join('');
      return lexicon.entriesFor(w).length && !used.has(w) && isAllowed(w) ? [w] : [];
    }
    return lexicon.matching(slot.len, p).filter((w) => !used.has(w) && isAllowed(w));
  }

  function solve() {
    nodes++;
    if (nodes > nodeBudget) return false;
    let best = -1, bestCands = null;
    for (let i = 0; i < slots.length; i++) {
      if (assigned[i] !== null) continue;
      const cands = candidatesFor(slots[i]);
      if (cands.length === 0) return false;
      if (best < 0 || cands.length < bestCands.length) {
        best = i;
        bestCands = cands;
        if (cands.length === 1) break;
      }
    }
    if (best < 0) return true;
    const slot = slots[best];
    const ranked = bestCands
      .map((w) => [w, score(w) + rng() * 0.5])
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CANDIDATES);
    for (const [w] of ranked) {
      const placed = [];
      slot.cells.forEach(([r, c], i) => {
        if (!grid[r][c]) { grid[r][c] = w[i]; placed.push([r, c]); }
      });
      assigned[best] = w;
      used.add(w);
      if (solve()) return true;
      used.delete(w);
      assigned[best] = null;
      for (const [r, c] of placed) grid[r][c] = '';
      if (nodes > nodeBudget) return false;
    }
    return false;
  }

  if (!solve()) return null;
  return grid.map((row, r) => row.map((ch, c) => (blocks[r][c] ? '#' : ch)).join(''));
}
