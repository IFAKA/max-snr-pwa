import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['app.js', 'js', 'sw.js'];
const FORBIDDEN_DIRECTORY_NAMES = new Set(['utils', 'helpers', 'misc']);
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;

async function sourceFiles(entry) {
  const absolute = path.join(ROOT, entry);
  const entryStat = await stat(absolute);
  if (entryStat.isFile()) return [absolute];
  const files = [];
  for (const child of await readdir(absolute, { withFileTypes: true })) {
    if (child.name === 'vendor' || child.name.startsWith('.')) continue;
    files.push(
      ...(child.isDirectory()
        ? await sourceFiles(path.join(entry, child.name))
        : [path.join(absolute, child.name)]),
    );
  }
  return files;
}

const files = (await Promise.all(SOURCE_ROOTS.map(sourceFiles))).flat();
const violations = [];

for (const file of files.filter((candidate) => /\.(?:js|mjs)$/.test(candidate))) {
  const relative = path.relative(ROOT, file);
  const source = await readFile(file, 'utf8');
  const imports = [...source.matchAll(IMPORT_PATTERN)].map((match) => match[1]);

  if (relative.startsWith('js/workout/')) {
    for (const specifier of imports) {
      if (/render-|navigation\.js/.test(specifier)) {
        violations.push(`${relative}: workout domain cannot import ${specifier}`);
      }
    }
  }

  if (relative.startsWith('js/render-')) {
    for (const specifier of imports) {
      if (/^\.\/?(?:\.\.\/)+workout\//.test(specifier)) {
        violations.push(`${relative}: renderers must use the workout facade, not ${specifier}`);
      }
    }
  }
}

const trackedDirectoryNames = files
  .map((file) => path.relative(ROOT, file).split(path.sep))
  .flatMap((parts) => parts.slice(0, -1));
for (const directory of trackedDirectoryNames) {
  if (FORBIDDEN_DIRECTORY_NAMES.has(directory)) {
    violations.push(`generic architecture directory is not allowed: ${directory}/`);
  }
}

if (violations.length) {
  console.error('Architecture check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Architecture boundaries passed.');
}
