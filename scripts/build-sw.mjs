// Writes build/sw.js: a classic (non-module) service worker that precaches every built file.
// It stays at /sw.js so phones that installed earlier versions keep updating in place.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BUILD = path.join(ROOT, 'build');
const TEMPLATE = path.join(ROOT, 'scripts', 'sw-template.js');
const SKIP = new Set(['sw.js', '.DS_Store', 'robots.txt']);

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !SKIP.has(entry.name))
      .map((entry) => {
        const absolute = path.join(directory, entry.name);
        return entry.isDirectory() ? files(absolute) : [absolute];
      }),
  );
  return nested.flat();
}

const toUrl = (file) => {
  const url = `/${path.relative(BUILD, file).split(path.sep).join('/')}`;
  return url.endsWith('/index.html') ? url.slice(0, -'index.html'.length) : url;
};

const built = (await files(BUILD)).sort();
if (!built.some((file) => file.endsWith(`${path.sep}index.html`)))
  throw new Error('build/ has no prerendered pages; run `vite build` first.');

const hash = createHash('sha256');
for (const file of built) {
  hash.update(toUrl(file));
  hash.update(await readFile(file));
}
const template = await readFile(TEMPLATE, 'utf8');
hash.update(template);

const urls = built.map(toUrl).sort();
const worker = template
  .replace('__CACHE_NAME__', `maxsnr-${hash.digest('hex').slice(0, 12)}`)
  .replace('__PRECACHE_URLS__', JSON.stringify(urls, null, 2));
await writeFile(path.join(BUILD, 'sw.js'), worker);
console.log(`sw.js: precaching ${urls.length} files`);
