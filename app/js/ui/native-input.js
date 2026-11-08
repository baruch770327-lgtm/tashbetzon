// The phone's own keyboard: a hidden text field that receives typing.
// Its value is kept at a small sentinel so Backspace always has something to delete;
// every change is turned into "erase N, add these letters" by diffing old vs new value.
import { h } from './dom.js';

export const SENTINEL = '  ';

/** What changed between two values of the field: letters added at the end, and how many erased. */
export function diffInput(prev, next) {
  let i = 0;
  while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
  return { erase: prev.length - i, added: next.slice(i) };
}

const LATIN = /[A-Za-z]/;

export function createNativeInput({ onLetter, onErase, onNext, onLatin }) {
  const el = h('input', {
    class: 'native-input', type: 'text', inputmode: 'text', lang: 'he', dir: 'rtl',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
    enterkeyhint: 'next', 'aria-label': 'הקלדת אותיות לתשבץ', dataset: { nativeInput: '' },
  });
  let last = SENTINEL;
  let composing = false;

  const reset = () => {
    el.value = SENTINEL;
    last = SENTINEL;
    try { el.setSelectionRange(SENTINEL.length, SENTINEL.length); } catch { /* not focused */ }
  };

  function apply() {
    const { erase, added } = diffInput(last, el.value);
    last = el.value;
    for (let k = 0; k < erase; k++) onErase();
    for (const ch of added) {
      if (ch === '\n') onNext(1);
      else if (LATIN.test(ch)) onLatin?.();
      else onLetter(ch);
    }
    if (!composing) reset();
  }

  el.addEventListener('compositionstart', () => { composing = true; });
  el.addEventListener('compositionend', () => { composing = false; apply(); });
  el.addEventListener('input', apply);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onNext(e.shiftKey ? -1 : 1); }
    // Some keyboards send no input event for Backspace on an "empty-looking" field.
    if (e.key === 'Backspace' && el.value.length === 0) { e.preventDefault(); onErase(); reset(); }
  });
  el.addEventListener('focus', reset);
  reset();

  return {
    el,
    /** Opens the phone keyboard. Call from a tap so the phone allows it. */
    open() {
      if (document.activeElement === el) el.blur(); // re-focusing makes the phone show its keyboard again
      el.focus({ preventScroll: true });
      try { globalThis.AndroidBridge?.showKeyboard?.(); } catch { /* older app shell */ }
    },
    close() {
      el.blur();
      try { globalThis.AndroidBridge?.hideKeyboard?.(); } catch { /* older app shell */ }
    },
    isOpen: () => document.activeElement === el,
  };
}
