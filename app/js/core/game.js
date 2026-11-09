// Mutable game state for one puzzle: fills, cursor, hints.
import { normalizeLetter, BASE_LETTERS } from './hebrew.js';
import { REVEAL_WEIGHT } from './scoring.js';

const key = (r, c) => `${r},${c}`;

/** Short fingerprint of a puzzle's answers, so saves from an older version of the puzzle are ignored. */
export function puzzleFingerprint(puzzle) {
  const text = `${puzzle.id}|${puzzle.cells.map((row) => row.map((c) => (c.block ? '#' : c.answer)).join('')).join('/')}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export class Game {
  constructor(puzzle, saved = null) {
    this.puzzle = puzzle;
    this.fills = puzzle.cells.map((row) => row.map(() => ''));
    this.revealed = new Set();
    this.reveals = 0;
    this.elapsedMs = 0;
    const [r0, c0] = puzzle.entries[0].cells[0];
    this.cursor = { row: r0, col: c0, dir: puzzle.entries[0].dir };
    if (saved && this.#savedMatches(saved)) this.#restore(saved);
  }

  #cell(r, c) {
    return this.puzzle.cells[r]?.[c];
  }

  #savedMatches(s) {
    const { cells } = this.puzzle;
    if (s.key !== puzzleFingerprint(this.puzzle)) return false;
    if (!Array.isArray(s.fills) || s.fills.length !== cells.length) return false;
    return s.fills.every((row, r) => typeof row === 'string' && row.length === cells[r].length
      && [...row].every((ch, c) => (cells[r][c].block ? ch === '#' : ch === '.' || BASE_LETTERS.includes(ch))));
  }

  #restore(s) {
    this.fills = s.fills.map((row) => [...row].map((ch) => (ch === '.' || ch === '#' ? '' : ch)));
    this.revealed = new Set((s.revealed ?? []).filter((k) => {
      const [r, c] = k.split(',').map(Number);
      return this.#cell(r, c) && !this.#cell(r, c).block;
    }));
    this.reveals = Number.isFinite(s.reveals) ? s.reveals : 0;
    this.elapsedMs = Number.isFinite(s.elapsedMs) ? s.elapsedMs : 0;
    const cur = s.cursor;
    const cell = cur && this.#cell(cur.row, cur.col);
    if (cell && !cell.block && cell[cur.dir] !== null && cell[cur.dir] !== undefined) {
      this.cursor = { row: cur.row, col: cur.col, dir: cur.dir };
    }
  }

  currentEntry() {
    const cell = this.#cell(this.cursor.row, this.cursor.col);
    return this.puzzle.entries[cell[this.cursor.dir]];
  }

  select(row, col) {
    const cell = this.#cell(row, col);
    if (!cell || cell.block) return;
    const { dir } = this.cursor;
    const other = dir === 'across' ? 'down' : 'across';
    if (row === this.cursor.row && col === this.cursor.col) {
      if (cell[other] !== null) this.cursor.dir = other;
      return;
    }
    this.cursor = { row, col, dir: cell[dir] !== null ? dir : other };
  }

  #posInEntry() {
    const e = this.currentEntry();
    return e.cells.findIndex(([r, c]) => r === this.cursor.row && c === this.cursor.col);
  }

  #moveWithin(delta) {
    const e = this.currentEntry();
    const i = this.#posInEntry() + delta;
    if (i < 0 || i >= e.cells.length) return false;
    [this.cursor.row, this.cursor.col] = e.cells[i];
    return true;
  }

  type(letter) {
    const ch = normalizeLetter(letter);
    if (!ch) return;
    const { row, col } = this.cursor;
    if (!this.revealed.has(key(row, col))) this.fills[row][col] = ch;
    this.#moveWithin(1);
  }

  erase() {
    const { row, col } = this.cursor;
    if (this.fills[row][col] && !this.revealed.has(key(row, col))) {
      this.fills[row][col] = '';
      return;
    }
    if (this.#moveWithin(-1)) {
      const { row: r, col: c } = this.cursor;
      if (!this.revealed.has(key(r, c))) this.fills[r][c] = '';
    }
  }

  /** Clears one cell (unless revealed) and puts the cursor on it, keeping the direction when possible. */
  clearAt(row, col) {
    const cell = this.#cell(row, col);
    if (!cell || cell.block) return;
    if (!this.revealed.has(key(row, col))) this.fills[row][col] = '';
    const dir = cell[this.cursor.dir] !== null ? this.cursor.dir : (this.cursor.dir === 'across' ? 'down' : 'across');
    this.cursor = { row, col, dir };
  }

  goToEntry(index) {
    const e = this.puzzle.entries[index];
    if (!e) return;
    const target = e.cells.find(([r, c]) => !this.fills[r][c]) ?? e.cells[0];
    this.cursor = { row: target[0], col: target[1], dir: e.dir };
  }

  nextEntry(delta) {
    const n = this.puzzle.entries.length;
    this.goToEntry((this.currentEntry().index + delta + n) % n);
  }

  #isCorrect(r, c) {
    return this.fills[r][c] === this.puzzle.cells[r][c].answer;
  }

  wrongCells(entryIndex) {
    const cells = entryIndex === undefined
      ? this.puzzle.cells.flatMap((row, r) => row.map((cell, c) => [r, c]).filter(([, c]) => !row[c].block))
      : this.puzzle.entries[entryIndex].cells;
    return cells.filter(([r, c]) => this.fills[r][c] && !this.#isCorrect(r, c));
  }

  revealLetter() {
    const { row, col } = this.cursor;
    if (this.#isCorrect(row, col)) return false;
    this.fills[row][col] = this.puzzle.cells[row][col].answer;
    this.revealed.add(key(row, col));
    this.reveals += REVEAL_WEIGHT.letter;
    return true;
  }

  revealWord() {
    let changed = 0;
    for (const [r, c] of this.currentEntry().cells) {
      if (this.#isCorrect(r, c)) continue;
      this.fills[r][c] = this.puzzle.cells[r][c].answer;
      this.revealed.add(key(r, c));
      changed++;
    }
    if (changed > 0) this.reveals += REVEAL_WEIGHT.word;
    return changed;
  }

  isEntrySolved(i) {
    return this.puzzle.entries[i].cells.every(([r, c]) => this.#isCorrect(r, c));
  }

  /** Keys of cells that belong to a fully solved entry. */
  solvedCells() {
    const out = new Set();
    this.puzzle.entries.forEach((e, i) => {
      if (this.isEntrySolved(i)) e.cells.forEach(([r, c]) => out.add(key(r, c)));
    });
    return out;
  }

  isComplete() {
    return this.puzzle.cells.every((row, r) => row.every((cell, c) => cell.block || this.#isCorrect(r, c)));
  }

  toJSON() {
    return {
      key: puzzleFingerprint(this.puzzle),
      fills: this.fills.map((row, r) => row.map((ch, c) => (this.puzzle.cells[r][c].block ? '#' : ch || '.')).join('')),
      revealed: [...this.revealed],
      reveals: this.reveals,
      elapsedMs: this.elapsedMs,
      cursor: { ...this.cursor },
    };
  }
}
