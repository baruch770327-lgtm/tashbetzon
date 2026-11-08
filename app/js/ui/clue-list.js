// Bottom sheet with all clues, tabs for across / down.
import { h } from './dom.js';
import { lengthLabel } from './clue-bar.js';

export function createClueList(game, { onPick }) {
  let tab = 'across';
  const list = h('div', { class: 'sheet-list' });
  const tabs = h('div', { class: 'sheet-tabs' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'רשימת ההגדרות' },
    h('div', { class: 'sheet-handle' }), tabs, list);
  const el = h('div', { class: 'sheet-backdrop', hidden: true, onClick: (e) => { if (e.target === el) api.close(); } }, sheet);

  function renderTabs() {
    const count = (dir) => game.puzzle.entries.filter((e) => e.dir === dir).length;
    tabs.replaceChildren(...['across', 'down'].map((dir) => h('button', {
      class: `pill${tab === dir ? ' on' : ''}`, dataset: { tabDir: dir },
      onClick: () => { tab = dir; api.update(); },
    }, `${dir === 'across' ? 'מאוזן' : 'מאונך'} (${count(dir)})`)));
  }

  const api = {
    el,
    open() {
      tab = game.currentEntry().dir;
      api.update();
      el.hidden = false;
      list.querySelector('.current')?.scrollIntoView({ block: 'center' });
    },
    close() { el.hidden = true; },
    update() {
      renderTabs();
      const cur = game.currentEntry().index;
      list.replaceChildren(...game.puzzle.entries.filter((e) => e.dir === tab).map((e) => {
        const solved = game.isEntrySolved(e.index);
        return h('button', {
          class: `clue-row${solved ? ' solved' : ''}${e.index === cur ? ' current' : ''}`,
          dataset: { entry: e.index },
          onClick: () => { api.close(); onPick(e.index); },
        },
        h('span', { class: 'clue-num' }, e.num),
        h('span', { class: 'clue-en', dir: 'ltr', lang: 'en' }, e.en, e.note ? h('span', { class: 'clue-note' }, ` ${e.note}`) : null),
        h('span', { class: 'muted small', dir: 'ltr' }, lengthLabel(e).replace(' אותיות', '')),
        h('span', { class: 'clue-check' }, solved ? '✓' : ''));
      }));
    },
  };
  return api;
}
