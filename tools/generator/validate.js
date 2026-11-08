// Validation of a stored puzzle against the spec §4 rules. Returns error strings.
import { loadPuzzle } from '../../app/js/core/puzzle.js';
import { answerLetters, wordLengths } from '../../app/js/core/hebrew.js';
import { isSymmetric, isConnected } from './template.js';

export const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function validatePuzzle(raw, vocabById, {
  level, minWords, minWhite = 0.6, minLevelShare = 0.6, levelOrder = LEVEL_ORDER,
}) {
  const errors = [];
  try {
    loadPuzzle(raw);
  } catch (err) {
    errors.push(`load: ${err.message}`);
  }
  const blocks = raw.rows.map((row) => [...row].map((ch) => ch === '#'));
  const total = blocks.flat().length;
  const white = blocks.flat().filter((b) => !b).length;
  if (white / total < minWhite) errors.push(`white: ${(white / total).toFixed(2)} < ${minWhite}`);
  if (!isSymmetric(blocks)) errors.push('symmetry: blocks are not 180° symmetric');
  if (!isConnected(blocks)) errors.push('connected: white cells are not connected');
  if (raw.entries.length < minWords) errors.push(`words: ${raw.entries.length} < ${minWords}`);

  const seen = new Set();
  let atLevel = 0;
  for (const e of raw.entries) {
    if (seen.has(e.answer)) errors.push(`duplicate: ${e.answer}`);
    seen.add(e.answer);
    const vocab = vocabById.get(e.vocabId);
    if (!vocab) { errors.push(`vocab: unknown id ${e.vocabId}`); continue; }
    if (answerLetters(vocab.he) !== e.answer || vocab.he !== e.he) errors.push(`vocab: ${e.vocabId} does not match ${e.answer}`);
    if (JSON.stringify(wordLengths(vocab.he)) !== JSON.stringify(e.lengths)) errors.push(`vocab: ${e.vocabId} lengths`);
    if (levelOrder.indexOf(vocab.level) > levelOrder.indexOf(level)) errors.push(`level: ${e.vocabId} is ${vocab.level}, above ${level}`);
    if (vocab.level === level) atLevel++;
  }
  const share = raw.entries.length ? atLevel / raw.entries.length : 0;
  if (share < minLevelShare) errors.push(`level-share: ${share.toFixed(2)} < ${minLevelShare}`);
  return errors;
}
