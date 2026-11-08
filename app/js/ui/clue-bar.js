// The current clue: number, direction, English clue, letter count, speak button.
import { h } from './dom.js';

export const dirLabel = (dir) => (dir === 'across' ? 'מאוזן' : 'מאונך');
export const dirArrow = (dir) => (dir === 'across' ? '←' : '↓');
export const lengthLabel = (entry) => (entry.lengths.length > 1
  ? `(${entry.lengths.join(',')})`
  : `${entry.answer.length} אותיות`);

export function createClueBar({ onSpeak, onPrev, onNext, onOpenList }) {
  const badge = h('div', { class: 'clue-badge' });
  const meta = h('div', { class: 'clue-meta muted small' });
  const text = h('div', { class: 'clue-text', dir: 'ltr', lang: 'en' });
  const el = h('div', { class: 'clue-bar' },
    h('button', { class: 'clue-nav', 'aria-label': 'ההגדרה הקודמת', dataset: { action: 'prev-clue' }, onClick: onPrev }, '›'),
    h('button', { class: 'clue-main', dataset: { action: 'clue-list' }, onClick: onOpenList }, badge, h('div', { class: 'clue-body' }, meta, text)),
    h('button', { class: 'icon-btn', 'aria-label': 'השמעת ההגדרה', dataset: { action: 'speak' }, onClick: onSpeak }, '🔊'),
    h('button', { class: 'clue-nav', 'aria-label': 'ההגדרה הבאה', dataset: { action: 'next-clue' }, onClick: onNext }, '‹'));
  return {
    el,
    set(entry) {
      badge.textContent = `${entry.num} ${dirArrow(entry.dir)}`;
      meta.replaceChildren(`${dirLabel(entry.dir)} · `, h('span', { dir: 'ltr' }, lengthLabel(entry)));
      text.replaceChildren(...[entry.en.toUpperCase(), entry.note && h('span', { class: 'clue-note' }, ` ${entry.note}`)].filter(Boolean));
    },
  };
}
