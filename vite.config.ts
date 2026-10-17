import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
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
