import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../../tools/generator/rng.js';
import { makeTemplate, isSymmetric, isConnected, runs } from '../../tools/generator/template.js';

test('mulberry32 is deterministic and in [0,1)', () => {
  const a = mulberry32(1), b = mulberry32(1);
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.notEqual(mulberry32(2)(), xs[0]);
});

test('templates are symmetric, connected, covered and respect maxLen', () => {
  let made = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const t = makeTemplate(11, mulberry32(seed), { keep: 0.7, maxLen: 6 });
    if (!t) continue;
    made++;
    assert.equal(t.length, 11);
    assert.ok(isSymmetric(t), `seed ${seed} symmetric`);
    assert.ok(isConnected(t), `seed ${seed} connected`);
    const rs = runs(t);
    assert.ok(rs.every((r) => r.length <= 6), `seed ${seed} maxLen`);
    const covered = new Set(rs.flat().map(([r, c]) => `${r},${c}`));
    for (let r = 0; r < 11; r++) for (let c = 0; c < 11; c++) {
      if (!t[r][c]) assert.ok(covered.has(`${r},${c}`), `seed ${seed} cell ${r},${c} covered`);
    }
  }
  assert.ok(made >= 5, `only ${made} of 100 seeds produced a template`);
});
