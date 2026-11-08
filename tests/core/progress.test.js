import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProgress, migrate, recordCompletion, spendCoins, completedCount, isStageUnlocked, isLevelUnlocked,
} from '../../app/js/core/progress.js';
import { loadPuzzle } from '../../app/js/core/puzzle.js';
import { shalomRaw } from './fixtures.js';

const puzzle = () => loadPuzzle(shalomRaw());

test('defaults', () => {
  const p = defaultProgress();
  assert.equal(p.version, 1);
  assert.equal(p.coins, 100);
  assert.deepEqual(p.settings, { sound: true, vibrate: true, autoCheck: false });
  assert.equal(p.lastPlayed, null);
});

test('migrate rejects unknown shapes and fills missing fields', () => {
  assert.deepEqual(migrate(null), defaultProgress());
  assert.deepEqual(migrate({ version: 9 }), defaultProgress());
  assert.deepEqual(migrate('x'), defaultProgress());
  const m = migrate({ version: 1, coins: 5, settings: { sound: false } });
  assert.equal(m.coins, 5);
  assert.equal(m.settings.sound, false);
  assert.equal(m.settings.autoCheck, false);
  assert.deepEqual(m.stages, {});
});

test('first completion pays coins and records words', () => {
  const p = defaultProgress();
  p.inProgress['F-1'] = { fills: [] };
  const r = recordCompletion(p, puzzle(), { reveals: 0, elapsedMs: 5000, now: 42 });
  assert.equal(r.stars, 3);
  assert.equal(r.coinsEarned, 50);
  assert.equal(r.newWords.length, 3);
  assert.equal(p.coins, 150);
  assert.deepEqual(p.stages['F-1'], { stars: 3, bestMs: 5000 });
  assert.equal(p.inProgress['F-1'], undefined);
  assert.deepEqual(p.words['v-שלומ'], { en: 'שלומ', he: 'שלום', level: 'A1', firstMs: 42 });
});

test('replays pay only for improved stars and keep the best time', () => {
  const p = defaultProgress();
  recordCompletion(p, puzzle(), { reveals: 5, elapsedMs: 9000, now: 1 });
  assert.equal(p.stages['F-1'].stars, 1);
  const same = recordCompletion(p, puzzle(), { reveals: 5, elapsedMs: 4000, now: 2 });
  assert.equal(same.coinsEarned, 0);
  assert.equal(same.newWords.length, 0);
  assert.equal(p.stages['F-1'].bestMs, 4000);
  const better = recordCompletion(p, puzzle(), { reveals: 0, elapsedMs: 8000, now: 3 });
  assert.equal(better.coinsEarned, 20);
  assert.deepEqual(p.stages['F-1'], { stars: 3, bestMs: 4000 });
  const worse = recordCompletion(p, puzzle(), { reveals: 9, elapsedMs: 8000, now: 4 });
  assert.equal(worse.coinsEarned, 0);
  assert.equal(p.stages['F-1'].stars, 3);
});

test('spendCoins refuses an overdraft', () => {
  const p = defaultProgress();
  assert.equal(spendCoins(p, 130), false);
  assert.equal(p.coins, 100);
  assert.equal(spendCoins(p, 30), true);
  assert.equal(p.coins, 70);
});

test('stage unlocking follows completion order', () => {
  const p = defaultProgress();
  const ids = ['A1-01', 'A1-02', 'A1-03'];
  assert.equal(isStageUnlocked(p, ids, 'A1-01'), true);
  assert.equal(isStageUnlocked(p, ids, 'A1-02'), false);
  p.stages['A1-01'] = { stars: 1, bestMs: 1 };
  assert.equal(isStageUnlocked(p, ids, 'A1-02'), true);
  assert.equal(isStageUnlocked(p, ids, 'A1-03'), false);
  assert.equal(isStageUnlocked(p, ids, 'nope'), false);
  assert.equal(completedCount(p, ids), 1);
});

test('a level unlocks after 40 completions of the previous level', () => {
  const levels = [{ id: 'A1', available: true }, { id: 'A2', available: true }, { id: 'B1', available: false }];
  const a1 = Array.from({ length: 50 }, (_, i) => `A1-${i + 1}`);
  const byLevel = { A1: a1, A2: [], B1: [] };
  const p = defaultProgress();
  assert.equal(isLevelUnlocked(p, levels, 'A1', byLevel), true);
  a1.slice(0, 39).forEach((id) => { p.stages[id] = { stars: 1, bestMs: 1 }; });
  assert.equal(isLevelUnlocked(p, levels, 'A2', byLevel), false);
  p.stages[a1[39]] = { stars: 1, bestMs: 1 };
  assert.equal(isLevelUnlocked(p, levels, 'A2', byLevel), true);
  assert.equal(isLevelUnlocked(p, levels, 'B1', byLevel), false);
});
