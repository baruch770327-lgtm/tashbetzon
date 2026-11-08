// Slot numbering from grid rows. Shared by the app and the generator.
// rows: equal-length strings; '#' = block, any other char = white.
// Column 0 is the rightmost column on screen (RTL); across runs toward higher columns.

const isWhite = (rows, r, c) => r >= 0 && r < rows.length && c >= 0 && c < rows[r].length && rows[r][c] !== '#';

function runLength(rows, r, c, dr, dc) {
  let n = 0;
  while (isWhite(rows, r + dr * n, c + dc * n)) n++;
  return n;
}

export function computeSlots(rows) {
  const slots = [];
  let num = 0;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (!isWhite(rows, r, c)) continue;
      const acrossLen = isWhite(rows, r, c - 1) ? 0 : runLength(rows, r, c, 0, 1);
      const downLen = isWhite(rows, r - 1, c) ? 0 : runLength(rows, r, c, 1, 0);
      const startsAcross = acrossLen >= 2;
      const startsDown = downLen >= 2;
      if (!startsAcross && !startsDown) continue;
      num++;
      if (startsAcross) slots.push({ num, dir: 'across', row: r, col: c, len: acrossLen });
      if (startsDown) slots.push({ num, dir: 'down', row: r, col: c, len: downLen });
    }
  }
  return slots;
}

export function slotCells(slot) {
  const cells = [];
  for (let i = 0; i < slot.len; i++) {
    cells.push(slot.dir === 'across' ? [slot.row, slot.col + i] : [slot.row + i, slot.col]);
  }
  return cells;
}
