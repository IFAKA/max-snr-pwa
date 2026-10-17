import { expect, test, type Page } from '@playwright/test';
import { activeWorkout, appState, seed, stored } from './fixtures.ts';

async function openLifting(page: Page) {
  const workout = activeWorkout({ phase: 'rest', open: 1 });
  workout.restEndsAt = Date.now() + 1000;
  await seed(page, appState({ active: workout }));
  await page.goto('/workout/');
  await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible({ timeout: 10000 });
}

async function drag(page: Page, from: number, to: number) {
  const box = (await page.locator('.swipe-card').boundingBox())!;
  const y = box.y + 20;
  await page.mouse.move(box.x + box.width * from, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ((from + to) / 2), y, { steps: 4 });
  await page.mouse.move(box.x + box.width * to, y, { steps: 4 });
  return () => page.mouse.up();
}

test('dragging the screen most of the way right logs the set', async ({ page }) => {
  await openLifting(page);
  const release = await drag(page, 0.15, 0.9);
  await expect(page.locator('.swipe-card')).toHaveAttribute('data-armed', 'true');
  await expect(page.locator('.swipe-badge')).toContainText('Release to log');
  await release();
  await expect(page.getByRole('timer', { name: /remaining/ })).toBeVisible();
  const data = await stored(page);
  expect(data.active.tasks.filter((task: { completed: unknown }) => task.completed)).toHaveLength(
    3,
  );
});

test('a short drag springs back and logs nothing', async ({ page }) => {
  await openLifting(page);
  const release = await drag(page, 0.15, 0.3);
  await expect(page.locator('.swipe-card')).toHaveAttribute('data-armed', 'false');
  await release();
  await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible();
  const data = await stored(page);
  expect(data.active.phase).not.toBe('rest');
});

test('details sit on a second page that stays reachable by keyboard', async ({ page }) => {
  await openLifting(page);
  await expect(page.locator('.stage-more')).toHaveCount(1);
  await expect(page.locator('.previous-performance')).toBeAttached();
});

async function swipe(page: Page, from: number, to: number) {
  const box = (await page.locator('.swipe-card').boundingBox())!;
  const y = box.y + 20;
  await page.mouse.move(box.x + box.width * from, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ((from + to) / 2), y, { steps: 4 });
  await page.mouse.move(box.x + box.width * to, y, { steps: 4 });
  await page.mouse.up();
}

test('on rest, swiping left undoes the last set', async ({ page }) => {
  const workout = activeWorkout({ phase: 'rest', open: 1 });
  workout.restEndsAt = Date.now() + 60000;
  await seed(page, appState({ active: workout }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer', { name: 'Rest remaining' })).toBeVisible();
  await swipe(page, 0.85, 0.1);
  await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible();
  expect(
    (await stored(page)).active.tasks.filter((t: { completed: unknown }) => t.completed),
  ).toHaveLength(1);
});

test('on rest, swiping right moves to the next set', async ({ page }) => {
  const workout = activeWorkout({ phase: 'rest', open: 1 });
  workout.restEndsAt = Date.now() + 60000;
  await seed(page, appState({ active: workout }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer', { name: 'Rest remaining' })).toBeVisible();
  await swipe(page, 0.15, 0.9);
  await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible();
});
