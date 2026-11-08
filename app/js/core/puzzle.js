// Runtime puzzle model built from the stored (raw) puzzle format.
import { computeSlots, slotCells } from './grid.js';

const slotKey = (s) => `${s.dir}:${s.row},${s.col}:${s.len}`;

/**
 * @param {{id,stage,world,size,rows:string[],entries:object[]}} raw
 * @returns {{id,stage,world,size,entries:object[],cells:object[][]}}
 */
export function loadPuzzle(raw) {
  const fail = () => { throw new Error(`puzzle mismatch: ${raw.id}`); };
  const { rows } = raw;
  const slots = computeSlots(rows);
  const slotByKey = new Map(slots.map((s) => [slotKey(s), s]));

  if (raw.entries.length !== slots.length) fail();
  const seen = new Set();
  const entries = raw.entries.map((e) => {
    const key = slotKey({ dir: e.dir, row: e.row, col: e.col, len: e.answer.length });
    const slot = slotByKey.get(key);
    if (!slot || seen.has(key) || slot.num !== e.num) fail();
    seen.add(key);
    const cells = slotCells(slot);
    cells.forEach(([r, c], i) => { if (rows[r][c] !== e.answer[i]) fail(); });
    const lengthsSum = (e.lengths ?? [e.answer.length]).reduce((a, b) => a + b, 0);
    if (lengthsSum !== e.answer.length) fail();
    return { ...e, lengths: e.lengths ?? [e.answer.length], cells };
  });

  const dirOrder = { across: 0, down: 1 };
  entries.sort((a, b) => a.num - b.num || dirOrder[a.dir] - dirOrder[b.dir]);
  entries.forEach((e, i) => { e.index = i; });

  const cells = rows.map((row, r) => [...row].map((ch, c) => ({
    block: ch === '#',
    answer: ch === '#' ? null : ch,
    num: null,
    across: null,
    down: null,
    finalForm: false,
    barAfter: { across: false, down: false },
  })));

  // Word-end bookkeeping: for each cell, is it a word end in every entry containing it?
  const endsEverywhere = new Map();
  for (const e of entries) {
    const [r0, c0] = e.cells[0];
    if (cells[r0][c0].num === null) cells[r0][c0].num = e.num;
    const wordEnds = new Set();
    let acc = 0;
    e.lengths.forEach((len, w) => {
      acc += len;
      wordEnds.add(acc - 1);
      if (w < e.lengths.length - 1) {
        const [r, c] = e.cells[acc - 1];
        cells[r][c].barAfter[e.dir] = true;
      }
    });
    e.cells.forEach(([r, c], i) => {
      cells[r][c][e.dir] = e.index;
      const k = `${r},${c}`;
      const prev = endsEverywhere.has(k) ? endsEverywhere.get(k) : true;
      endsEverywhere.set(k, prev && wordEnds.has(i));
    });
  }
  for (const [k, isEnd] of endsEverywhere) {
    const [r, c] = k.split(',').map(Number);
    cells[r][c].finalForm = isEnd;
  }

  return { id: raw.id, stage: raw.stage, world: raw.world, size: raw.size, entries, cells };
}
