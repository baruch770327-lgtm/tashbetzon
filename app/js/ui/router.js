// Mounts one screen at a time; keeps a history stack for ✕ buttons and Android back.
import { createHistory } from './history.js';

export function createRouter(root, screens, ctx) {
  const history = createHistory();
  let active = null;

  function render() {
    const { name, params } = history.current();
    active?.dispose?.();
    active = screens[name];
    const el = active.render(ctx, params);
    el.dataset.screen = name;
    el.classList.add('screen');
    root.replaceChildren(el);
    window.scrollTo(0, 0);
    el.dispatchEvent(new CustomEvent('screen:mounted', { bubbles: true }));
  }

  const router = {
    go(name, params = {}) { history.push(name, params); render(); },
    replace(name, params = {}) { history.replace(name, params); render(); },
    /** Top-level tabs: home is the root, every other tab sits one level above it. */
    tab(name, params = {}) {
      history.reset('home', {});
      if (name !== 'home') history.push(name, params);
      render();
    },
    back() {
      if (active?.onBack?.()) return true; // the screen handled it (e.g. closed a sheet)
      if (!history.back()) return false;
      render();
      return true;
    },
    current: () => history.current(),
  };
  window.tashbetzonBack = () => router.back();
  return router;
}
