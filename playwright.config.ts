import { defineConfig, devices } from '@playwright/test';

// Runs against the production build (`npm run build` first) so the generated /sw.js and the
// prerendered shells are what gets tested.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  // Serves build/ exactly as deployed (vite preview does not serve the generated /sw.js).
  webServer: {
    command: 'python3 -m http.server 4173 --directory build',
    port: 4173,
    reuseExistingServer: true,
    stderr: 'ignore',
  },
  projects: [
    {
      name: 'watch-225',
      use: { ...devices['Desktop Chrome'], viewport: { width: 225, height: 225 }, hasTouch: true },
    },
    {
      name: 'watch-192',
      use: { ...devices['Desktop Chrome'], viewport: { width: 192, height: 192 }, hasTouch: true },
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
