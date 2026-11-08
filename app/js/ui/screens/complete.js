// Stage complete: stars, time, coins, the words of this puzzle.
import { h } from '../dom.js';
import { findPuzzle, levelOf, puzzleIds, stageUnlocked } from '../common.js';

const formatTime = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const SUBTITLE = { 3: 'פתרת בלי שום רמז!', 2: 'כמעט מושלם!', 1: 'הצלחת! בפעם הבאה נסה עם פחות רמזים' };

export function render(ctx, { id, stars, coinsEarned, elapsedMs, newWords }) {
  const raw = findPuzzle(ctx, id);
  const level = levelOf(ctx, id);
  const ids = puzzleIds(ctx, level.id);
  const nextId = ids[ids.indexOf(id) + 1];
  const hasNext = Boolean(nextId) && stageUnlocked(ctx, nextId);
  const entries = [...raw.entries].sort((a, b) => a.en.localeCompare(b.en));

  return h('section', { class: 'complete' },
    h('div', { class: 'hero' },
      h('div', { class: 'stars', 'aria-label': `${stars} כוכבים` },
        [1, 2, 3].map((i) => h('span', { class: `star${i <= stars ? ' on' : ''}`, style: `animation-delay:${i * 0.18}s` }, '★'))),
      h('h1', {}, 'כל הכבוד!'),
      h('p', { class: 'muted' }, `שלב ${raw.stage} הושלם · ${SUBTITLE[stars]}`)),
    h('div', { class: 'stats' },
      h('div', { class: 'card stat' }, h('b', { dir: 'ltr' }, `+${coinsEarned}`), h('span', { class: 'muted small' }, '🪙 מטבעות')),
      h('div', { class: 'card stat' }, h('b', { dir: 'ltr' }, formatTime(elapsedMs)), h('span', { class: 'muted small' }, '⏱️ זמן')),
      h('div', { class: 'card stat' }, h('b', {}, newWords), h('span', { class: 'muted small' }, '📖 מילים חדשות'))),
    hasNext && h('button', { class: 'btn btn-primary', dataset: { action: 'next' }, onClick: () => ctx.router.replace('game', { id: nextId }) }, 'לשלב הבא  ←'),
    h('div', { class: 'grid2' },
      h('button', {
        class: 'btn btn-ghost', dataset: { action: 'replay' },
        onClick: () => { delete ctx.progress.inProgress[id]; ctx.save(); ctx.router.replace('game', { id }); },
      }, '🔁 שחק שוב'),
      h('button', { class: 'btn btn-ghost', dataset: { action: 'map' }, onClick: () => ctx.router.tab('map', { level: level.id }) }, '🗺️ למפה')),
    h('div', { class: 'card word-list' },
      h('div', { class: 'muted small' }, 'המילים של השלב הזה'),
      entries.map((e) => h('button', { class: 'word-row', onClick: () => ctx.speak(e.en) },
        h('span', { class: 'en', dir: 'ltr', lang: 'en' }, e.en),
        h('span', { class: 'he' }, e.he),
        h('span', { 'aria-hidden': 'true' }, '🔊')))));
}
