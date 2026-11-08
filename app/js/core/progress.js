// Player progress: coins, stage results, saved games, learned words, settings.
import { STARTING_COINS, starsFor, coinsFor } from './scoring.js';

export const UNLOCK_THRESHOLD = 40;

export function defaultProgress() {
  return {
    version: 1,
    coins: STARTING_COINS,
    stages: {},
    inProgress: {},
    words: {},
    settings: { sound: true, vibrate: true, autoCheck: false, keyboard: 'phone' }, // keyboard: 'phone' | 'game'
    lastPlayed: null,
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function migrate(raw) {
  const d = defaultProgress();
  if (!isObj(raw) || raw.version !== 1) return d;
  return {
    version: 1,
    coins: Number.isFinite(raw.coins) ? raw.coins : d.coins,
    stages: isObj(raw.stages) ? raw.stages : d.stages,
    inProgress: isObj(raw.inProgress) ? raw.inProgress : d.inProgress,
    words: isObj(raw.words) ? raw.words : d.words,
    settings: { ...d.settings, ...(isObj(raw.settings) ? raw.settings : {}) },
    lastPlayed: typeof raw.lastPlayed === 'string' ? raw.lastPlayed : null,
  };
}

export function recordCompletion(p, puzzle, { reveals, elapsedMs, now }) {
  const stars = starsFor(reveals);
  const old = p.stages[puzzle.id];
  let coinsEarned;
  if (!old) {
    coinsEarned = coinsFor(stars);
    p.stages[puzzle.id] = { stars, bestMs: elapsedMs };
  } else {
    coinsEarned = stars > old.stars ? 10 * (stars - old.stars) : 0;
    p.stages[puzzle.id] = { stars: Math.max(stars, old.stars), bestMs: Math.min(elapsedMs, old.bestMs) };
  }
  p.coins += coinsEarned;
  delete p.inProgress[puzzle.id];
  const newWords = [];
  for (const e of puzzle.entries) {
    if (p.words[e.vocabId]) continue;
    p.words[e.vocabId] = { en: e.en, he: e.he, level: e.level, firstMs: now };
    newWords.push(e);
  }
  return { stars, coinsEarned, newWords };
}

export function spendCoins(p, amount) {
  if (p.coins < amount) return false;
  p.coins -= amount;
  return true;
}

export function completedCount(p, puzzleIds) {
  return puzzleIds.filter((id) => p.stages[id]).length;
}

export function isStageUnlocked(p, puzzleIds, id) {
  const i = puzzleIds.indexOf(id);
  if (i < 0) return false;
  return i === 0 || Boolean(p.stages[puzzleIds[i - 1]]);
}

export function isLevelUnlocked(p, levels, levelId, puzzleIdsByLevel) {
  const i = levels.findIndex((l) => l.id === levelId);
  if (i < 0 || !levels[i].available) return false;
  if (i === 0) return true;
  const prev = levels[i - 1].id;
  return completedCount(p, puzzleIdsByLevel[prev] ?? []) >= UNLOCK_THRESHOLD;
}
