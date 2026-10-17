import { expect, test } from '@playwright/test';
import { appState, seed } from './fixtures.ts';

test.use({ serviceWorkers: 'allow' });

test('after the first visit every screen loads offline from the service worker', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'watch-225', 'one viewport is enough for caching');
  await seed(page, appState());
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
  });
  await context.setOffline(true);
  for (const [path, title] of [
    ['/routine/?day=Monday', 'Full body A'],
    ['/history', 'History'],
    ['/workout/?activity=walk', 'Walk'],
    ['/', ''],
  ]) {
    await page.goto(path);
    if (title) await expect(page.locator('main h1')).toHaveText(title);
    else await expect(page.locator('main h1')).toBeVisible();
  }
});

test('the worker never touches app data storage', async ({ request }) => {
  const worker = await (await request.get('/sw.js')).text();
  expect(worker).toContain("const CACHE_NAME = 'maxsnr-");
  expect(worker.replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/indexedDB|localStorage/);
});
