// Home: continue card, play button, shortcuts.
import { h } from '../dom.js';
import { showInstallHint } from '../../platform.js';
import {
  nextStageId, findPuzzle, levelOf, levelDone, puzzleIds, coinPill, totalStars, tabBar,
} from '../common.js';

export function render(ctx) {
  const id = nextStageId(ctx);
  const puzzle = id && findPuzzle(ctx, id);
  const level = id && levelOf(ctx, id);
  const world = level?.worlds?.[puzzle.world - 1];
  const done = level ? levelDone(ctx, level.id) : 0;
  const total = level ? puzzleIds(ctx, level.id).length : 0;
  const resuming = Boolean(id && ctx.progress.inProgress[id]);
  const wordCount = Object.keys(ctx.progress.words).length;

  return h('section', { class: 'home' },
    h('header', { class: 'topbar' }, coinPill(ctx), h('div', { class: 'pill' }, '⭐ ', h('b', {}, totalStars(ctx)))),
    h('div', { class: 'hero' },
      h('div', { class: 'hero-logo', 'aria-hidden': 'true' }, '🧩'),
      h('h1', {}, 'תשבצון'),
      h('p', { class: 'muted' }, 'לומדים אנגלית דרך תשבצים')),
    showInstallHint() && h('div', { class: 'card install-hint', dataset: { installHint: '' } },
      h('div', { class: 'card-title' }, '📲 להתקנה באייפון'),
      h('p', { class: 'muted small' }, 'לחץ למטה על כפתור השיתוף ', h('b', {}, '⬆︎'), ' ואז על ', h('b', {}, '"הוספה למסך הבית"'),
        '. המשחק יופיע עם סמל משלו, ייפתח במסך מלא ויעבוד גם בלי אינטרנט.')),
    puzzle && h('button', { class: 'card continue', onClick: () => ctx.router.go('game', { id }) },
      h('div', { class: 'row between' },
        h('div', {},
          h('div', { class: 'muted small' }, resuming ? 'ממשיכים מאיפה שעצרת' : 'השלב הבא'),
          h('div', { class: 'card-title' }, `${level.id} · שלב ${puzzle.stage} · ${world?.name ?? ''}`)),
        h('div', { class: 'icon-tile', 'aria-hidden': 'true' }, world?.emoji ?? '🧩')),
      h('div', { class: 'row between small progress-label' },
        h('span', { class: 'muted' }, `ההתקדמות ברמה ${level.name}`),
        h('span', { dir: 'ltr' }, `${done} / ${total}`)),
      h('div', { class: 'bar' }, h('i', { style: `width:${total ? (100 * done) / total : 0}%` }))),
    puzzle && h('button', { class: 'btn btn-primary', dataset: { action: 'play' }, onClick: () => ctx.router.go('game', { id }) },
      resuming ? '▶  המשך לשחק' : '▶  שחק עכשיו'),
    h('div', { class: 'grid2' },
      h('button', { class: 'card tile', dataset: { action: 'map' }, onClick: () => ctx.router.tab('map') },
        h('div', { class: 'icon-tile violet', 'aria-hidden': 'true' }, '🗺️'),
        h('div', { class: 'card-title' }, 'מפת השלבים'),
        h('div', { class: 'muted small' }, `${ctx.levels.length} רמות`)),
      h('button', { class: 'card tile', dataset: { action: 'words' }, onClick: () => ctx.router.tab('words') },
        h('div', { class: 'icon-tile teal', 'aria-hidden': 'true' }, '📖'),
        h('div', { class: 'card-title' }, 'המילים שלי'),
        h('div', { class: 'muted small' }, wordCount ? `${wordCount} מילים נלמדו` : 'עוד אין מילים'))),
    tabBar(ctx, 'home'));
}
