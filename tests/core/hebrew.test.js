import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_LETTERS, normalizeLetter, answerLetters, wordLengths, displayLetter, answerProblems,
} from '../../app/js/core/hebrew.js';

test('BASE_LETTERS has the 22 base letters', () => {
  assert.equal(BASE_LETTERS, 'אבגדהוזחטיכלמנסעפצקרשת');
});

test('normalizeLetter maps finals to base and rejects non-letters', () => {
  assert.equal(normalizeLetter('ם'), 'מ');
  assert.equal(normalizeLetter('ץ'), 'צ');
  assert.equal(normalizeLetter('ך'), 'כ');
  assert.equal(normalizeLetter('ן'), 'נ');
  assert.equal(normalizeLetter('ף'), 'פ');
  assert.equal(normalizeLetter('א'), 'א');
  assert.equal(normalizeLetter('a'), null);
  assert.equal(normalizeLetter(' '), null);
  assert.equal(normalizeLetter(''), null);
});

test('answerLetters strips spaces and normalizes finals', () => {
  assert.equal(answerLetters('יום הולדת'), 'יומהולדת');
  assert.equal(answerLetters('אף'), 'אפ');
});

test('wordLengths counts letters per word', () => {
  assert.deepEqual(wordLengths('תחנת רכבת'), [4, 4]);
  assert.deepEqual(wordLengths('כלב'), [3]);
  assert.deepEqual(wordLengths('בית ספר'), [3, 3]);
});

test('displayLetter shows final form only when asked and when one exists', () => {
  assert.equal(displayLetter('צ', true), 'ץ');
  assert.equal(displayLetter('צ', false), 'צ');
  assert.equal(displayLetter('מ', true), 'ם');
  assert.equal(displayLetter('א', true), 'א');
  assert.equal(displayLetter('', true), '');
});

test('answerProblems accepts valid answers', () => {
  assert.deepEqual(answerProblems('כלב'), []);
  assert.deepEqual(answerProblems('שלום'), []);
  assert.deepEqual(answerProblems('בית ספר'), []);
  assert.deepEqual(answerProblems('ארץ'), []);
});

test('answerProblems reports each rule violation', () => {
  assert.ok(answerProblems('כלב גדול שחור ענק').includes('words'));
  assert.ok(answerProblems('ם').includes('length'));
  assert.ok(answerProblems('מים!').includes('chars'));
  assert.ok(answerProblems('םים').includes('final-mid'));
  assert.ok(answerProblems('מימ').includes('nonfinal-end'));
  assert.ok(answerProblems('ג׳ירפה').includes('chars'));
  assert.ok(answerProblems('שָׁלוֹם').includes('chars'));
  assert.ok(answerProblems('בית  ספר').includes('chars'));
  assert.ok(answerProblems(' כלב').includes('chars'));
  assert.ok(answerProblems('אבגדהוזחטי').includes('length'));
});
