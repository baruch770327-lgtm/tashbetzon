#!/usr/bin/env node
// Copies clue text (en, note) from content/vocab into the generated puzzle files, without touching the grids.
// Use after fixing a clue. If a Hebrew answer changed, the level must be regenerated instead (the grid changes).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { formatLevelFile } from './generate.js';

const ROOT = new URL('../../', import.meta.url);
const readJson = (p) => JSON.parse(readFileSync(new URL(p, ROOT), 'utf8'));
const vocab = new Map(readdirSync(new URL('content/vocab/', ROOT)).flatMap((f) => readJson(`content/vocab/${f}`)).map((e) => [e.id, e]));

let changed = 0;
const answerChanged = [];
for (const level of readJson('app/data/levels.json').filter((l) => l.available)) {
  const file = readJson(`app/${level.file}`);
  for (const p of file.puzzles) {
    for (const e of p.entries) {
      const v = vocab.get(e.vocabId);
      if (!v) continue;
      if (v.he !== e.he) answerChanged.push(`${p.id} ${e.vocabId}`);
      if (v.en !== e.en || v.note !== e.note) { e.en = v.en; e.note = v.note; changed++; }
    }
  }
  writeFileSync(new URL(`app/${level.file}`, ROOT), formatLevelFile(file.level, file.puzzles));
}
console.log(`synced ${changed} clue(s)`);
if (answerChanged.length) {
  console.error(`answers changed — regenerate these levels: ${answerChanged.slice(0, 10).join(', ')}`);
  process.exit(1);
}
