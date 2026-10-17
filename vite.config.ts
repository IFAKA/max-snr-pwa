import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// The commit this build was made from, shown in History so an installed app can be checked.
function buildId() {
  const vercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercel) return vercel.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  plugins: [
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
      // The app registers its own classic /sw.js (scripts/build-sw.mjs) so installed
      // clients that registered the pre-SvelteKit worker keep updating in place.
      serviceWorker: { register: false },
      // Absolute asset URLs: the worker answers /routine, /routine/, and /routine/index.html
      // with the same cached shell.
      paths: { relative: false },
      adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
    setupFiles: ['tests/setup.ts'],
  },
});
