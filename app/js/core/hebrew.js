// Hebrew letter helpers. Grids store base letters only; final forms are a display concern.

export const BASE_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת';

const FINAL_TO_BASE = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const BASE_TO_FINAL = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };

/** Final → base, base → itself, anything else → null. */
export function normalizeLetter(ch) {
  if (typeof ch !== 'string' || ch.length !== 1) return null;
  if (FINAL_TO_BASE[ch]) return FINAL_TO_BASE[ch];
  return BASE_LETTERS.includes(ch) ? ch : null;
}

/** Grid letters of an answer: spaces removed, finals normalized. */
export function answerLetters(he) {
  let out = '';
  for (const ch of he) {
    if (ch === ' ') continue;
    out += normalizeLetter(ch) ?? ch;
  }
  return out;
}

/** Letter count of each word, e.g. 'בית ספר' → [3, 3]. */
export function wordLengths(he) {
  return he.split(' ').filter(Boolean).map((w) => w.length);
}

/** The letter to show in a cell. */
export function displayLetter(base, final) {
  if (!base) return '';
  return final && BASE_TO_FINAL[base] ? BASE_TO_FINAL[base] : base;
}

/** Problem codes for a vocabulary answer; [] when valid. */
export function answerProblems(he) {
  const problems = [];
  const add = (p) => { if (!problems.includes(p)) problems.push(p); };
  if (typeof he !== 'string' || !/^[א-ת ]+$/.test(he)) {
    add('chars');
    return problems;
  }
  const words = he.split(' ');
  if (words.some((w) => w === '')) add('chars');
  const real = words.filter(Boolean);
  if (real.length < 1 || real.length > 3) add('words');
  const n = answerLetters(he).length;
  if (n < 2 || n > 9) add('length');
  for (const w of real) {
    for (let i = 0; i < w.length - 1; i++) if (FINAL_TO_BASE[w[i]]) add('final-mid');
    if (BASE_TO_FINAL[w[w.length - 1]]) add('nonfinal-end');
  }
  return problems;
}
