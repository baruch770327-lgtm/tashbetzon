// Answer index for the filler: by length and by (length, position, letter).
import { answerLetters } from '../../app/js/core/hebrew.js';

export function buildLexicon(entries, level, levelOrder) {
  const max = levelOrder.indexOf(level);
  const byAnswer = new Map();
  for (const e of entries) {
    const li = levelOrder.indexOf(e.level);
    if (li < 0 || li > max) continue;
    const answer = answerLetters(e.he);
    if (!byAnswer.has(answer)) byAnswer.set(answer, []);
    byAnswer.get(answer).push(e);
  }
  const byLength = new Map();
  const index = new Map();
  for (const answer of byAnswer.keys()) {
    const len = answer.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(answer);
    [...answer].forEach((ch, i) => {
      const k = `${len}|${i}|${ch}`;
      if (!index.has(k)) index.set(k, new Set());
      index.get(k).add(answer);
    });
  }
  const EMPTY = new Set();
  return {
    byLength,
    matching(len, pattern) {
      if (pattern.size === 0) return [...(byLength.get(len) ?? [])];
      const sets = [...pattern].map(([i, ch]) => index.get(`${len}|${i}|${ch}`) ?? EMPTY).sort((a, b) => a.size - b.size);
      const [first, ...rest] = sets;
      const out = [];
      for (const w of first) if (rest.every((s) => s.has(w))) out.push(w);
      return out;
    },
    entriesFor(answer) {
      return byAnswer.get(answer) ?? [];
    },
  };
}
