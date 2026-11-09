import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HINT_COST, REVEAL_WEIGHT, STARTING_COINS, starsFor, coinsFor } from '../../app/js/core/scoring.js';

test('hint costs and weights match the spec', () => {
  assert.deepEqual(HINT_COST, { letter: 10, word: 30 });
  assert.deepEqual(REVEAL_WEIGHT, { letter: 1, word: 3 });
  assert.equal(STARTING_COINS, 100);
});

test('stars by reveal count', () => {
  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(1), 2);
  assert.equal(starsFor(3), 2);
  assert.equal(starsFor(4), 1);
  assert.equal(starsFor(40), 1);
});

test('coins are 20 plus 10 per star', () => {
  assert.equal(coinsFor(3), 50);
  assert.equal(coinsFor(1), 30);
});
