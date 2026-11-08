// Boot: load data and progress, mount the router.
import { loadProgress, saveProgress } from './storage.js';
import { createData } from './data.js';
import { createRouter } from './ui/router.js';
import * as home from './ui/screens/home.js';
import * as map from './ui/screens/map.js';

const screens = { home, map };

async function boot() {
  const data = createData();
  const levels = await data.loadLevels();
  const puzzles = {};
  for (const level of levels.filter((l) => l.available)) {
    puzzles[level.id] = await data.loadLevelPuzzles(level.id);
  }
  const ctx = {
    progress: loadProgress(),
    levels,
    puzzles,
    data,
    save() { saveProgress(ctx.progress); },
  };
  ctx.router = createRouter(document.getElementById('app'), screens, ctx);
  ctx.router.go('home');
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('app').textContent = 'אירעה שגיאה בטעינת המשחק. נסה לפתוח אותו מחדש.';
});
