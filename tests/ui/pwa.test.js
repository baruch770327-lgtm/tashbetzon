import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { listAppAssets, assetsVersion } from '../../tools/pwa.mjs';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

function pngSize(path) {
  const b = readFileSync(new URL(path, root));
  assert.equal(b.subarray(1, 4).toString('latin1'), 'PNG', `${path} is a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('the web app manifest describes an installable Hebrew app', () => {
  const m = JSON.parse(read('app/manifest.webmanifest'));
  assert.equal(m.name, 'תשבצון');
  assert.equal(m.short_name, 'תשבצון');
  assert.equal(m.lang, 'he');
  assert.equal(m.dir, 'rtl');
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, '.');
  assert.equal(m.scope, '.');
  assert.equal(m.background_color, '#0f1530');
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  for (const icon of m.icons) {
    const [w, h] = pngSize(`app/${icon.src}`);
    assert.equal(`${w}x${h}`, icon.sizes, icon.src);
  }
});

test('index.html has the iPhone home-screen tags', () => {
  const html = read('app/index.html');
  for (const needle of [
    'rel="manifest" href="manifest.webmanifest"',
    'rel="apple-touch-icon" href="icons/icon-180.png"',
    'name="apple-mobile-web-app-capable" content="yes"',
    'name="apple-mobile-web-app-title" content="תשבצון"',
    'name="apple-mobile-web-app-status-bar-style"',
  ]) assert.ok(html.includes(needle), needle);
  assert.deepEqual(pngSize('app/icons/icon-180.png'), [180, 180]);
});

test('the offline cache lists every app file and its version matches (run npm run pwa after changes)', () => {
  const sw = read('app/sw.js');
  const listed = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);
  const version = sw.match(/const VERSION = '([0-9a-f]+)';/)[1];
  assert.deepEqual(listed, listAppAssets());
  assert.equal(version, assetsVersion());
  assert.ok(listed.includes('./') && listed.includes('data/puzzles/c2.json') && listed.includes('js/main.js'));
  assert.ok(!listed.includes('sw.js'));
  assert.ok(existsSync(new URL('app/sw.js', root)));
});
