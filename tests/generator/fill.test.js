import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mulberry32 } from '../../tools/generator/rng.js';
import { buildLexicon } from '../../tools/generator/lexicon.js';
import { makeTemplate } from '../../tools/generator/template.js';
import { fillTemplate } from '../../tools/generator/fill.js';
import { computeSlots, slotCells } from '../../app/js/core/grid.js';
import { RING_VOCAB, v } from './helpers.js';

const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const words = (rows) => computeSlots(rows).map((s) => slotCells(s).map(([r, c]) => rows[r][c]).join(''));

test('lexicon normalizes answers, filters by level and matches patterns', () => {
  const lex = buildLexicon([v('a', 'שלום'), v('b', 'שמש'), v('c', 'בית ספר'), v('d', 'שמן', 'oil', 'B1')], 'A1', ORDER);
  assert.deepEqual(lex.byLength.get(4), ['שלומ']);
  assert.deepEqual(lex.byLength.get(6), ['ביתספר']);
  assert.deepEqual(lex.matching(3, new Map([[0, 'ש']])), ['שמש']);
  assert.deepEqual(lex.matching(3, new Map([[2, 'נ']])), []);
  assert.deepEqual(lex.matching(4, new Map()), ['שלומ']);
  assert.equal(lex.entriesFor('ביתספר')[0].id, 'c');
  assert.deepEqual(lex.entriesFor('שמנ'), []);
});

test('fills a hand-made ring with the only valid words', () => {
  const distractors = ['גזר', 'דבש', 'חלב', 'לחם', 'עוף', 'תות', 'זית', 'אגס', 'מלח', 'פרה', 'חתול', 'אריה', 'סוס', 'גמל', 'דוב', 'זאב', 'נמר', 'שועל', 'קוף', 'פיל', 'נחש', 'צב', 'עז', 'דג', 'יונה', 'נשר']
    .map((he, i) => v(`d${i}`, he));
  const lex = buildLexicon([...RING_VOCAB, ...distractors], 'A1', ORDER);
  const blocks = [[false, false, false], [false, true, false], [false, false, false]];
  const rows = fillTemplate(blocks, lex, mulberry32(3), { nodeBudget: 10000, score: () => 0 });
  assert.ok(rows, 'filled');
  const ws = words(rows);
  ws.forEach((w) => assert.ok(lex.entriesFor(w).length, `${w} is in the lexicon`));
  assert.equal(new Set(ws).size, ws.length, 'no repeated word');
});

test('fills generated templates from the real A1 vocabulary', () => {
  const vocab = JSON.parse(readFileSync(new URL('../../content/vocab/a1.json', import.meta.url), 'utf8'));
  const lex = buildLexicon(vocab, 'A1', ORDER);
  let ok = 0;
  for (let seed = 1; seed <= 30 && ok < 2; seed++) {
    const rng = mulberry32(seed);
    const t = makeTemplate(7, rng, { keep: 0.7, maxLen: 5 });
    if (!t) continue;
    const rows = fillTemplate(t, lex, rng, { nodeBudget: 20000, score: () => 0 });
    if (!rows) continue;
    ok++;
    const ws = words(rows);
    ws.forEach((w) => assert.ok(lex.entriesFor(w).length, `${w} is in the lexicon`));
    assert.equal(new Set(ws).size, ws.length, 'no repeated word');
    rows.forEach((row, r) => [...row].forEach((ch, c) => assert.equal(ch === '#', t[r][c])));
  }
  assert.ok(ok >= 1, 'at least one 7×7 template filled');
});

test('fill gives up when the budget is exhausted', () => {
  const lex = buildLexicon([v('a', 'אב')], 'A1', ORDER);
  const blocks = [[false, false, false], [false, true, false], [false, false, false]];
  assert.equal(fillTemplate(blocks, lex, mulberry32(1), { nodeBudget: 50, score: () => 0 }), null);
});
