// Block templates: 180°-symmetric, connected, every white cell in a run of length ≥ 2.
// A template is boolean[][] where true = block.

/** White runs of length ≥ 2, as lists of [r, c]. */
export function runs(t) {
  const n = t.length, out = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n;) {
      if (t[r][c]) { c++; continue; }
      const run = [];
      while (c < n && !t[r][c]) run.push([r, c++]);
      if (run.length >= 2) out.push(run);
    }
  }
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n;) {
      if (t[r][c]) { r++; continue; }
      const run = [];
      while (r < n && !t[r][c]) run.push([r++, c]);
      if (run.length >= 2) out.push(run);
    }
  }
  return out;
}

export function isSymmetric(t) {
  const h = t.length;
  return t.every((row, r) => row.every((b, c) => b === t[h - 1 - r][row.length - 1 - c]));
}

export function isConnected(t) {
  const whites = [];
  t.forEach((row, r) => row.forEach((b, c) => { if (!b) whites.push([r, c]); }));
  if (whites.length === 0) return false;
  const seen = new Set([`${whites[0][0]},${whites[0][1]}`]);
  const stack = [whites[0]];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (t[nr]?.[nc] === false && !seen.has(`${nr},${nc}`)) {
        seen.add(`${nr},${nc}`);
        stack.push([nr, nc]);
      }
    }
  }
  return seen.size === whites.length;
}

export function makeTemplate(size, rng, { keep, maxLen }) {
  const t = Array.from({ length: size }, () => Array(size).fill(false));
  const setBlock = (r, c) => { t[r][c] = true; t[size - 1 - r][size - 1 - c] = true; };
  for (let r = 1; r < size; r += 2) {
    for (let c = 1; c < size; c += 2) {
      const mr = size - 1 - r, mc = size - 1 - c;
      if (r * size + c > mr * size + mc) continue; // decide each mirrored pair once
      if (rng() < keep) setBlock(r, c);
    }
  }
  for (let guard = 0; guard < 400; guard++) {
    const long = runs(t).filter((run) => run.length > maxLen);
    if (long.length === 0) break;
    const run = long[Math.floor(rng() * long.length)];
    const i = 2 + Math.floor(rng() * (run.length - 4));
    setBlock(...run[i]);
  }
  const rs = runs(t);
  if (rs.some((run) => run.length > maxLen)) return null;
  const covered = new Set(rs.flat().map(([r, c]) => `${r},${c}`));
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (!t[r][c] && !covered.has(`${r},${c}`)) return null;
  }
  if (!isConnected(t)) return null;
  return t;
}
