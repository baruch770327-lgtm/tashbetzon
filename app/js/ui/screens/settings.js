// Settings: sound, vibration, auto-check, reset progress, about.
import { h } from '../dom.js';
import { defaultProgress } from '../../core/progress.js';
import { tabBar } from '../common.js';

const TOGGLES = [
  ['sound', '🔊 השמעה', 'השמעת המילים באנגלית בלחיצה על 🔊'],
  ['vibrate', '📳 רטט', 'רטט קצר כשיש טעות וכשמסיימים שלב'],
  ['autoCheck', '✅ בדיקה אוטומטית', 'אות שגויה נצבעת באדום מיד אחרי ההקלדה'],
];
const CONFIRM_MS = 4000;

export function render(ctx) {
  let confirmTimer = null;
  const switches = [];
  const syncSwitches = () => switches.forEach(([key, sw]) => sw.setAttribute('aria-checked', String(ctx.progress.settings[key])));
  const resetBtn = h('button', { class: 'btn btn-ghost danger', dataset: { action: 'reset' } }, 'איפוס התקדמות');
  const status = h('p', { class: 'muted small center', role: 'status' });
  resetBtn.addEventListener('click', () => {
    if (!confirmTimer) {
      resetBtn.textContent = 'לחץ שוב לאישור — הכל יימחק';
      resetBtn.classList.add('armed');
      confirmTimer = setTimeout(() => {
        confirmTimer = null;
        resetBtn.textContent = 'איפוס התקדמות';
        resetBtn.classList.remove('armed');
      }, CONFIRM_MS);
      return;
    }
    clearTimeout(confirmTimer);
    confirmTimer = null;
    ctx.progress = defaultProgress();
    ctx.save();
    syncSwitches();
    resetBtn.textContent = 'איפוס התקדמות';
    resetBtn.classList.remove('armed');
    status.textContent = 'ההתקדמות אופסה. אפשר להתחיל מההתחלה.';
  });

  return h('section', { class: 'settings' },
    h('header', { class: 'topbar' }, h('h2', {}, 'הגדרות')),
    h('div', { class: 'card settings-list' }, TOGGLES.map(([key, label, help]) => {
      const sw = h('button', {
        class: 'switch', role: 'switch', 'aria-checked': String(ctx.progress.settings[key]), dataset: { setting: key }, 'aria-label': label,
      }, h('i'));
      switches.push([key, sw]);
      sw.addEventListener('click', () => {
        ctx.progress.settings[key] = !ctx.progress.settings[key];
        sw.setAttribute('aria-checked', String(ctx.progress.settings[key]));
        ctx.save();
      });
      return h('div', { class: 'setting' }, h('div', {}, h('div', { class: 'card-title' }, label), h('div', { class: 'muted small' }, help)), sw);
    })),
    resetBtn,
    status,
    h('div', { class: 'card about muted small' },
      h('p', {}, 'תשבצון · גרסה 0.1.0'),
      h('p', {}, 'המשחק עובד בלי אינטרנט, בלי פרסומות ובלי איסוף מידע. ההתקדמות נשמרת רק בטלפון שלך.'),
      h('p', {}, 'התרגומים נכתבו בעזרת בינה מלאכותית ויכולות להיות בהם טעויות.'),
      h('p', {}, 'גופן Rubik, ברישיון SIL Open Font License.')),
    tabBar(ctx, 'settings'));
}
