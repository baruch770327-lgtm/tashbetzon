import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPuzzle } from '../../app/js/core/puzzle.js';
import { Game } from '../../app/js/core/game.js';
import { shalomRaw } from './fixtures.js';

const newGame = (saved) => new Game(loadPuzzle(shalomRaw()), saved);
const typeAll = (g, letters) => { for (const ch of letters) g.type(ch); };

test('starts on the first cell of the first entry', () => {
  const g = newGame();
  assert.deepEqual(g.cursor, { row: 0, col: 0, dir: 'across' });
  assert.equal(g.currentEntry().answer, 'שלומ');
  assert.equal(g.reveals, 0);
});

test('type normalizes final letters', () => {
  const g = newGame();
  typeAll(g, 'שלוםם'); // final mem typed in the last cell, and again at the end
  assert.equal(g.fills[0][3], 'מ');
  assert.equal(g.isEntrySolved(0), true);
  g.select(0, 3); // same cell again: switch to down
  assert.equal(g.cursor.dir, 'down');
  g.select(1, 3);
  g.type('ו'); g.type('ת');
  g.select(0, 3);
  g.type('ם'); // final letter at the start of a word still counts as מ
  assert.equal(g.fills[0][3], 'מ');
  assert.equal(g.isEntrySolved(2), true);
});

test('type ignores non-Hebrew input', () => {
  const g = newGame();
  g.type('a'); g.type(' ');
  assert.equal(g.fills[0][0], '');
  assert.deepEqual(g.cursor, { row: 0, col: 0, dir: 'across' });
});

test('type advances within the entry and stops at its end', () => {
  const g = newGame();
  typeAll(g, 'אבגדהו');
  assert.deepEqual(g.cursor, { row: 0, col: 3, dir: 'across' });
  assert.equal(g.fills[0].join(''), 'אבגו');
});

test('select toggles direction on the same cell when both exist', () => {
  const g = newGame();
  g.select(0, 0);
  assert.equal(g.cursor.dir, 'down');
  g.select(0, 0);
  assert.equal(g.cursor.dir, 'across');
});

test('select keeps the direction if the cell has it, otherwise switches', () => {
  const g = newGame();
  g.select(0, 2);
  assert.deepEqual(g.cursor, { row: 0, col: 2, dir: 'across' });
  g.select(2, 3);
  assert.deepEqual(g.cursor, { row: 2, col: 3, dir: 'down' });
  g.select(2, 0);
  assert.equal(g.cursor.dir, 'down');
});

test('select on a block is a no-op', () => {
  const g = newGame();
  g.select(1, 1);
  assert.deepEqual(g.cursor, { row: 0, col: 0, dir: 'across' });
});

test('erase clears current then steps back', () => {
  const g = newGame();
  typeAll(g, 'שלו'); // cursor now on (0,3), empty
  g.erase();
  assert.deepEqual(g.cursor, { row: 0, col: 2, dir: 'across' });
  assert.equal(g.fills[0][2], '');
  g.erase();
  assert.deepEqual(g.cursor, { row: 0, col: 1, dir: 'across' });
  assert.equal(g.fills[0][1], '');
  g.type('ל');
  g.select(0, 1);
  g.erase(); // current cell has a letter: clear it, stay
  assert.deepEqual(g.cursor, { row: 0, col: 1, dir: 'across' });
  assert.equal(g.fills[0][1], '');
});

test('wrongCells reports only filled mismatches', () => {
  const g = newGame();
  typeAll(g, 'שכו'); // כ is wrong at (0,1)
  assert.deepEqual(g.wrongCells(), [[0, 1]]);
  assert.deepEqual(g.wrongCells(0), [[0, 1]]);
  assert.deepEqual(g.wrongCells(2), []);
});

test('revealLetter fills the cursor cell and counts one reveal', () => {
  const g = newGame();
  assert.equal(g.revealLetter(), true);
  assert.equal(g.fills[0][0], 'ש');
  assert.equal(g.reveals, 1);
  assert.ok(g.revealed.has('0,0'));
});

test('revealLetter on a correct cell is free', () => {
  const g = newGame();
  g.type('ש');
  g.select(0, 0); // back on (0,0)
  assert.equal(g.revealLetter(), false);
  assert.equal(g.reveals, 0);
  assert.equal(g.revealed.size, 0);
});

test('revealWord on a solved entry is free', () => {
  const g = newGame();
  typeAll(g, 'שלום');
  assert.equal(g.revealWord(), 0);
  assert.equal(g.reveals, 0);
});

