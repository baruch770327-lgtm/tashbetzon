import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampTransform, zoomAt, ensureVisible, MIN_SCALE, MAX_SCALE } from '../../app/js/ui/viewport.js';

const d = { viewW: 350, viewH: 380, contentW: 600, contentH: 600 };
const toContent = (t, px, py) => [(px - t.x) / t.scale, (py - t.y) / t.scale];

test('scale is clamped to [1, 3]', () => {
  assert.equal(MIN_SCALE, 1);
  assert.equal(MAX_SCALE, 3);
  assert.equal(clampTransform({ scale: 5, x: 0, y: 0 }, d).scale, 3);
  assert.equal(clampTransform({ scale: 0.2, x: 0, y: 0 }, d).scale, 1);
});

test('content smaller than the view is centered', () => {
  const small = { viewW: 350, viewH: 380, contentW: 300, contentH: 300 };
  const t = clampTransform({ scale: 1, x: -80, y: 400 }, small);
  assert.equal(t.x, 25);
  assert.equal(t.y, 40);
});

test('content larger than the view cannot leave a gap at the edges', () => {
  const t = clampTransform({ scale: 1, x: 50, y: -1000 }, d);
  assert.equal(t.x, 0);
  assert.equal(t.y, 380 - 600);
});

test('zoomAt keeps the point under the fingers fixed', () => {
  const t0 = clampTransform({ scale: 1.5, x: -100, y: -120 }, d);
  const before = toContent(t0, 175, 190);
  const t1 = zoomAt(t0, 1.4, 175, 190, d);
  const after = toContent(t1, 175, 190);
  assert.ok(Math.abs(before[0] - after[0]) < 1e-9 && Math.abs(before[1] - after[1]) < 1e-9);
  assert.ok(Math.abs(t1.scale - 2.1) < 1e-9);
});

test('ensureVisible leaves a visible rect alone', () => {
  const t = clampTransform({ scale: 2, x: -300, y: -300 }, d);
  const rect = { x: 200, y: 200, w: 40, h: 20 };
  const u = ensureVisible(t, rect, d);
  assert.equal(u.x, t.x);
  assert.equal(u.y, t.y);
});

test('ensureVisible pans a rect at the far edge into view with a margin', () => {
  const t = clampTransform({ scale: 2, x: -800, y: -800 }, d);
  const rect = { x: 0, y: 0, w: 60, h: 30 };
  const u = ensureVisible(t, rect, d);
  assert.ok(u.x + rect.x * u.scale >= 0, 'left edge visible');
  assert.ok(u.y + rect.y * u.scale >= 0, 'top edge visible');
  const far = { x: 560, y: 560, w: 40, h: 40 };
  const v = ensureVisible(clampTransform({ scale: 2, x: 0, y: 0 }, d), far, d);
  // At the content edge clamping wins over the margin: the rect is fully visible, flush with the edge.
  assert.ok(v.x + (far.x + far.w) * v.scale <= d.viewW + 1e-9);
  assert.ok(v.y + (far.y + far.h) * v.scale <= d.viewH + 1e-9);
  const mid = { x: 400, y: 400, w: 40, h: 20 };
  const m = ensureVisible(clampTransform({ scale: 2, x: 0, y: 0 }, d), mid, d);
  assert.ok(m.x + (mid.x + mid.w) * m.scale <= d.viewW - 12 + 1e-9, 'margin kept away from edges');
});
