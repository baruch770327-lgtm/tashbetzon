import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, loadProgress, saveProgress } from '../../app/js/storage.js';
import { defaultProgress } from '../../app/js/core/progress.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
};
const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

test('save then load round-trips', () => {
  const s = memory();
  const p = defaultProgress();
  p.coins = 77;
  assert.equal(saveProgress(p, s), true);
  assert.ok(s.map.has(STORAGE_KEY));
  assert.equal(loadProgress(s).coins, 77);
});

test('load falls back to defaults when storage throws', () => {
  assert.deepEqual(loadProgress(broken), defaultProgress());
  assert.equal(saveProgress(defaultProgress(), broken), false);
});

test('load falls back to defaults on corrupt or missing data', () => {
  const s = memory();
  assert.deepEqual(loadProgress(s), defaultProgress());
  s.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(loadProgress(s), defaultProgress());
  assert.deepEqual(loadProgress(undefined), defaultProgress());
});
