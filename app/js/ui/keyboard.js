// Hebrew on-screen keyboard (standard Israeli layout) + physical keyboard support.
import { h } from './dom.js';
import { normalizeLetter } from '../core/hebrew.js';

const ROWS = ['קראטוןםפ', 'שדגכעיחלךף', 'זסבהנמצתץ'];

export function createKeyboard({ onLetter, onErase, onNext }) {
  const key = (ch) => h('button', { class: 'key', dataset: { key: ch }, 'aria-label': ch, onClick: () => onLetter(ch) }, ch);
  const el = h('div', { class: 'keyboard', dir: 'rtl' },
    h('div', { class: 'krow' }, [...ROWS[0]].map(key),
      h('button', { class: 'key wide', dataset: { key: 'erase' }, 'aria-label': 'מחיקה', onClick: onErase }, '⌫')),
    h('div', { class: 'krow' }, [...ROWS[1]].map(key)),
    h('div', { class: 'krow' }, [...ROWS[2]].map(key),
      h('button', { class: 'key wide', dataset: { key: 'next' }, 'aria-label': 'ההגדרה הבאה', onClick: () => onNext(1) }, '⏎')));

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') { e.preventDefault(); onErase(); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); onNext(e.shiftKey ? -1 : 1); return; }
    if (normalizeLetter(e.key)) { e.preventDefault(); onLetter(e.key); }
  }
  document.addEventListener('keydown', onKeyDown);
  return { el, detach: () => document.removeEventListener('keydown', onKeyDown) };
}
