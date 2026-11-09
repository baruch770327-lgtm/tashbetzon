import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPuzzle } from '../../app/js/core/puzzle.js';

const entry = (o) => ({ vocabId: 'x', en: 'x', note: null, level: 'A1', ...o });

const schoolWind = () => ({
  id: 'T-1', stage: 1, world: 1, size: 6,
  rows: ['ביתספר', '#####ו', '#####ח'],
  entries: [
    entry({ num: 1, dir: 'across', row: 0, col: 0, answer: 'ביתספר', lengths: [3, 3], he: 'בית ספר' }),
    entry({ num: 2, dir: 'down', row: 0, col: 5, answer: 'רוח', lengths: [3], he: 'רוח' }),
  ],
});

test('entries get index and cells, cells link back to entries', () => {
  const p = loadPuzzle(schoolWind());
  assert.equal(p.entries.length, 2);
  assert.equal(p.entries[1].index, 1);
  assert.deepEqual(p.entries[1].cells, [[0, 5], [1, 5], [2, 5]]);
  assert.equal(p.cells[0][5].across, 0);
  assert.equal(p.cells[0][5].down, 1);
  assert.equal(p.cells[0][5].num, 2);
  assert.equal(p.cells[1][0].block, true);
  assert.equal(p.cells[0][0].answer, 'ב');
});

test('multi-word answers get a bar after each non-final word', () => {
  const p = loadPuzzle(schoolWind());
  assert.equal(p.cells[0][2].barAfter.across, true);
  assert.equal(p.cells[0][3].barAfter.across, false);
  assert.equal(p.cells[0][5].barAfter.across, false);
  assert.equal(p.cells[0][2].barAfter.down, false);
});

test('finalForm only when the cell ends a word in every entry containing it', () => {
  const single = loadPuzzle({
    id: 'T-2', stage: 1, world: 1, size: 4, rows: ['שלומ'],
    entries: [entry({ num: 1, dir: 'across', row: 0, col: 0, answer: 'שלומ', lengths: [4], he: 'שלום' })],
  });
  assert.equal(single.cells[0][3].finalForm, true);
  assert.equal(single.cells[0][2].finalForm, false);

  const crossed = loadPuzzle({
    id: 'T-3', stage: 1, world: 1, size: 3, rows: ['לחמ', '##ה'],
    entries: [
      entry({ num: 1, dir: 'across', row: 0, col: 0, answer: 'לחמ', lengths: [3], he: 'לחם' }),
      entry({ num: 2, dir: 'down', row: 0, col: 2, answer: 'מה', lengths: [2], he: 'מה' }),
    ],
  });
  assert.equal(crossed.cells[0][2].finalForm, false);
  assert.equal(crossed.cells[1][2].finalForm, true);
});

test('loadPuzzle throws when an answer disagrees with the rows', () => {
  const raw = schoolWind();
  raw.entries[1].answer = 'רוע';
  assert.throws(() => loadPuzzle(raw), /puzzle mismatch: T-1/);
});

test('loadPuzzle throws when an entry is not a slot of the grid', () => {
  const raw = schoolWind();
  raw.entries[1].row = 1;
  assert.throws(() => loadPuzzle(raw), /puzzle mismatch: T-1/);
});

test('loadPuzzle throws when a slot has no entry', () => {
  const raw = schoolWind();
  raw.entries.pop();
  assert.throws(() => loadPuzzle(raw), /puzzle mismatch: T-1/);
});
