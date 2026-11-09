#!/usr/bin/env node
// Generates a level's puzzles: node tools/generator/generate.js --level A1 --seed 1 [--count 50]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeSlots, slotCells } from '../../app/js/core/grid.js';
import { wordLengths, answerLetters } from '../../app/js/core/hebrew.js';
import { mulberry32 } from './rng.js';
import { buildLexicon } from './lexicon.js';
import { makeTemplate, runs } from './template.js';
import { fillTemplate } from './fill.js';
import { validatePuzzle } from './validate.js';

export const SIZE_OPTIONS = {
  // maxShort: most two-letter answers per board (they are few and would repeat across a level).
  11: { keep: 0.7, maxLen: 7, minWords: 40, maxShort: 10 },
  13: { keep: 0.7, maxLen: 6, minWords: 55, maxShort: 16 },
  15: { keep: 0.85, maxLen: 6, minWords: 52, maxShort: 20, fallbackKeep: 1.0 },
};

// Per-level tuning on top of the board size. window = how many easier levels the puzzle may borrow words from.
// Upper levels have few short words of their own, so they borrow from two levels below
// (the level's own words still come first and make up at least 60% of every board).
const LEVEL_TUNING = {
  A1: { window: 0 },
  A2: { window: 1 },
  B1: { window: 1 },
  B2: { window: 2, keep: 0.85, minWords: 52 },
  C1: { window: 2 },
  C2: { window: 2 },
};

export function optionsFor(level, size) {
  return { window: 1, ...SIZE_OPTIONS[size], ...LEVEL_TUNING[level] };
}
// Per level: keeps words from repeating across puzzles. Two-letter answers are few (A1 has 54), so they get more room.
export const MAX_ANSWER_USES = 8;
export const MAX_SHORT_USES = 12;
export const MAX_EVER_USES = 20; // hard ceiling per level, even when the cap is relaxed (tests check the shipped files)
const FALLBACK_KEEP = 0.85;
const CAPPED_TEMPLATES = 150; // per stage: tries with the reuse cap before relaxing it (fills are slow on 15×15)
const MAX_TEMPLATES = 2000; // valid templates tried per ladder step
const MAX_RAW_TEMPLATES = 300000; // safety cap on template attempts (invalid ones are cheap)
const NODE_BUDGET = 4000;
const STAGES_PER_WORLD = 10;

const ROOT = new URL('../../', import.meta.url);
const readJson = (p) => JSON.parse(readFileSync(new URL(p, ROOT), 'utf8'));

function parseArgs(argv) {
  const args = { level: 'A1', seed: 1, count: 50 };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, '');
    args[k] = k === 'level' ? argv[i + 1] : Number(argv[i + 1]);
  }
  return args;
}

/** Turn filled rows into stored entries, choosing a vocabulary entry for each answer. */
function buildEntries(rows, lexicon, ctx) {
  return computeSlots(rows).map((slot) => {
    const answer = slotCells(slot).map(([r, c]) => rows[r][c]).join('');
    const choices = lexicon.entriesFor(answer).map((e) => ({
      e,
      rank: (e.level === ctx.level ? 4 : 0) + (ctx.topics.has(e.topic) ? 2 : 0)
        - (ctx.vocabUse.get(e.id) ?? 0) + ctx.rng() * 0.1,
    }));
    choices.sort((a, b) => b.rank - a.rank);
    const v = choices[0].e;
    return {
      num: slot.num, dir: slot.dir, row: slot.row, col: slot.col, answer,
      lengths: wordLengths(v.he), vocabId: v.id, en: v.en, he: v.he, note: v.note, level: v.level,
    };
  });
}

/**
 * Which vocabulary entries a level's puzzles may use: the level itself and `window` easier levels,
 * plus two-letter answers from any easier level (upper levels have very few short words of their own,
 * and without them the same few short answers fill every board).
 */
export function lexiconFilter(level, order, window) {
  const top = order.indexOf(level);
  const lowest = Math.max(0, top - window);
  return (e) => {
    const i = order.indexOf(e.level);
    if (i < 0 || i > top) return false;
    return i >= lowest || answerLetters(e.he).length === 2;
  };
}

