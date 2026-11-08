import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSlots, slotCells } from '../../app/js/core/grid.js';

test('computeSlots numbers slots in reading order, across before down', () => {
  const slots = computeSlots(['כלב', 'ל#א', 'בית']);
  assert.deepEqual(slots, [
    { num: 1, dir: 'across', row: 0, col: 0, len: 3 },
    { num: 1, dir: 'down', row: 0, col: 0, len: 3 },
    { num: 2, dir: 'down', row: 0, col: 2, len: 3 },
    { num: 3, dir: 'across', row: 2, col: 0, len: 3 },
  ]);
});

test('runs of length 1 do not produce slots', () => {
  const slots = computeSlots(['א#ב', '###', 'גד#']);
  assert.deepEqual(slots, [{ num: 1, dir: 'across', row: 2, col: 0, len: 2 }]);
});

test('slotCells lists cells along the slot', () => {
  assert.deepEqual(slotCells({ num: 1, dir: 'across', row: 2, col: 1, len: 3 }), [[2, 1], [2, 2], [2, 3]]);
  assert.deepEqual(slotCells({ num: 1, dir: 'down', row: 0, col: 4, len: 2 }), [[0, 4], [1, 4]]);
});
