// Shared fixtures for generator tests.
export const v = (id, he, en = id, level = 'A1') => ({ id, en, he, level, topic: 'basics', pos: 'noun', note: null });

/** A 3×3 ring: across כלב (1), down כוס (1), down בשר (2), across סיר (3). */
export const RING_VOCAB = [v('v1', 'כלב', 'dog'), v('v2', 'כוס', 'cup'), v('v3', 'בשר', 'meat'), v('v4', 'סיר', 'pot')];

const ent = (num, dir, row, col, answer, vocabId, he) => ({ num, dir, row, col, answer, lengths: [answer.length], vocabId, en: vocabId, he, note: null, level: 'A1' });

export function ringPuzzle(rows = ['כלב', 'ו#ש', 'סיר']) {
  return {
    id: 'G-1', stage: 1, world: 1, size: rows[0].length, rows,
    entries: [
      ent(1, 'across', 0, 0, 'כלב', 'v1', 'כלב'),
      ent(1, 'down', 0, 0, 'כוס', 'v2', 'כוס'),
      ent(2, 'down', 0, 2, 'בשר', 'v3', 'בשר'),
      ent(3, 'across', 2, 0, 'סיר', 'v4', 'סיר'),
    ],
  };
}
