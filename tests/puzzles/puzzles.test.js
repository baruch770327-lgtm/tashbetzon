import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validatePuzzle } from '../../tools/generator/validate.js';
import { SIZE_OPTIONS } from '../../tools/generator/generate.js';

const root = new URL('../../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const levels = read('app/data/levels.json');
const vocab = readdirSync(new URL('content/vocab/', root)).flatMap((f) => read(`content/vocab/${f}`));
const vocabById = new Map(vocab.map((e) => [e.id, e]));

for (const level of levels.filter((l) => l.available)) {
  test(`${level.id}: 50 valid puzzles`, () => {
    const file = read(`app/${level.file}`);
    assert.equal(file.level, level.id);
    assert.equal(file.version, 1);
    const { puzzles } = file;
    assert.equal(puzzles.length, 50);
    assert.equal(new Set(puzzles.map((p) => p.id)).size, 50);
    assert.deepEqual(puzzles.map((p) => p.stage), Array.from({ length: 50 }, (_, i) => i + 1));
    const minWords = SIZE_OPTIONS[level.size].minWords;
    for (const p of puzzles) {
      assert.equal(p.size, level.size, p.id);
      assert.equal(p.world, Math.ceil(p.stage / 10), p.id);
      assert.equal(p.rows.length, level.size, p.id);
      const errors = validatePuzzle(p, vocabById, { level: level.id, minWords, minWhite: 0.6, minLevelShare: 0.6 });
      assert.deepEqual(errors, [], p.id);
    }
  });
}
