// Offline support for the web (iPhone) version: every app file is cached on first visit.
// VERSION and ASSETS are written by `npm run pwa` — do not edit them by hand.
const VERSION = '8ccec3265b33';
const ASSETS = [
  "./",
  "css/app.css",
  "data/levels.json",
  "data/puzzles/a1.json",
  "data/puzzles/a2.json",
  "data/puzzles/b1.json",
  "data/puzzles/b2.json",
  "data/puzzles/c1.json",
  "data/puzzles/c2.json",
  "fonts/OFL.txt",
  "fonts/rubik-hebrew.woff2",
  "fonts/rubik-latin.woff2",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "index.html",
  "js/core/game.js",
  "js/core/grid.js",
  "js/core/hebrew.js",
  "js/core/progress.js",
  "js/core/puzzle.js",
  "js/core/scoring.js",
  "js/data.js",
  "js/main.js",
  "js/platform.js",
  "js/speech.js",
  "js/storage.js",
  "js/ui/board.js",
  "js/ui/clue-bar.js",
  "js/ui/clue-list.js",
  "js/ui/common.js",
  "js/ui/dom.js",
  "js/ui/gestures.js",
  "js/ui/history.js",
  "js/ui/keyboard.js",
  "js/ui/minimap.js",
  "js/ui/native-input.js",
  "js/ui/router.js",
  "js/ui/screens/complete.js",
  "js/ui/screens/game.js",
  "js/ui/screens/home.js",
  "js/ui/screens/map.js",
  "js/ui/screens/settings.js",
  "js/ui/screens/words.js",
  "js/ui/viewport.js",
  "manifest.webmanifest"
];
const CACHE = `tashbetzon-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tashbetzon-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit
    || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