test('revealWord counts 3 reveals and locks revealed cells', () => {
  const g = newGame();
  g.type('ש'); g.type('כ'); // one right, one wrong
  assert.equal(g.revealWord(), 3);
  assert.equal(g.reveals, 3);
  assert.equal(g.fills[0].join(''), 'שלומ');
  assert.ok(g.revealed.has('0,1') && !g.revealed.has('0,0'));
  g.select(0, 1);
  g.type('א');
  assert.equal(g.fills[0][1], 'ל');
  g.select(0, 1);
  g.erase();
  assert.equal(g.fills[0][1], 'ל');
});

test('goToEntry moves to the first empty cell with the entry direction', () => {
  const g = newGame();
  g.type('ש');
  g.goToEntry(1);
  assert.deepEqual(g.cursor, { row: 1, col: 0, dir: 'down' });
});

test('nextEntry wraps around', () => {
  const g = newGame();
  g.nextEntry(-1);
  assert.equal(g.currentEntry().index, 2);
  g.nextEntry(1);
  assert.equal(g.currentEntry().index, 0);
});

test('isComplete only when every cell is correct', () => {
  const g = newGame();
  typeAll(g, 'שלומ');
  g.goToEntry(1); typeAll(g, 'לכ'); // wrong last letter
  g.goToEntry(2); typeAll(g, 'ות');
  assert.equal(g.isComplete(), false);
  g.select(2, 0); g.type('מ');
  assert.equal(g.isComplete(), true);
});

test('round-trips through toJSON', () => {
  const g = newGame();
  typeAll(g, 'שכ');
  g.revealWord();
  g.elapsedMs = 1234;
  g.select(2, 3);
  const json = JSON.parse(JSON.stringify(g.toJSON()));
  assert.deepEqual(json.fills, ['שלומ', '.##.', '.##.']);
  const h = newGame(json);
  assert.deepEqual(h.fills, g.fills);
  assert.equal(h.reveals, 3);
  assert.equal(h.elapsedMs, 1234);
  assert.deepEqual(h.cursor, g.cursor);
  assert.deepEqual([...h.revealed].sort(), [...g.revealed].sort());
});

test('ignores saved state that does not match the puzzle', () => {
  const fresh = (saved) => {
    const g = newGame(saved);
    assert.equal(g.fills[0][0], '');
    assert.equal(g.reveals, 0);
  };
  fresh({ fills: ['שלומ', '.##.'], revealed: [], reveals: 2, elapsedMs: 0, cursor: { row: 0, col: 0, dir: 'across' } });
  fresh({ fills: ['שלומ', '.#..', '.##.'], revealed: [], reveals: 2, elapsedMs: 0, cursor: { row: 0, col: 0, dir: 'across' } });
  fresh({ fills: ['שלוx', '.##.', '.##.'], revealed: [], reveals: 2, elapsedMs: 0, cursor: { row: 0, col: 0, dir: 'across' } });
  fresh({ nonsense: true });
});

test('a saved cursor on a block falls back to the start', () => {
  const g = newGame({ fills: ['....', '.##.', '.##.'], revealed: [], reveals: 0, elapsedMs: 0, cursor: { row: 1, col: 1, dir: 'down' } });
  assert.deepEqual(g.cursor, { row: 0, col: 0, dir: 'across' });
});

test('a saved game from a regenerated puzzle with the same shape starts fresh', () => {
  const g = newGame();
  g.type('ש');
  g.revealWord();
  const saved = JSON.parse(JSON.stringify(g.toJSON()));
  const other = shalomRaw();
  other.rows = ['שלמה', 'ל##ו', 'מ##ת'];
  other.entries[0].answer = 'שלמה';
  other.entries[0].he = 'שלמה';
  other.entries[2].answer = 'הות';
  const h = new Game(loadPuzzle(other), saved);
  assert.equal(h.fills[0][0], '');
  assert.equal(h.revealed.size, 0);
  assert.equal(h.reveals, 0);
  assert.equal(new Game(loadPuzzle(shalomRaw()), saved).reveals, 3, 'same puzzle still restores');
});

test('solvedCells contains only cells of fully solved entries', () => {
  const g = newGame();
  g.type('ש'); g.type('ל');
  assert.equal(g.solvedCells().size, 0, 'correct letters in an unsolved entry are not revealed as solved');
  g.type('ו'); g.type('מ');
  assert.deepEqual([...g.solvedCells()].sort(), ['0,0', '0,1', '0,2', '0,3']);
});
