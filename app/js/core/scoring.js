// Hint costs, stars and coin rewards (spec §3.3).
export const HINT_COST = Object.freeze({ letter: 10, word: 30 });
export const REVEAL_WEIGHT = Object.freeze({ letter: 1, word: 3 });
export const STARTING_COINS = 100;

/** 0 reveals → 3 stars, 1–3 → 2, more → 1. */
export function starsFor(reveals) {
  if (reveals <= 0) return 3;
  if (reveals <= 3) return 2;
  return 1;
}

/** Coins for a first completion. */
export function coinsFor(stars) {
  return 20 + 10 * stars;
}
