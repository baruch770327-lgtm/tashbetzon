// Shared UI helpers: labels, stage lookup, tab bar.
import { h } from './dom.js';
import { completedCount, isStageUnlocked, isLevelUnlocked } from '../core/progress.js';

export const TOPIC_LABELS = {
  basics: 'מילים בסיסיות', numbers: 'מספרים', colors: 'צבעים', family: 'משפחה',
  home: 'בית', objects: 'חפצים', time: 'זמן', food: 'אוכל', animals: 'בעלי חיים',
  nature: 'טבע', body: 'גוף', clothes: 'בגדים', city: 'עיר', verbs: 'פעלים', adjectives: 'תארים',
};

export const puzzleIds = (ctx, levelId) => (ctx.puzzles[levelId] ?? []).map((p) => p.id);

export function findPuzzle(ctx, id) {
  for (const list of Object.values(ctx.puzzles)) {
    const p = list.find((x) => x.id === id);
    if (p) return p;
  }
  return null;
}

export const levelOf = (ctx, id) => ctx.levels.find((l) => id.startsWith(`${l.id}-`));

export function idsByLevel(ctx) {
  return Object.fromEntries(ctx.levels.map((l) => [l.id, puzzleIds(ctx, l.id)]));
}

export const levelUnlocked = (ctx, levelId) => isLevelUnlocked(ctx.progress, ctx.levels, levelId, idsByLevel(ctx));

export function stageUnlocked(ctx, id) {
  const level = levelOf(ctx, id);
  return Boolean(level) && levelUnlocked(ctx, level.id) && isStageUnlocked(ctx.progress, puzzleIds(ctx, level.id), id);
}

/** The stage "play now" opens: the last one in progress, else the first unfinished unlocked one. */
export function nextStageId(ctx) {
  const last = ctx.progress.lastPlayed;
  if (last && ctx.progress.inProgress[last] && findPuzzle(ctx, last)) return last;
  for (const level of ctx.levels) {
    if (!level.available || !levelUnlocked(ctx, level.id)) continue;
    const next = puzzleIds(ctx, level.id).find((id) => !ctx.progress.stages[id]);
    if (next) return next;
  }
  const lastAvailable = [...ctx.levels].reverse().find((l) => puzzleIds(ctx, l.id).length);
  return lastAvailable ? puzzleIds(ctx, lastAvailable.id).at(-1) : null;
}

export const levelDone = (ctx, levelId) => completedCount(ctx.progress, puzzleIds(ctx, levelId));

export function totalStars(ctx) {
  return Object.values(ctx.progress.stages).reduce((sum, s) => sum + s.stars, 0);
}

export const coinPill = (ctx) => h('div', { class: 'pill', title: 'מטבעות' }, '🪙 ', h('b', { 'data-coins': '' }, ctx.progress.coins));

export const starsText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

const TABS = [['home', '🏠', 'בית'], ['map', '🗺️', 'שלבים'], ['words', '📖', 'מילים'], ['settings', '⚙️', 'הגדרות']];

export function tabBar(ctx, active) {
  return h('nav', { class: 'tabbar' }, TABS.map(([name, icon, label]) => h('button', {
    class: `tab${name === active ? ' on' : ''}`,
    'aria-current': name === active ? 'page' : null,
    dataset: { tab: name },
    onClick: () => { if (name !== active) ctx.router.tab(name); },
  }, h('span', { class: 'tab-icon' }, icon), label)));
}
