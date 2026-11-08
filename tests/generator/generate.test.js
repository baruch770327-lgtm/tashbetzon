import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel, optionsFor, MAX_ANSWER_USES, MAX_SHORT_USES, SIZE_OPTIONS } from '../../tools/generator/generate.js';

test('generator respects the per-answer cap', () => {
  assert.equal(MAX_ANSWER_USES, 8);
  assert.equal(MAX_SHORT_USES, 12);
  // A tight cap on a small run shows the cap is enforced (without it ים/יד repeat far more).
  // Every board that was not reported as relaxed keeps every answer within the cap at the time it was made.
  const { puzzles, relaxedStages } = generateLevel({ level: 'A1', seed: 3, count: 8, quiet: true, maxUses: 2, maxShortUses: 2 });
  assert.ok(relaxedStages.length < puzzles.length, 'most boards keep the cap');
  const uses = new Map();
  for (const p of puzzles) {
    for (const e of p.entries) uses.set(e.answer, (uses.get(e.answer) ?? 0) + 1);
    if (relaxedStages.includes(p.stage)) continue;
    for (const e of p.entries) assert.ok(uses.get(e.answer) <= 2, `${p.id}: ${e.answer} used ${uses.get(e.answer)} times`);
  }
});

test('puzzles limit two-letter answers per board', () => {
  const { puzzles } = generateLevel({ level: 'A1', seed: 5, count: 6, quiet: true });
  for (const p of puzzles) {
    const short = p.entries.filter((e) => e.answer.length === 2).length;
    assert.ok(short <= SIZE_OPTIONS[p.size].maxShort, `${p.id} has ${short} two-letter answers`);
  }
});

test('higher levels draw only on their own level and the one below', () => {
  const { puzzles } = generateLevel({ level: 'B1', seed: 2, count: 1, quiet: true });
  const levels = new Set(puzzles.flatMap((p) => p.entries.map((e) => e.level)));
  assert.deepEqual([...levels].sort(), ['A2', 'B1']);
});

test('advanced levels can build a run of 15×15 boards', () => {
  const { puzzles } = generateLevel({ level: 'C2', seed: 4, count: 8, quiet: true });
  assert.equal(puzzles.length, 8);
  assert.ok(puzzles.every((p) => p.size === 15 && p.entries.length >= 50));
});

test('upper levels widen the vocabulary window and use their tuned options', () => {
  assert.equal(optionsFor('B1', 13).window, 1);
  assert.equal(optionsFor('B2', 13).window, 2);
  assert.equal(optionsFor('C1', 15).window, 2);
  assert.equal(optionsFor('B1', 13).minWords, SIZE_OPTIONS[13].minWords);
  const { puzzles } = generateLevel({ level: 'C1', seed: 2, count: 1, quiet: true });
  const levels = new Set(puzzles.flatMap((p) => p.entries.map((e) => e.level)));
  assert.ok([...levels].every((l) => ['B1', 'B2', 'C1'].includes(l)), [...levels].join(','));
  assert.ok(puzzles[0].entries.length >= optionsFor('C1', 15).minWords);
});
