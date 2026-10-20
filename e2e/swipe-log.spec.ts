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

test('dragging the screen most of the way left logs the set', async ({ page }) => {
  await openLifting(page);
  const release = await drag(page, 0.85, 0.1);
  await expect(page.locator('.swipe-card')).toHaveAttribute('data-armed', 'true');
  await release();
  await expect(page.getByRole('timer', { name: /remaining/ })).toBeVisible();
  const data = await stored(page);
  expect(data.active.tasks.filter((task: { completed: unknown }) => task.completed)).toHaveLength(
    3,
  );
});

test('a short drag springs back and logs nothing', async ({ page }) => {
  await openLifting(page);
  const release = await drag(page, 0.85, 0.7);
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

test('on rest, swiping right undoes the last set', async ({ page }) => {
  const workout = activeWorkout({ phase: 'rest', open: 1 });
  workout.restEndsAt = Date.now() + 60000;
  await seed(page, appState({ active: workout }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer', { name: 'Rest remaining' })).toBeVisible();
  await swipe(page, 0.15, 0.9);
  await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible();
  expect(
    (await stored(page)).active.tasks.filter((t: { completed: unknown }) => t.completed),
  ).toHaveLength(1);
});

test('on rest, swiping left moves to the next set', async ({ page }) => {
  const workout = activeWorkout({ phase: 'rest', open: 1 });
  workout.restEndsAt = Date.now() + 60000;
  await seed(page, appState({ active: workout }));
  await page.goto('/workout/');
  await expect(page.getByRole('timer', { name: 'Rest remaining' })).toBeVisible();
  await swipe(page, 0.85, 0.1);
  await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible();
});

test('on the first set, swiping up opens the exercise list', async ({ page }) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#reps-value')).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  // The route's view transition covers the page for a moment.
  await page.waitForTimeout(800);
  const box = (await page.locator('.swipe-card').boundingBox())!;
  const x = box.x + box.width / 2;
  const startY = Math.min(box.y + box.height * 0.8, page.viewportSize()!.height - 20);
  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, startY - box.height * 0.3, { steps: 5 });
  // The drawer is already rising under the finger before the release.
  await expect(page.locator('.drawer-peek')).toBeAttached();
  await page.mouse.move(x, startY - box.height * 0.4, { steps: 5 });
  await page.mouse.up();
  await expect(page).toHaveURL(/view=exercises/);
  await expect(page.locator('[data-vaul-drawer]')).toBeVisible();
  await expect(page.locator('.drawer-sheet .workout-picker')).toBeVisible();

  // Dragging the handle down closes it, back on the workout screen.
  await page.waitForTimeout(500);
  const handle = (await page.locator('.drawer-handle').boundingBox())!;
  const hx = handle.x + handle.width / 2;
  await page.mouse.move(hx, handle.y + 10);
  await page.mouse.down();
  await page.mouse.move(hx, handle.y + 200, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('[data-vaul-drawer]')).toHaveCount(0);
  await expect(page).not.toHaveURL(/view=exercises/);
  await expect(page.locator('#reps-value')).toBeVisible();
});

test('the exercise drawer also closes with Escape', async ({ page }) => {
  const workout = activeWorkout({ phase: 'lifting', open: 2 });
  await seed(page, appState({ active: workout }));
  await page.goto('/workout/');
  await page.goto('/workout/?view=exercises');
  await expect(page.locator('[data-vaul-drawer]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-vaul-drawer]')).toHaveCount(0);
});

test('opening and closing the drawer does not play a page transition', async ({ page }) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#reps-value')).toBeVisible();
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const counter = window as unknown as { transitions: number };
    counter.transitions = 0;
    const original = document.startViewTransition.bind(document);
    document.startViewTransition = ((arg: unknown) => {
      counter.transitions++;
      return original(arg as never);
    }) as typeof document.startViewTransition;
  });
  await page.locator('.stage-title-link').click();
  await expect(page.locator('[data-vaul-drawer]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-vaul-drawer]')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { transitions: number }).transitions),
  ).toBe(0);
});

