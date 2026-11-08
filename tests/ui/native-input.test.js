import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffInput, SENTINEL } from '../../app/js/ui/native-input.js';

test('sentinel leaves something for backspace to delete', () => {
  assert.ok(SENTINEL.length >= 2);
});

test('a typed letter is reported as added', () => {
  assert.deepEqual(diffInput(SENTINEL, `${SENTINEL}ש`), { erase: 0, added: 'ש' });
});

test('backspace on the sentinel is one erase', () => {
  assert.deepEqual(diffInput(SENTINEL, SENTINEL.slice(1)), { erase: 1, added: '' });
});

test('composition updates add only the new letters', () => {
  assert.deepEqual(diffInput(`${SENTINEL}של`, `${SENTINEL}שלו`), { erase: 0, added: 'ו' });
});

test('an IME replacing a word erases then adds', () => {
  assert.deepEqual(diffInput(`${SENTINEL}שלו`, `${SENTINEL}שלום`), { erase: 0, added: 'ם' });
  assert.deepEqual(diffInput(`${SENTINEL}כלב`, `${SENTINEL}כלא`), { erase: 1, added: 'א' });
});

test('pasting several letters adds them all', () => {
  assert.deepEqual(diffInput(SENTINEL, `${SENTINEL}בית`), { erase: 0, added: 'בית' });
});

test('clearing everything erases what was there', () => {
  assert.deepEqual(diffInput(`${SENTINEL}אב`, ''), { erase: SENTINEL.length + 2, added: '' });
});
