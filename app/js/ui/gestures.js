// Pointer gestures on the board viewport: tap, one-finger pan, two-finger pinch, wheel zoom.
import { clampTransform, zoomAt } from './viewport.js';

const TAP_SLOP = 8;

export function attachGestures(el, { getTransform, setTransform, dims, onTap }) {
  const pts = new Map();
  let mode = null; // 'tap' | 'pan' | 'pinch'
  let start = null, last = null, lastDist = 0, lastMid = null;

  const local = (p) => {
    const r = el.getBoundingClientRect();
    return { x: p.x - r.left, y: p.y - r.top };
  };
  const pair = () => [...pts.values()].slice(0, 2);
  const dist = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function down(e) {
    if (e.target.closest?.('button')) return; // overlay buttons (zoom) handle their own clicks
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      mode = 'tap';
      start = last = { x: e.clientX, y: e.clientY };
    } else if (pts.size === 2) {
      mode = 'pinch';
      lastDist = dist(pair());
      lastMid = mid(pair());
    }
  }

  function move(e) {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'pinch' && pts.size >= 2) {
      const p = pair(), d = dist(p), m = mid(p);
      if (lastDist > 0) {
        const lm = local(m);
        let t = zoomAt(getTransform(), d / lastDist, lm.x, lm.y, dims());
        t = clampTransform({ ...t, x: t.x + (m.x - lastMid.x), y: t.y + (m.y - lastMid.y) }, dims());
        setTransform(t);
      }
      lastDist = d;
      lastMid = m;
      return;
    }
    if (mode === 'tap' && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP) mode = 'pan';
    if (mode === 'pan') {
      const t = getTransform();
      setTransform(clampTransform({ ...t, x: t.x + e.clientX - last.x, y: t.y + e.clientY - last.y }, dims()));
      last = { x: e.clientX, y: e.clientY };
    }
  }

  function up(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (mode === 'tap' && e.type === 'pointerup') onTap(document.elementFromPoint(e.clientX, e.clientY));
    if (pts.size === 1 && mode === 'pinch') {
      mode = 'pan';
      last = [...pts.values()][0];
    } else if (pts.size === 0) {
      mode = null;
    }
  }

  function wheel(e) {
    e.preventDefault();
    const p = local({ x: e.clientX, y: e.clientY });
    setTransform(zoomAt(getTransform(), Math.exp(-e.deltaY * 0.0015), p.x, p.y, dims()));
  }

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: false });
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    el.removeEventListener('wheel', wheel);
  };
}
