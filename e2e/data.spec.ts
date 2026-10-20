import { expect, test } from '@playwright/test';
import { appState, savedWorkout, seed, stored } from './fixtures.ts';

test('export downloads a backup of the stored data', async ({ page }) => {
  await seed(page, appState());
  await page.goto('/history/?view=data');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('maxsnr-backup.json');
});

test('the Sound switch turns sound off and remembers it', async ({ page }) => {
  await seed(page, appState());
  await page.goto('/history/?view=data');
  const sound = page.getByRole('switch', { name: 'Sound' });
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('import validates, asks with "Keep Current Data" as the default, then replaces', async ({
  page,
}) => {
  await seed(page, appState());
  await page.goto('/history/?view=data');
  await expect(page.locator('main h1')).toHaveText('Settings');
  const input = page.locator('#import');

  await input.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"nope":1}'),
  });
  await expect(page.locator('#data-status')).toHaveText('Invalid backup file.');

  const backup = appState({ history: [savedWorkout(1), savedWorkout(2), savedWorkout(3)] });
  await input.setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const dialog = page.locator('dialog[open], [data-confirm-drawer]');
  await expect(dialog.getByRole('button', { name: 'Keep Current Data' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Replace with Backup' }).click();
  await expect.poll(async () => (await stored(page)).history.length).toBe(3);
});

test('legacy queue-format workouts migrate and resume', async ({ page }) => {
  const legacy = {
    history: [],
    active: {
      name: 'Old workout',
      date: new Date().toISOString(),
      pos: 0,
      queue: [{ id: 'row', name: 'Row', sets: 2, reps: '8–12', done: [{ reps: 10, weight: 40 }] }],
    },
    updatedAt: Date.now() + 60000,
  };
  await seed(page, legacy);
  await page.goto('/workout/');
  await expect(page.locator('main h1')).toHaveText('Row');
  const data = await stored(page);
  expect(data.version).toBe(2);
  expect(data.active.tasks).toHaveLength(2);
  expect(data.active.tasks[0].completed.reps).toBe(10);
});

test('state persists to IndexedDB under the existing database and store names', async ({
  page,
}) => {
  await seed(page, appState());
  await page.goto('/routine/');
  await expect(page.locator('main h1')).toHaveText('Routine');
  const fromDb = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('maxsnr-workout', 1);
        request.onsuccess = () => {
          const get = request.result.transaction('state').objectStore('state').get('app');
          get.onsuccess = () => resolve(get.result?.history?.length ?? null);
          get.onerror = () => reject(get.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  expect(fromDb).toBe(1);
});

test('a check-in goes one value per screen and returns to the changes', async ({ page }) => {
  await page.goto('/history/?view=measurements');
  await expect(page.getByText('No check-ins yet')).toBeVisible();
  await page.getByRole('link', { name: 'New check-in' }).click();
  await expect(page.locator('main h1')).toHaveText('Waist');
  await page.locator('#value-pick').click();
  await page.getByRole('dialog').getByRole('button', { name: '82 cm', exact: true }).click();
  await expect(page.locator('#value-output')).toHaveText('82');
  await page.locator('#step-save').focus();
  await page.locator('#step-save').press('Enter');
  await expect(page.locator('main h1')).toHaveText('Measurements');
  await expect(page.getByText('82 cm')).toBeVisible();
});
