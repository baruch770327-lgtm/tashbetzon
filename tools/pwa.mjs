#!/usr/bin/env node
// Keeps the offline cache list in app/sw.js in step with the files in app/. Run after changing app files:
//   npm run pwa
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const APP = new URL('../app/', import.meta.url);
const SKIP = new Set(['sw.js', '.DS_Store']);

function walk(dirUrl, prefix = '') {
  return readdirSync(dirUrl).sort().flatMap((name) => {
    if (SKIP.has(name)) return [];
    const url = new URL(name, dirUrl);
    if (statSync(url).isDirectory()) return walk(new URL(`${name}/`, dirUrl), `${prefix}${name}/`);
    return [`${prefix}${name}`];
  });
}

/** Every file the app needs offline ('./' is the start page itself). */
export function listAppAssets() {
  return ['./', ...walk(APP)];
}

/** Changes whenever any app file changes, so phones fetch the new version. */
export function assetsVersion() {
  const h = createHash('sha256');
  for (const f of walk(APP)) { h.update(f); h.update(readFileSync(new URL(f, APP))); }
  return h.digest('hex').slice(0, 12);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const swUrl = new URL('sw.js', APP);
  let sw = readFileSync(swUrl, 'utf8');
  sw = sw.replace(/const VERSION = '[0-9a-f]*';/, `const VERSION = '${assetsVersion()}';`);
  sw = sw.replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = ${JSON.stringify(listAppAssets(), null, 2)};`);
  writeFileSync(swUrl, sw);
  console.log(`sw.js: ${listAppAssets().length} files, version ${assetsVersion()}`);
}
