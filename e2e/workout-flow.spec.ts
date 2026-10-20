import { expect, test, type Page } from '@playwright/test';
import { activeWorkout, appState, seed, stored } from './fixtures.ts';

test('start from a routine day, log a set, rest survives a refresh', async ({ page }) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('button', { name: 'Start' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Start' }).click();

  await expect(page).toHaveURL(/\/workout\/$/);
  await expect(page.locator('#reps-value')).toBeVisible();
  await page.locator('#weight-pick').click();
  const wheel = page.getByRole('dialog', { name: 'Load in kg' });
  await expect(wheel.getByRole('button', { name: '0 kg', exact: true })).toBeFocused();
  await wheel.getByRole('button', { name: '2.5 kg', exact: true }).click();
  await expect(wheel).toHaveCount(0);
  await expect(page.locator('#weight-value')).toHaveText('2.5');
  await page.getByRole('button', { name: 'Log set' }).focus();
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
  await log.focus();
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
  await page.getByRole('button', { name: 'Finish' }).focus();
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
  await page.getByRole('button', { name: 'Finish' }).focus();
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

test('finish early goes to the stretch and keeps the logged sets', async ({ page }) => {
  await seed(page, appState({ active: activeWorkout({ phase: 'rest', open: 1 }) }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('dialog[open]').getByRole('button', { name: 'Finish Early' }).click();
  await expect(page.getByRole('timer', { name: 'Stretch remaining' })).toBeVisible();
  const data = await stored(page);
  expect(data.active.phase).toBe('stretch');
  expect(data.active.tasks.filter((task: { completed: unknown }) => task.completed)).toHaveLength(
    2,
  );
  await page.keyboard.press('Escape');
  await page.locator('dialog[open]').getByRole('button', { name: 'Finish and Save' }).click();
  await expect(page).toHaveURL(/view=summary/);
});

test('deep links unwind detail → parent → Today with back', async ({ page, context }) => {
  await seed(page, appState());
  await page.goto('/history/?view=workout&id=0');
  await expect(page.locator('main h1')).toHaveText('Full body A');
  for (const title of ['History']) {
    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(title);
  }
  await page.goBack();
  await expect(page).toHaveURL(/:4173\/$/);

  // A fresh launch (new tab or installed-app start) on a routine detail.
  const launch = await context.newPage();
  await launch.goto('/routine/?day=Monday&view=exercises');
  await expect(launch.locator('main h1')).toHaveText('Full body A');
  await launch.goBack();
  await expect(launch.locator('main h1')).toHaveText('Routine');
  await launch.goBack();
  await expect(launch).toHaveURL(/:4173\/$/);
});

async function openWeightWheel(page: Page) {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#weight-value')).toHaveText('0');
  await page.locator('#weight-pick').click();
  const wheel = page.getByRole('dialog', { name: 'Load in kg' });
  await expect(wheel).toBeVisible();
  return wheel;
}

test('a tapped value opens a wheel that scrolls natively and keeps its value on an outside tap', async ({
  page,
}) => {
  const wheel = await openWeightWheel(page);
  const box = (await wheel.locator('.value-wheel-face').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 52 * 4);
  // Emulated touch devices scale wheel deltas, so assert that it turned, not how far.
  const current = wheel.locator('.is-current');
  await expect(current).not.toHaveText('0 kg');
  const picked = ((await current.textContent()) ?? '').replace(' kg', '');
  await page.mouse.click(2, 2);
  await expect(wheel).toHaveCount(0);
  await expect(page).toHaveURL(/\/workout\/$/);
  await expect(page.locator('#weight-value')).toHaveText(picked);
  const data = await stored(page);
  expect(data.active.draft.weight).toBe(picked);
});

test('back or Escape closes the wheel and keeps the value, without leaving the workout', async ({
  page,
}) => {
  const wheel = await openWeightWheel(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(wheel.locator('.is-current')).toHaveText('5 kg');
  await page.keyboard.press('Escape');
  await expect(wheel).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('#weight-value')).toHaveText('5');
});

test('Today offers the next workout and a restart that needs no setup', async ({ page }) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Full body A' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start At the gym · 30 min' }).click();
  await expect(page).toHaveURL(/\/workout\/$/);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('#reps-value')).toBeVisible();
});

test('menus name things the way Today does: workouts in Routine, only the past in History', async ({
  page,
}) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/');
  await expect(page.getByRole('link', { name: /^Full body A.*Next/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Upper body B/ })).toBeVisible();
  await expect(page.getByText('Monday')).toHaveCount(0);
  await page.getByRole('link', { name: /^Upper body B/ }).click();
  await expect(page.getByRole('heading', { name: 'Upper body B' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Start/ })).toBeVisible();
  await expect(page.getByText('Cable Lateral Raise')).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Sound' })).toBeVisible();
});

test('a saved workout can be corrected to the exercise really done', async ({ page }) => {
  await seed(page, appState());
  await page.goto('/history/?view=workout&id=0');
  await page.getByRole('link', { name: 'Did a different exercise?' }).click();
  await expect(page.locator('main h1')).toHaveText('Done instead');
  await page.getByRole('button', { name: /Pike Push-Up/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Change Exercise' }).click();
  await expect(page.locator('main h1')).toHaveText('Full body A');
  await expect(page.getByText('Pike Push-Up')).toBeVisible();
  expect((await stored(page)).history[0].tasks[0].exerciseId).toBe('pike-push-up');
});
