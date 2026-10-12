// Stamps sw.js with the complete precache list and a content hash of every app asset,
// so any app change produces a new service worker that installed clients can update to.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SW_PATH = join(ROOT, 'sw.js');
const ROUTES = ['/', '/routine/', '/history/', '/workout/'];
const ROOT_FILES = ['app.js', 'styles.css', 'manifest.webmanifest'];
const ASSET_DIRS = [
  { dir: 'icons', pattern: /\.png$/ },
  { dir: 'js', pattern: /\.js$/ },
  { dir: 'packages/magnetic-picker/src', pattern: /\.(js|css)$/ },
];

function listFiles({ dir, pattern }) {
  return readdirSync(join(ROOT, dir), { recursive: true })
    .filter((file) => pattern.test(file))
    .map((file) => `${dir}/${file.split('\\').join('/')}`);
}

function precacheEntries() {
  const routes = ROUTES.map((url) => ({ url, file: `${url.slice(1)}index.html` }));
  const files = [...ROOT_FILES, ...ASSET_DIRS.flatMap(listFiles)].sort();
  return [...routes, ...files.map((file) => ({ url: `/${file}`, file }))];
}

function cacheName(entries) {
  const hash = createHash('sha256');
  for (const { url, file } of entries) {
    hash.update(`${url}\0`);
    hash.update(readFileSync(join(ROOT, file)));
  }
  return `maxsnr-${hash.digest('hex').slice(0, 12)}`;
}

const entries = precacheEntries();
const current = readFileSync(SW_PATH, 'utf8');
const next = current
  .replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = '${cacheName(entries)}';`)
  .replace(
    /const PRECACHE_URLS = \[[^\]]*\];/,
    `const PRECACHE_URLS = [\n${entries.map(({ url }) => `  '${url}',\n`).join('')}];`,
  );

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('sw.js is stale. Run `npm run sw` and commit the result.');
    process.exit(1);
  }
} else if (next !== current) {
  writeFileSync(SW_PATH, next);
  console.log('Updated sw.js precache manifest.');
}
