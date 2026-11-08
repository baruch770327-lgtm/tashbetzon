import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { answerProblems } from '../../app/js/core/hebrew.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const vocab = read('content/vocab/a1.json');
const levels = read('app/data/levels.json');
const a1 = levels.find((l) => l.id === 'A1');
const topics = new Set(a1.worlds.flatMap((w) => w.topics));
const POS = ['noun', 'verb', 'adj', 'adv', 'phrase', 'other'];
// Words with two common spellings are kept out of the game (spec §2.3 rule 2).
const FORBIDDEN_SPELLINGS = ['אמא', 'אימא', 'אוירון', 'אווירון', 'חניה', 'חנייה', 'הכל', 'הכול'];
// Translations that were wrong once; pinned so they do not come back.
const PINNED = { tiger: 'טיגריס', leopard: 'נמר' };

test('every entry has the right fields and types', () => {
  for (const e of vocab) {
    assert.match(e.id, /^a1-\d{4}$/, JSON.stringify(e));
    assert.equal(typeof e.en, 'string');
    assert.match(e.en, /^[A-Za-z](?:[A-Za-z' -]*[A-Za-z])?$/, e.id);
    assert.equal(typeof e.he, 'string');
    assert.equal(e.level, 'A1', e.id);
    assert.ok(POS.includes(e.pos), `${e.id} pos ${e.pos}`);
    assert.ok(e.note === null || (typeof e.note === 'string' && /^\(.+\)$/.test(e.note)), `${e.id} note`);
    if (e.pos === 'verb') assert.ok(e.en.startsWith('to '), `${e.id} verbs start with "to "`);
  }
});

test('ids and English clues are unique', () => {
  const ids = vocab.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const seen = new Map();
  const dups = [];
  for (const e of vocab) {
    const k = e.en.toLowerCase();
    if (seen.has(k)) dups.push(`${seen.get(k)}/${e.id} "${e.en}"`);
    seen.set(k, e.id);
  }
  assert.deepEqual(dups, []);
});

test('Hebrew answers follow the spelling rules', () => {
  const bad = vocab.filter((e) => answerProblems(e.he).length).map((e) => `${e.id} ${e.he} ${answerProblems(e.he)}`);
  assert.deepEqual(bad, []);
  const forbidden = vocab.filter((e) => e.he.split(' ').some((w) => FORBIDDEN_SPELLINGS.includes(w))).map((e) => e.id);
  assert.deepEqual(forbidden, []);
});

test('topics belong to A1 worlds and each has at least 15 entries', () => {
  const bad = vocab.filter((e) => !topics.has(e.topic)).map((e) => `${e.id} ${e.topic}`);
  assert.deepEqual(bad, []);
  for (const t of topics) {
    const n = vocab.filter((e) => e.topic === t).length;
    assert.ok(n >= 15, `topic ${t} has ${n}`);
  }
});

test('size: at least 500 entries and 40 multi-word answers', () => {
  assert.ok(vocab.length >= 500, `only ${vocab.length}`);
  const phrases = vocab.filter((e) => e.he.includes(' ')).length;
  assert.ok(phrases >= 40, `only ${phrases} multi-word answers`);
});

test('levels.json lists six levels with A1 available and five A1 worlds', () => {
  assert.deepEqual(levels.map((l) => l.id), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  assert.deepEqual(levels.map((l) => l.size), [11, 11, 13, 13, 15, 15]);
  assert.equal(a1.available, true);
  assert.equal(a1.file, 'data/puzzles/a1.json');
  assert.equal(a1.worlds.length, 5);
  assert.ok(levels.slice(1).every((l) => l.available === false));
});

test('pinned translations stay correct', () => {
  for (const [en, he] of Object.entries(PINNED)) {
    const e = vocab.find((x) => x.en === en);
    assert.ok(e, `${en} exists`);
    assert.equal(e.he, he, en);
  }
});