export function generateLevel({
  level, seed, count, quiet = false, maxUses = MAX_ANSWER_USES, maxShortUses = MAX_SHORT_USES,
}) {
  const capFor = (answer) => (answer.length === 2 ? maxShortUses : maxUses);
  const levels = readJson('app/data/levels.json');
  const order = levels.map((l) => l.id);
  const meta = levels.find((l) => l.id === level);
  if (!meta) throw new Error(`unknown level ${level}`);
  const opts = optionsFor(level, meta.size);
  const vocab = readdirSync(new URL('content/vocab/', ROOT)).flatMap((f) => readJson(`content/vocab/${f}`));
  const vocabById = new Map(vocab.map((e) => [e.id, e]));
  const lexicon = buildLexicon(vocab.filter(lexiconFilter(level, order, opts.window)), level, order);
  const rng = mulberry32(seed);
  const answerUse = new Map();
  const vocabUse = new Map();
  const puzzles = [];
  const stats = { entries: 0, white: 0, fallbacks: [], relaxed: [], templates: 0 };
  const started = Date.now();

  for (let stage = 1; stage <= count; stage++) {
    const world = Math.ceil(stage / STAGES_PER_WORLD);
    const topics = new Set(meta.worlds?.[world - 1]?.topics ?? []);
    const scoreWith = (reuseWeight) => (answer) => {
      const entries = lexicon.entriesFor(answer);
      // Tiers: the level's own words always rank above easier levels' words (≥ 3 vs ≤ 2),
      // even after being used; within a tier, unused words, world topics and phrases come first.
      const own = entries.some((e) => e.level === level);
      const reuse = Math.min(reuseWeight * (answerUse.get(answer) ?? 0), 2);
      return (own ? 5 : 0)
        + (entries.some((e) => topics.has(e.topic)) ? 1 : 0)
        + (entries.some((e) => e.he.includes(' ')) ? 1 : 0)
        - reuse;
    };
    // Ladder, relaxing one thing at a time: the reuse cap → 1.5× the cap with a lighter penalty →
    // the hard ceiling only (still penalized) → a less dense board, ceiling only (last resort).
    const capped = (factor) => (answer) => (answerUse.get(answer) ?? 0) < Math.min(factor * capFor(answer), MAX_EVER_USES);
    const underCeiling = (answer) => (answerUse.get(answer) ?? 0) < MAX_EVER_USES;
    const ladder = [
      { keep: opts.keep, isAllowed: capped(1), score: scoreWith(0.5), tries: CAPPED_TEMPLATES },
      { keep: opts.keep, isAllowed: capped(1.5), score: scoreWith(0.25), tries: MAX_TEMPLATES, relaxed: true },
      { keep: opts.keep, isAllowed: underCeiling, score: scoreWith(0.25), tries: MAX_TEMPLATES, relaxed: true },
      { keep: opts.fallbackKeep ?? FALLBACK_KEEP, isAllowed: underCeiling, score: scoreWith(0), tries: MAX_TEMPLATES, relaxed: true, fallback: true },
    ];
    let puzzle = null;
    const why = {};
    for (const stepOpts of ladder) {
      for (let attempt = 0, raw = 0; attempt < stepOpts.tries && raw < MAX_RAW_TEMPLATES && !puzzle; raw++) {
        const blocks = makeTemplate(meta.size, rng, { keep: stepOpts.keep, maxLen: opts.maxLen });
        const reject = (k) => { why[k] = (why[k] ?? 0) + 1; };
        if (!blocks) { reject('no-template'); continue; }
        attempt++;
        stats.templates++;
        if (runs(blocks).filter((r) => r.length === 2).length > opts.maxShort) { reject('too-many-short'); continue; }
        const rows = fillTemplate(blocks, lexicon, rng, { nodeBudget: NODE_BUDGET, score: stepOpts.score, isAllowed: stepOpts.isAllowed });
        if (!rows) { reject('no-fill'); continue; }
        const candidate = {
          id: `${level}-${String(stage).padStart(2, '0')}`, stage, world, size: meta.size, rows,
          entries: buildEntries(rows, lexicon, { level, topics, vocabUse, rng }),
        };
        const errors = validatePuzzle(candidate, vocabById, { level, minWords: opts.minWords, minWhite: 0.6, minLevelShare: 0.6 });
        if (errors.length === 0) puzzle = candidate;
        for (const e of errors) why[e.split(':')[0]] = (why[e.split(':')[0]] ?? 0) + 1;
      }
      if (puzzle) {
        if (stepOpts.relaxed) stats.relaxed.push(stage);
        if (stepOpts.fallback) stats.fallbacks.push(stage);
        if (stepOpts.relaxed && !quiet) console.warn(`warning: stage ${stage} ${stepOpts.fallback ? 'used the less dense fallback template' : 'relaxed the reuse cap'}`);
        break;
      }
    }
    if (!puzzle) throw new Error(`could not generate stage ${stage} (rejections: ${JSON.stringify(why)})`);
    for (const e of puzzle.entries) {
      answerUse.set(e.answer, (answerUse.get(e.answer) ?? 0) + 1);
      vocabUse.set(e.vocabId, (vocabUse.get(e.vocabId) ?? 0) + 1);
    }
    stats.entries += puzzle.entries.length;
    stats.white += puzzle.rows.join('').replace(/#/g, '').length / (meta.size * meta.size);
    puzzles.push(puzzle);
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const summary = `${level}: ${puzzles.length} puzzles, avg entries ${(stats.entries / puzzles.length).toFixed(1)}, `
    + `avg white ${(100 * stats.white / puzzles.length).toFixed(1)}%, fallbacks ${stats.fallbacks.length}, relaxed cap ${stats.relaxed.length}, `
    + `distinct answers ${answerUse.size}, multi-word uses ${puzzles.flatMap((p) => p.entries).filter((e) => e.lengths.length > 1).length}, `
    + `templates tried ${stats.templates}, ${seconds}s`;
  return { meta, puzzles, summary, relaxedStages: stats.relaxed };
}

/** One puzzle per block, one entry per line: readable diffs. */
export function formatLevelFile(level, puzzles) {
  const p = puzzles.map((pz) => [
    '    {',
    `      "id": ${JSON.stringify(pz.id)}, "stage": ${pz.stage}, "world": ${pz.world}, "size": ${pz.size},`,
    `      "rows": [\n${pz.rows.map((r) => `        ${JSON.stringify(r)}`).join(',\n')}\n      ],`,
    `      "entries": [\n${pz.entries.map((e) => `        ${JSON.stringify(e)}`).join(',\n')}\n      ]`,
    '    }',
  ].join('\n'));
  return `{\n  "level": ${JSON.stringify(level)},\n  "version": 1,\n  "puzzles": [\n${p.join(',\n')}\n  ]\n}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseArgs(process.argv.slice(2));
  const { meta, puzzles, summary } = generateLevel(args);
  writeFileSync(new URL(`app/${meta.file}`, ROOT), formatLevelFile(meta.id, puzzles));
  console.log(summary);
}