test('closing the drawer with back slides it out instead of removing it', async ({ page }) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#reps-value')).toBeVisible();
  await page.waitForTimeout(800);
  await page.locator('.stage-title-link').click();
  await expect(page.locator('[data-vaul-drawer]')).toBeVisible();
  await page.waitForTimeout(700);
  await page.goBack();
  await expect(page).not.toHaveURL(/view=exercises/);
  // Still on screen mid-slide, then gone.
  await expect(page.locator('[data-vaul-drawer]')).toHaveCount(1);
  await expect(page.locator('[data-vaul-drawer]')).toHaveCount(0);
});

test('crossing the threshold vibrates each way, like a detent', async ({ page }) => {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    (window as unknown as { vibrations: unknown[] }).vibrations = calls;
    Object.defineProperty(navigator, 'vibrate', {
      value: (pattern: unknown) => calls.push(pattern) > 0,
      configurable: true,
    });
  });
  await openLifting(page);
  // Only the drag's own cues count, not the rest timer's that led here.
  await page.evaluate(() => {
    (window as unknown as { vibrations: unknown[] }).vibrations.length = 0;
  });
  const box = (await page.locator('.swipe-card').boundingBox())!;
  const y = box.y + 20;
  await page.mouse.move(box.x + box.width * 0.85, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, y, { steps: 6 });
  await expect(page.locator('.swipe-card')).toHaveAttribute('data-armed', 'true');
  await page.mouse.move(box.x + box.width * 0.8, y, { steps: 6 });
  await expect(page.locator('.swipe-card')).toHaveAttribute('data-armed', 'false');
  await page.mouse.up();
  const vibrations = await page.evaluate(
    () => (window as unknown as { vibrations: unknown[] }).vibrations,
  );
  expect(vibrations).toEqual([[30], [12]]);
  await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible();
});

test('swiping to log a set does not also play a page transition', async ({ page }) => {
  await openLifting(page);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const counter = window as unknown as { transitions: number };
    counter.transitions = 0;
    const original = document.startViewTransition.bind(document);
    document.startViewTransition = ((arg: unknown) => {
      counter.transitions++;
      return original(arg as never);
    }) as typeof document.startViewTransition;
  });
  await swipe(page, 0.85, 0.1);
  await expect(page.getByRole('timer', { name: /remaining/ })).toBeVisible();
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as unknown as { transitions: number }).transitions),
  ).toBe(0);
});

const entryAnimation = (page: Page) =>
  page.evaluate(
    () => getComputedStyle(document.querySelector('.swipe-sheet .workout-stage')!).animationName,
  );

async function openFirstSet(page: Page) {
  await seed(page, appState({ active: activeWorkout({ phase: 'lifting', open: 3 }) }));
  await page.goto('/workout/');
  await expect(page.getByRole('button', { name: 'Log set' })).toBeAttached();
  await page.waitForTimeout(1600);
}

test('a step reached by a button still eases in', async ({ page }) => {
  await openFirstSet(page);
  await page.getByRole('button', { name: 'Log set' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('timer', { name: 'Rest remaining' })).toBeVisible();
  expect(await entryAnimation(page)).toBe('stage-in');
});

test('the screen a swipe uncovers appears in place, without replaying its entry animation', async ({
  page,
}) => {
  await openFirstSet(page);
  await swipe(page, 0.85, 0.1);
  await expect(page.getByRole('timer', { name: 'Rest remaining' })).toBeVisible();
  expect(await entryAnimation(page)).toBe('none');
});

test('the exercise title opens the list only when the exercise can change', async ({ page }) => {
  await seed(page, appState({ history: [] }));
  await page.goto('/routine/?day=Monday');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Start' }).click();
  const edge = page.locator('a[href*="view=exercises"]');
  await expect(edge).toBeVisible();
  await page.waitForTimeout(800);
  await edge.click();
  await expect(page.locator('[data-vaul-drawer]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-vaul-drawer]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Log set' }).focus();
  await page.keyboard.press('Enter');
  await page.locator('#continue').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Log set' })).toBeAttached();
  await expect(page.locator('a[href*="view=exercises"]')).toHaveCount(0);
});
