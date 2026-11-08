// localStorage adapter. Never throws: storage can be missing or blocked.
import { defaultProgress, migrate } from './core/progress.js';

export const STORAGE_KEY = 'tashbetzon.progress';

const defaultStorage = () => {
  try { return globalThis.localStorage; } catch { return undefined; }
};

export function loadProgress(storage = defaultStorage()) {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return text ? migrate(JSON.parse(text)) : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
