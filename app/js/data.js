// Loads bundled JSON (levels and puzzles). Works offline: everything ships with the app.
export function createData(fetchFn = (url) => fetch(url)) {
  const cache = new Map();
  const getJson = async (url) => {
    if (!cache.has(url)) {
      cache.set(url, fetchFn(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.json();
      }));
    }
    return cache.get(url);
  };
  let levels = null;
  return {
    async loadLevels() {
      levels = await getJson('data/levels.json');
      return levels;
    },
    async loadLevelPuzzles(levelId) {
      const meta = (levels ?? await this.loadLevels()).find((l) => l.id === levelId);
      if (!meta?.file) return [];
      return (await getJson(meta.file)).puzzles;
    },
  };
}
