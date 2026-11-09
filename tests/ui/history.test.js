import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../../app/js/ui/history.js';

test('history back returns false at root', () => {
  const h = createHistory();
  assert.equal(h.current(), null);
  h.push('home', {});
  assert.equal(h.back(), false);
  assert.equal(h.depth(), 1);
  assert.deepEqual(h.current(), { name: 'home', params: {} });
});

test('back pops to the previous screen', () => {
  const h = createHistory();
  h.push('home', {});
  h.push('map', { level: 'A1' });
  h.push('game', { id: 'A1-01' });
  assert.equal(h.back(), true);
  assert.deepEqual(h.current(), { name: 'map', params: { level: 'A1' } });
  assert.equal(h.depth(), 2);
});

test('replace swaps the top screen', () => {
  const h = createHistory();
  h.push('home', {});
  h.push('game', { id: 'A1-01' });
  h.replace('complete', { id: 'A1-01' });
  assert.equal(h.depth(), 2);
  assert.equal(h.current().name, 'complete');
  assert.equal(h.back(), true);
  assert.equal(h.current().name, 'home');
});
