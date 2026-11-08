// Boot: load data and progress, mount the router.
import { loadProgress, saveProgress } from './storage.js';
import { createData } from './data.js';
import { createRouter } from './ui/router.js';
import * as home from './ui/screens/home.js';
import * as map from './ui/screens/map.js';
import * as game from './ui/screens/game.js';
import * as complete from './ui/screens/complete.js';
import * as words from './ui/screens/words.js';
import * as settings from './ui/screens/settings.js';
import { speak } from './speech.js';

const screens = { home, map, game, complete, words, settings };

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
    speak(text) { return speak(text, { enabled: ctx.progress.settings.sound }); },
  };
  ctx.router = createRouter(document.getElementById('app'), screens, ctx);
  ctx.router.go('home');
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('app').textContent = 'אירעה שגיאה בטעינת המשחק. נסה לפתוח אותו מחדש.';
});
