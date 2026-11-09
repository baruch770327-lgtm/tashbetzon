import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePuzzle } from '../../tools/generator/validate.js';
import { RING_VOCAB, ringPuzzle, v } from './helpers.js';

const byId = (list) => new Map(list.map((e) => [e.id, e]));
const opts = { level: 'A1', minWords: 4, minWhite: 0.6, minLevelShare: 0.6 };
const has = (errors, prefix) => errors.some((e) => e.startsWith(prefix));

test('a valid puzzle has no errors', () => {
  assert.deepEqual(validatePuzzle(ringPuzzle(), byId(RING_VOCAB), opts), []);
});

test('duplicate answers are reported', () => {
  const p = ringPuzzle(['אבא', 'ב#ב', 'אבא']);
  p.entries = p.entries.map((e) => ({ ...e, answer: 'אבא', he: 'אבא', vocabId: 'dad' }));
  const errors = validatePuzzle(p, byId([v('dad', 'אבא')]), opts);
  assert.ok(has(errors, 'duplicate'), errors.join('; '));
});

test('asymmetric blocks are reported', () => {
  const p = ringPuzzle(['כלב#', 'ו#ש#', 'סיר#']);
  const errors = validatePuzzle(p, byId(RING_VOCAB), opts);
  assert.ok(has(errors, 'symmetry'), errors.join('; '));
});

test('low white ratio is reported', () => {
  const p = ringPuzzle(['כלב##', 'ו#ש##', 'סיר##', '#####', '#####']);
  const errors = validatePuzzle(p, byId(RING_VOCAB), opts);
  assert.ok(has(errors, 'white'), errors.join('; '));
});

test('unknown vocabulary ids and mismatched answers are reported', () => {
  const p = ringPuzzle();
  p.entries[0].vocabId = 'zz';
  assert.ok(has(validatePuzzle(p, byId(RING_VOCAB), opts), 'vocab'));
  const q = ringPuzzle();
  q.entries[1].vocabId = 'v1';
  assert.ok(has(validatePuzzle(q, byId(RING_VOCAB), opts), 'vocab'));
});

test('too few words and low level share are reported', () => {
  assert.ok(has(validatePuzzle(ringPuzzle(), byId(RING_VOCAB), { ...opts, minWords: 5 }), 'words'));
  const lower = RING_VOCAB.map((e) => ({ ...e, level: 'A0' }));
  assert.ok(has(validatePuzzle(ringPuzzle(), byId(lower), opts), 'level-share'));
});

test('a broken grid is reported instead of throwing', () => {
  const p = ringPuzzle();
  p.entries[0].answer = 'כלה';
  assert.ok(has(validatePuzzle(p, byId(RING_VOCAB), opts), 'load'));
});

test('entries from a level above the puzzle level are reported', () => {
  const higher = RING_VOCAB.map((e, i) => (i === 0 ? { ...e, level: 'B1' } : e));
  const errors = validatePuzzle(ringPuzzle(), byId(higher), { ...opts, minLevelShare: 0 });
  assert.ok(has(errors, 'level:'), errors.join('; '));
});
