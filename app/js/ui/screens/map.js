// Level map: level pills, world banners, snake path of stage nodes.
import { h } from '../dom.js';
import {
  TOPIC_LABELS, puzzleIds, levelUnlocked, stageUnlocked, nextStageId, totalStars, starsText, tabBar, levelOf,
} from '../common.js';

const WORLD_COLORS = ['green', 'blue', 'violet', 'orange', 'teal'];
const SNAKE = [0, 70, 105, 70, 0, -70, -105, -70, 0, 70];

export function render(ctx, params) {
  const fallback = levelOf(ctx, nextStageId(ctx) ?? '')?.id ?? ctx.levels[0].id;
  const levelId = params.level ?? fallback;
  const level = ctx.levels.find((l) => l.id === levelId);
  const ids = puzzleIds(ctx, levelId);
  const maxStars = ctx.levels.reduce((sum, l) => sum + puzzleIds(ctx, l.id).length * 3, 0);

  const pills = h('div', { class: 'level-pills', role: 'tablist' }, ctx.levels.map((l) => {
    const open = l.available && levelUnlocked(ctx, l.id);
    return h('button', {
      class: `level-pill${l.id === levelId ? ' on' : ''}${open ? '' : ' dim'}`,
      role: 'tab', 'aria-selected': l.id === levelId ? 'true' : 'false',
      dataset: { level: l.id },
      onClick: () => ctx.router.replace('map', { level: l.id }),
    }, h('b', { dir: 'ltr' }, l.id), ' ', l.name, l.available ? (open ? '' : ' 🔒') : ' · בקרוב');
  }));

  let body;
  if (!level.available) {
    body = h('div', { class: 'card notice' }, h('div', { class: 'big-emoji' }, '🚧'),
      h('div', { class: 'card-title' }, `רמה ${level.id} · ${level.name}`),
      h('p', { class: 'muted' }, 'הרמה הזו תגיע בעדכון הבא.'));
  } else if (!levelUnlocked(ctx, levelId)) {
    body = h('div', { class: 'card notice' }, h('div', { class: 'big-emoji' }, '🔒'),
      h('div', { class: 'card-title' }, `רמה ${level.id} · ${level.name}`),
      h('p', { class: 'muted' }, 'הרמה נפתחת אחרי שמסיימים 40 שלבים ברמה הקודמת.'));
  } else {
    const current = nextStageId(ctx);
    body = (level.worlds ?? []).map((world, wi) => {
      const stageIds = ids.slice(wi * 10, wi * 10 + 10);
      return h('div', { class: 'world-block' },
        h('div', { class: `world ${WORLD_COLORS[wi % WORLD_COLORS.length]}` },
          h('div', { class: 'row between' },
            h('div', {},
              h('div', { class: 'small world-sub' }, `עולם ${world.n} · ${level.id}`),
              h('div', { class: 'world-name' }, world.name)),
            h('div', { class: 'world-emoji', 'aria-hidden': 'true' }, world.emoji)),
          h('div', { class: 'small world-topics' }, world.topics.map((t) => TOPIC_LABELS[t] ?? t).join(' · '))),
        h('div', { class: 'snake' }, stageIds.map((id, i) => {
          const result = ctx.progress.stages[id];
          const open = stageUnlocked(ctx, id);
          const state = result ? 'done' : id === current ? 'cur' : open ? 'open' : 'lock';
          const stage = Number(id.split('-')[1]);
          return h('div', { class: 'node-wrap', style: `transform: translateX(${SNAKE[i]}px)` },
            h('button', {
              class: `node ${state}`, dataset: { stage: id }, disabled: !open,
              'aria-label': `שלב ${stage}${result ? `, ${result.stars} כוכבים` : open ? '' : ', נעול'}`,
              onClick: () => ctx.router.go('game', { id }),
            }, open ? String(stage) : '🔒'),
            result && h('div', { class: 'node-stars', 'aria-hidden': 'true' }, starsText(result.stars)));
        })));
    });
  }

  const el = h('section', { class: 'map' },
    h('header', { class: 'topbar' },
      h('h2', {}, 'מפת השלבים'),
      h('div', { class: 'pill' }, '⭐ ', h('b', { dir: 'ltr' }, `${totalStars(ctx)} / ${maxStars}`))),
    pills,
    h('div', { class: 'map-body' }, body),
    tabBar(ctx, 'map'));
  requestAnimationFrame(() => el.querySelector('.node.cur')?.scrollIntoView({ block: 'center' }));
  return el;
}
