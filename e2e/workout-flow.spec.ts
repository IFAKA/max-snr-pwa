import { expect, test } from '@playwright/test';
import { activeWorkout, appState, seed, stored } from './fixtures.ts';

test('start from a routine day, log a set, rest survives a refresh', async ({ page }) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('button', { name: 'Start' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Start' }).click();

  await expect(page).toHaveURL(/\/workout\/$/);
  await expect(page.getByText('Choose your first exercise.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#reps-value')).toBeVisible();
  await page.getByRole('button', { name: 'Increase reps' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/step=load/);
  await page.getByRole('button', { name: 'Increase load' }).click();
  await page.getByRole('button', { name: 'Log set' }).click();

  const timer = page.getByRole('timer', { name: 'Rest remaining' });
  await expect(timer).toBeVisible();
  await page.reload();
  await expect(timer).toBeVisible();
  const data = await stored(page);
  expect(data.active.phase).toBe('rest');
  expect(data.active.tasks[0].completed).toMatchObject({ weight: 2.5, unit: 'kg' });
});

test('a single back gesture is ignored; Escape asks with "Keep Working Out" focused', async ({
  page,
}) => {
  await seed(page, appState({ active: activeWorkout({ phase: 'rest', open: 1 }) }));
  await page.goto('/');
  await page.getByRole('link', { name: /Continue/ }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/workout\/$/);
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  await page.keyboard.press('Escape');
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('heading')).toHaveText('Cancel workout?');
  await expect(dialog.getByRole('button', { name: 'Keep Working Out' })).toBeFocused();
  await expect(dialog).toContainText('Cancel discards this workout.');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect((await stored(page)).active).not.toBeNull();
});

test('finishing the cooldown saves at once; Reopen undoes it', async ({ page }) => {
  await seed(page, appState({ active: activeWorkout({ phase: 'stretch', open: 0 }) }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer', { name: 'Stretch remaining' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page).toHaveURL(/view=summary/);
  await expect(page.getByRole('status').filter({ hasText: 'Saved to History' })).toBeVisible();
  await expect(page.getByText('Chest-Supported Row: +2.5 kg')).toBeVisible();
  let data = await stored(page);
  expect(data.active).toBeNull();
  expect(data.history).toHaveLength(2);

  await page.getByRole('button', { name: 'Reopen Workout' }).click();
  await expect(page.getByRole('timer', { name: 'Stretch remaining' })).toBeVisible();
  data = await stored(page);
  expect(data.history).toHaveLength(1);
  expect(data.active.phase).toBe('stretch');
});

test('closing on the completion screen loses nothing', async ({ page }) => {
  await seed(page, appState({ active: activeWorkout({ phase: 'stretch', open: 0 }) }));
  await page.goto('/workout/');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/view=summary/);
  await page.reload();
  await expect(page.getByText('Saved to History')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await stored(page)).history).toHaveLength(2);
});

test('a workout left on the old unsaved review step is saved on open', async ({ page }) => {
  await seed(page, appState({ active: activeWorkout({ phase: 'complete', open: 0 }) }));
  await page.goto('/workout/');
  await expect(page).toHaveURL(/view=summary/);
  const data = await stored(page);
  expect(data.active).toBeNull();
  expect(data.history[0].id).toBe(2000);
});

test('cancel discards the workout; finish early keeps the logged sets', async ({ page }) => {
  await seed(page, appState({ active: activeWorkout({ phase: 'rest', open: 1 }) }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('dialog[open]').getByRole('button', { name: 'Finish Early' }).click();
  await expect(page).toHaveURL(/view=summary/);
  const data = await stored(page);
  expect(
    data.history[0].tasks.filter((task: { completed: unknown }) => task.completed),
  ).toHaveLength(2);
});

test('deep links unwind detail → parent → Today with back', async ({ page, context }) => {
  await seed(page, appState());
  await page.goto('/history/?view=workout&id=0');
  await expect(page.locator('main h1')).toHaveText('Full body A');
  for (const title of ['Workouts', 'History']) {
    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(title);
  }
  await page.goBack();
  await expect(page).toHaveURL(/:4173\/$/);

  // A fresh launch (new tab or installed-app start) on a routine detail.
  const launch = await context.newPage();
  await launch.goto('/routine/?day=Monday&view=exercises');
  await expect(launch.locator('main h1')).toHaveText('Exercises');
  await launch.goBack();
  await expect(launch).toHaveURL(/\/routine\/\?day=Monday$/);
  await launch.goBack();
  await expect(launch.locator('main h1')).toHaveText('Routine');
  await launch.goBack();
  await expect(launch).toHaveURL(/:4173\/$/);
});
