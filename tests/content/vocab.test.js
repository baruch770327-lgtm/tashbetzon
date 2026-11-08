import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { answerProblems } from '../../app/js/core/hebrew.js';

const root = new URL('../../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const levels = read('app/data/levels.json');
const vocabFile = (id) => `content/vocab/${id.toLowerCase()}.json`;
const present = levels.filter((l) => existsSync(new URL(vocabFile(l.id), root)));
const vocabs = Object.fromEntries(present.map((l) => [l.id, read(vocabFile(l.id))]));
const all = Object.values(vocabs).flat();

const POS = ['noun', 'verb', 'adj', 'adv', 'phrase', 'other'];
const MIN_SIZE = { A1: 500, A2: 550, B1: 550, B2: 500, C1: 450, C2: 450 };
const MIN_PHRASE_SHARE = 0.08;
// Words with two common spellings are kept out of the game (spec §2.3 rule 2).
const FORBIDDEN_SPELLINGS = [
  'אמא', 'אימא', 'אוירון', 'אווירון', 'חניה', 'חנייה', 'הכל', 'הכול', 'ראיון', 'ריאיון', 'מוזיקה', 'מוסיקה',
  'משכנתא', 'משכנתה', 'שריפה', 'שרפה', 'כורסה', 'כורסא', 'מזרן', 'מזרון', 'תכף', 'תיכף', 'מיד', 'מייד',
  'אידאליזם', 'אידיאליזם',
];
// Translations that were wrong once; pinned so they do not come back.
const PINNED = {
  tiger: 'טיגריס', leopard: 'נמר', 'to regret': 'להתחרט', levy: 'היטל', toll: 'אגרה', 'pickup truck': 'טנדר',
  inlet: 'לשון ים', temper: 'מזג',
};
// English clues whose common Hebrew answer differs from ours (same length) must carry a note.
const NOTE_REQUIRED = ['to need', 'chilly', 'stream', 'well', 'photo', 'mine', 'drill', 'fool', 'prior to'];

test('every available level has a vocabulary file', () => {
  const missing = levels.filter((l) => l.available && !vocabs[l.id]).map((l) => l.id);
  assert.deepEqual(missing, []);
});

test('levels.json lists six levels, each with five worlds', () => {
  assert.deepEqual(levels.map((l) => l.id), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  assert.deepEqual(levels.map((l) => l.size), [11, 11, 13, 13, 15, 15]);
  for (const l of levels) {
    assert.equal(l.worlds?.length, 5, `${l.id} worlds`);
    if (l.available) assert.equal(l.file, `data/puzzles/${l.id.toLowerCase()}.json`, l.id);
  }
  assert.equal(levels[0].available, true);
});

for (const level of present) {
  const vocab = vocabs[level.id];
  const prefix = level.id.toLowerCase();
  const topics = new Set(level.worlds.flatMap((w) => w.topics));

  test(`${level.id}: fields and types`, () => {
    const idPattern = new RegExp(`^${prefix}-\\d{4}$`);
    for (const e of vocab) {
      assert.match(e.id, idPattern, JSON.stringify(e));
      assert.match(e.en, /^[A-Za-z](?:[A-Za-z' -]*[A-Za-z])?$/, e.id);
      assert.equal(typeof e.he, 'string', e.id);
      assert.equal(e.level, level.id, e.id);
      assert.ok(POS.includes(e.pos), `${e.id} pos ${e.pos}`);
      assert.ok(e.note === null || (typeof e.note === 'string' && /^\(.+\)$/.test(e.note)), `${e.id} note`);
      if (e.pos === 'verb') assert.ok(e.en.startsWith('to '), `${e.id} verbs start with "to "`);
    }
    const ids = vocab.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, 'unique ids');
  });

  test(`${level.id}: Hebrew answers follow the spelling rules`, () => {
    const bad = vocab.filter((e) => answerProblems(e.he).length).map((e) => `${e.id} ${e.he} ${answerProblems(e.he)}`);
    assert.deepEqual(bad, []);
    const forbidden = vocab.filter((e) => e.he.split(' ').some((w) => FORBIDDEN_SPELLINGS.includes(w))).map((e) => e.id);
    assert.deepEqual(forbidden, []);
  });

  test(`${level.id}: topics belong to the level's worlds, each with at least 15 entries`, () => {
    const bad = vocab.filter((e) => !topics.has(e.topic)).map((e) => `${e.id} ${e.topic}`);
    assert.deepEqual(bad, []);
    for (const t of topics) {
      const n = vocab.filter((e) => e.topic === t).length;
      assert.ok(n >= 15, `${level.id} topic ${t} has ${n}`);
    }
  });

  test(`${level.id}: size and multi-word share`, () => {
    assert.ok(vocab.length >= MIN_SIZE[level.id], `${level.id} has only ${vocab.length}`);
    const share = vocab.filter((e) => e.he.includes(' ')).length / vocab.length;
    assert.ok(share >= MIN_PHRASE_SHARE, `${level.id} multi-word share ${share.toFixed(3)}`);
  });
}

test('English clues are unique across all levels', () => {
  const seen = new Map();
  const dups = [];
  for (const e of all) {
    const k = e.en.toLowerCase();
    if (seen.has(k)) dups.push(`${seen.get(k)}/${e.id} "${e.en}"`);
    seen.set(k, e.id);
  }
  assert.deepEqual(dups, []);
});

test('pinned translations stay correct', () => {
  for (const [en, he] of Object.entries(PINNED)) {
    const e = all.find((x) => x.en === en);
    assert.ok(e, `${en} exists`);
    assert.equal(e.he, he, en);
  }
});

test('ambiguous clues carry a note', () => {
  const missing = NOTE_REQUIRED.filter((en) => !all.find((e) => e.en === en)?.note);
  assert.deepEqual(missing, []);
});
