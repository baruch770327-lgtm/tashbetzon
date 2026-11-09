// Word book: every word from solved puzzles, newest first, with search and level filter.
import { h } from '../dom.js';
import { tabBar } from '../common.js';

export function render(ctx, params = {}) {
  let query = '';
  let level = params.level ?? 'all';
  const all = Object.entries(ctx.progress.words)
    .map(([id, w]) => ({ id, ...w }))
    .sort((a, b) => b.firstMs - a.firstMs || a.en.localeCompare(b.en));
  const levels = ctx.levels.filter((l) => all.some((w) => w.level === l.id));
  const list = h('div', { class: 'card word-list' });
  const pills = h('div', { class: 'level-pills' });

  function draw() {
    pills.replaceChildren(...[{ id: 'all', name: 'הכל' }, ...levels].map((l) => h('button', {
      class: `level-pill${level === l.id ? ' on' : ''}`, dataset: { filter: l.id },
      onClick: () => { level = l.id; draw(); },
    }, l.id === 'all' ? 'הכל' : h('b', { dir: 'ltr' }, l.id))));
    const q = query.trim().toLowerCase();
    const shown = all.filter((w) => (level === 'all' || w.level === level)
      && (!q || w.en.toLowerCase().includes(q) || w.he.includes(q)));
    if (all.length === 0) {
      list.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'big-emoji' }, '📖'), 'עוד לא נפתרו מילים. כל תשבץ שתפתור יוסיף לכאן את המילים שלו.'));
    } else if (shown.length === 0) {
      list.replaceChildren(h('div', { class: 'empty muted' }, 'לא נמצאו מילים'));
    } else {
      list.replaceChildren(...shown.map((w) => h('button', { class: 'word-row', dataset: { word: w.id }, onClick: () => ctx.speak(w.en) },
        h('span', { class: 'en-col' }, h('span', { class: 'en', dir: 'ltr', lang: 'en' }, w.en), h('span', { class: 'muted small', dir: 'ltr' }, w.level)),
        h('span', { class: 'he' }, w.he),
        h('span', { 'aria-hidden': 'true' }, '🔊'))));
    }
  }
  draw();

  return h('section', { class: 'words' },
    h('header', { class: 'topbar' }, h('h2', {}, 'המילים שלי'), h('div', { class: 'pill' }, `${all.length} מילים`)),
    h('input', {
      class: 'search', type: 'search', placeholder: '🔍  חיפוש באנגלית או בעברית', 'aria-label': 'חיפוש מילה',
      onInput: (e) => { query = e.target.value; draw(); },
    }),
    pills,
    list,
    tabBar(ctx, 'words'));
}
