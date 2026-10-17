// Enforces the one-way dependency direction and naming rules that ESLint cannot express:
// data/state/storage → workout domain → screens → routes.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const FORBIDDEN_DIRECTORY_NAMES = new Set(['utils', 'helpers', 'misc']);
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
const DOMAIN =
  /^src\/lib\/(?:workout|storage|health)\/|^src\/lib\/(?:state|constants|types)\.ts$|^src\/lib\/routine\/routine-data\.ts$/;
const SCREENS = /^src\/lib\/(?:today|routine|history|workout-screens|components)\/|^src\/routes\//;

async function sourceFiles(directory) {
  const entries = await readdir(path.join(ROOT, directory), { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => {
        const relative = path.posix.join(directory, entry.name);
        return entry.isDirectory() ? sourceFiles(relative) : [relative];
      }),
  );
  return nested.flat();
}

const files = (await sourceFiles('src')).filter((file) => /\.(?:ts|svelte)$/.test(file));
const violations = [];

for (const file of files) {
  const source = await readFile(path.join(ROOT, file), 'utf8');
  const imports = [...source.matchAll(IMPORT_PATTERN)].map((match) => match[1]);
  for (const specifier of imports) {
    if (
      DOMAIN.test(file) &&
      /\.svelte(?:\.ts)?$|^\$app\/|\/(?:browser|components|workout-screens|today)\//.test(specifier)
    )
      violations.push(`${file}: domain code cannot import ${specifier}`);
    if (
      SCREENS.test(file) &&
      !DOMAIN.test(file) &&
      /(?:^|\/)workout\/(?!index\.ts$)[\w-]+\.ts$/.test(specifier)
    )
      violations.push(
        `${file}: screens must use the workout facade (workout/index.ts), not ${specifier}`,
      );
  }
  file
    .split('/')
    .slice(0, -1)
    .filter((directory) => FORBIDDEN_DIRECTORY_NAMES.has(directory))
    .forEach((directory) =>
      violations.push(`generic architecture directory is not allowed: ${directory}/`),
    );
}

const worker = await readFile(path.join(ROOT, 'scripts', 'sw-template.js'), 'utf8');
if (/indexedDB|localStorage/.test(worker.replace(/^\s*\/\/.*$/gm, '')))
  violations.push(
    'scripts/sw-template.js: the service worker must never touch IndexedDB or localStorage',
  );

if (violations.length) {
  console.error('Architecture check failed:');
  for (const violation of [...new Set(violations)]) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Architecture boundaries passed.');
}
