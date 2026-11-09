// Small hand-made puzzles shared by core tests.
const entry = (o) => ({ vocabId: `v-${o.answer}`, en: o.answer, note: null, level: 'A1', lengths: [o.answer.length], he: o.answer, ...o });

/** 3×4 grid: across שלום (1), down שלם (1), down מות (2). */
export function shalomRaw() {
  return {
    id: 'F-1', stage: 1, world: 1, size: 4,
    rows: ['שלומ', 'ל##ו', 'מ##ת'],
    entries: [
      entry({ num: 1, dir: 'across', row: 0, col: 0, answer: 'שלומ', he: 'שלום' }),
      entry({ num: 1, dir: 'down', row: 0, col: 0, answer: 'שלמ', he: 'שלם' }),
      entry({ num: 2, dir: 'down', row: 0, col: 3, answer: 'מות', he: 'מות' }),
    ],
  };
}
