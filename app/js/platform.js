// Platform details for the web (iPhone) version: offline cache, install hint, visible height with keyboard.

/** True inside the Android app shell (assets are local there; no offline cache needed). */
export const inAndroidApp = () => Boolean(globalThis.AndroidBridge);

/** iPhone/iPad Safari (iPadOS reports a Mac with touch). */
export function isIOS(nav = globalThis.navigator) {
  if (!nav) return false;
  return /iP(hone|ad|od)/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

/** Already opened from the home screen (installed). */
export function isStandalone(win = globalThis) {
  return Boolean(win.navigator?.standalone) || Boolean(win.matchMedia?.('(display-mode: standalone)').matches);
}

export const showInstallHint = () => isIOS() && !isStandalone() && !inAndroidApp();

/** Registers the offline cache on the web (https, or ?sw for local testing). Never in the Android app. */
export function registerOffline() {
  const wanted = location.protocol === 'https:' || new URLSearchParams(location.search).has('sw');
  if (inAndroidApp() || !wanted || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline play just won't be available */ });
}

/**
 * The height actually visible. On iPhone the keyboard covers the page instead of shrinking it,
 * so the game screen follows the visual viewport (CSS variable --app-h).
 */
export function trackVisibleHeight() {
  const vv = globalThis.visualViewport;
  if (!vv) return;
  const update = () => {
    document.documentElement.style.setProperty('--app-h', `${Math.round(vv.height)}px`);
    if (vv.offsetTop > 0) window.scrollTo(0, 0); // iOS pans the page when the keyboard opens; keep it in place
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}

export const visibleHeight = () => globalThis.visualViewport?.height ?? window.innerHeight;
