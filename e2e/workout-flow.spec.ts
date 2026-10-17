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
  await page.locator('#weight-pick').click();
  await expect(page).toHaveURL(/pick=weight/);
  await expect(page.locator('main h1')).toHaveText('Load · kg');
  await expect(page.getByRole('button', { name: '0 kg Current' })).toBeFocused();
  await page.getByRole('button', { name: '2.5 kg', exact: true }).click();
  await expect(page).not.toHaveURL(/pick=/);
  await expect(page.locator('#weight-value')).toHaveText('2.5');
  await page.getByRole('button', { name: 'Log set' }).click();

  const timer = page.getByRole('timer', { name: 'Rest remaining' });
  await expect(timer).toBeVisible();
  await page.reload();
  await expect(timer).toBeVisible();
  const data = await stored(page);
  expect(data.active.phase).toBe('rest');
  expect(data.active.tasks[0].completed).toMatchObject({ weight: 2.5, unit: 'kg' });
  await expect(page.getByRole('status').filter({ hasText: '× 2.5 kg' })).toBeVisible();
});

test('rest moves on to the next set by itself, and one tap logs it', async ({ page }) => {
  const workout = activeWorkout({ phase: 'rest', open: 1 });
  workout.restEndsAt = Date.now() + 3000;
  await seed(page, appState({ active: workout }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer', { name: 'Rest remaining' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '11 × 42.5 kg' })).toBeVisible();
  const log = page.getByRole('button', { name: 'Log set' });
  await expect(log).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#reps-value')).not.toBeEmpty();
  await log.click();
  await expect(page.getByRole('timer', { name: 'Stretch remaining' })).toBeVisible();
  const data = await stored(page);
  expect(data.active.tasks[2].completed).toMatchObject({ unit: 'kg' });
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

test('holding a value and dragging down turns it like a wheel, without opening the picker', async ({
  page,
}) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#weight-value')).toHaveText('0');

  await page.locator('#weight-pick').scrollIntoViewIfNeeded();
  const box = (await page.locator('#weight-pick').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await expect(page.locator('.scrub-wheel .is-current')).toBeVisible();
  await page.mouse.move(x, y + 56, { steps: 6 });
  await expect(page.locator('.scrub-wheel .is-current')).toContainText('5');
  await page.mouse.up();

  await expect(page.locator('.scrub-wheel')).toHaveCount(0);
  await expect(page).not.toHaveURL(/pick=/);
  await expect(page.locator('#weight-value')).toHaveText('5');
});

test('pushing a held value far keeps it turning, so long lists stay a thumb sweep away', async ({
  page,
}) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.locator('#weight-pick').scrollIntoViewIfNeeded();
  const box = (await page.locator('#weight-pick').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.move(x, y + 40, { steps: 4 });
  await page.mouse.move(x, y + 170, { steps: 8 });
  await page.waitForTimeout(1500);
  await page.mouse.move(x, y + 100, { steps: 4 });
  await page.mouse.up();

  await expect(page).not.toHaveURL(/pick=/);
  expect(Number(await page.locator('#weight-value').textContent())).toBeGreaterThan(30);
});
