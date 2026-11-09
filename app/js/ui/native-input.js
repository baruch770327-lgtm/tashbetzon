// The phone's own keyboard: a hidden text field that receives typing.
// Its value is kept at a small sentinel so Backspace always has something to delete;
// every change is turned into "erase N, add these letters" by diffing old vs new value.
import { h } from './dom.js';
import { visibleHeight } from '../platform.js';

export const SENTINEL = '  ';

/** What changed between two values of the field: letters added at the end, and how many erased. */
export function diffInput(prev, next) {
  let i = 0;
  while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
  return { erase: prev.length - i, added: next.slice(i) };
}

const LATIN = /[A-Za-z]/;

/**
 * Turns field changes into board actions. During a keyboard composition (word suggestions), each typed
 * character's board cell is remembered, so when the keyboard rewrites or deletes composed text only
 * those cells are cleared — never letters elsewhere on the board.
 * onLetter(ch) returns a token for the cell it wrote (or null if nothing was written).
 */
export function createInputTracker({ onLetter, onErase, onEraseAt, onNext, onLatin }) {
  const written = [];
  return {
    apply(prev, next, composing) {
      const { erase, added } = diffInput(prev, next);
      for (let k = 0; k < erase; k++) {
        if (written.length) {
          const tok = written.pop();
          if (tok !== null) onEraseAt(tok);
        } else {
          onErase();
        }
      }
      for (const ch of added) {
        if (ch === '\n') { onNext(1); written.push(null); } else if (LATIN.test(ch)) { onLatin?.(); written.push(null); } else written.push(onLetter(ch) ?? null);
      }
      if (!composing) written.length = 0;
    },
    end() { written.length = 0; },
  };
}

export function createNativeInput({ onLetter, onErase, onEraseAt, onNext, onLatin }) {
  const el = h('input', {
    class: 'native-input', type: 'text', inputmode: 'text', lang: 'he', dir: 'rtl',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
    'aria-label': 'הקלדת אותיות לתשבץ', dataset: { nativeInput: '' },
  });
  let last = SENTINEL;
  let composing = false;
  // Whether the phone keyboard is showing. Focus alone is not enough: Android Back hides the keyboard
  // but leaves the field focused. The app grows back to full height when that happens.
  let shown = false;
  let fullHeight = visibleHeight();
  const onResize = () => {
    const h = visibleHeight();
    if (h >= fullHeight * 0.95) shown = false; // back to full height: keyboard gone
    fullHeight = Math.max(fullHeight, h);
  };
  window.addEventListener('resize', onResize);
  globalThis.visualViewport?.addEventListener('resize', onResize);
  const tracker = createInputTracker({ onLetter, onErase, onEraseAt, onNext, onLatin });

  const reset = () => {
    el.value = SENTINEL;
    last = SENTINEL;
    try { el.setSelectionRange(SENTINEL.length, SENTINEL.length); } catch { /* not focused */ }
  };

  function apply() {
    const prev = last;
    last = el.value;
    tracker.apply(prev, el.value, composing);
    if (!composing) reset();
  }

  el.addEventListener('compositionstart', () => { composing = true; });
  el.addEventListener('compositionend', () => { composing = false; apply(); tracker.end(); });
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
      shown = true;
      try { globalThis.AndroidBridge?.showKeyboard?.(); } catch { /* older app shell */ }
    },
    close() {
      shown = false;
      el.blur();
      try { globalThis.AndroidBridge?.hideKeyboard?.(); } catch { /* older app shell */ }
    },
    isOpen: () => shown && document.activeElement === el,
    detach: () => {
      window.removeEventListener('resize', onResize);
      globalThis.visualViewport?.removeEventListener('resize', onResize);
    },
  };
}
