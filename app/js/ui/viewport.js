// Pure zoom/pan math for the board. T = {scale, x, y}: content point (cx, cy) is drawn at (x + cx·scale, y + cy·scale).
// Dims = {viewW, viewH, contentW, contentH} in unscaled pixels.
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

function clampAxis(offset, content, view) {
  if (content <= view) return (view - content) / 2;
  return Math.min(0, Math.max(view - content, offset));
}

export function clampTransform(t, d) {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale));
  return {
    scale,
    x: clampAxis(t.x, d.contentW * scale, d.viewW),
    y: clampAxis(t.y, d.contentH * scale, d.viewH),
  };
}

export function zoomAt(t, factor, px, py, d) {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
  const cx = (px - t.x) / t.scale;
  const cy = (py - t.y) / t.scale;
  return clampTransform({ scale, x: px - cx * scale, y: py - cy * scale }, d);
}

function panAxis(offset, start, size, scale, view, margin) {
  const s = offset + start * scale;
  const e = s + size * scale;
  if (e - s > view - 2 * margin) return offset + (view / 2 - (s + e) / 2);
  if (s < margin) return offset + (margin - s);
  if (e > view - margin) return offset - (e - (view - margin));
  return offset;
}

export function ensureVisible(t, rect, d, margin = 12) {
  return clampTransform({
    scale: t.scale,
    x: panAxis(t.x, rect.x, rect.w, t.scale, d.viewW, margin),
    y: panAxis(t.y, rect.y, rect.h, t.scale, d.viewH, margin),
  }, d);
}
