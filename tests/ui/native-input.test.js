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

import { createInputTracker } from '../../app/js/ui/native-input.js';

function fakeBoard() {
  const log = [];
  let n = 0;
  return {
    log,
    handlers: {
      onLetter: (ch) => { log.push(`type ${ch}`); return /[א-ת]/.test(ch) ? `cell${n++}` : null; },
      onErase: () => log.push('erase'),
      onEraseAt: (tok) => log.push(`clear ${tok}`),
      onNext: () => log.push('next'),
      onLatin: () => log.push('latin'),
    },
  };
}

test('an IME rewriting its composition clears exactly the cells it wrote', () => {
  const b = fakeBoard();
  const t = createInputTracker(b.handlers);
  t.apply(SENTINEL, `${SENTINEL}ש`, true);
  t.apply(`${SENTINEL}ש`, `${SENTINEL}של`, true);
  t.apply(`${SENTINEL}של`, `${SENTINEL}תל`, true);
  assert.deepEqual(b.log, ['type ש', 'type ל', 'clear cell1', 'clear cell0', 'type ת', 'type ל']);
});

test('erasing composed Latin letters never touches the board', () => {
  const b = fakeBoard();
  const t = createInputTracker(b.handlers);
  t.apply(SENTINEL, `${SENTINEL}ab`, true);
  t.apply(`${SENTINEL}ab`, `${SENTINEL}a`, true);
  assert.deepEqual(b.log, ['latin', 'latin']);
});

test('outside a composition Backspace erases normally', () => {
  const b = fakeBoard();
  const t = createInputTracker(b.handlers);
  t.apply(SENTINEL, `${SENTINEL}ש`, false);
  t.apply(SENTINEL, SENTINEL.slice(1), false);
  assert.deepEqual(b.log, ['type ש', 'erase']);
});

test('a finished composition is forgotten', () => {
  const b = fakeBoard();
  const t = createInputTracker(b.handlers);
  t.apply(SENTINEL, `${SENTINEL}ש`, true);
  t.end();
  t.apply(SENTINEL, SENTINEL.slice(1), false);
  assert.deepEqual(b.log, ['type ש', 'erase']);
});
