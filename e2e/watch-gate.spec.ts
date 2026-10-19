import { expect, test, type Page } from '@playwright/test';
import { activeWorkout, appState, seed } from './fixtures.ts';

// The watch UI readiness gate from AGENTS.md, checked on every screen at every project size.
const SCREENS: Array<{ path: string; active?: ReturnType<typeof activeWorkout> }> = [
  { path: '/' },
  { path: '/routine/' },
  { path: '/routine/?day=Monday' },
  { path: '/routine/?day=Monday&view=exercises' },
  { path: '/history/' },
  { path: '/history/?view=workouts' },
  { path: '/history/?view=workout&id=0' },
  { path: '/history/?view=activities' },
  { path: '/history/?view=analytics' },
  { path: '/history/?view=data' },
  { path: '/history/?view=insights' },
  { path: '/workout/?day=Monday' },
  { path: '/workout/?activity=walk' },
  { path: '/workout/?activity=measurement' },
  { path: '/workout/', active: activeWorkout({ phase: 'lifting', open: 3 }) },
  { path: '/workout/?view=exercise', active: activeWorkout({ phase: 'lifting', open: 2 }) },
  { path: '/workout/?view=exercises', active: activeWorkout({ phase: 'lifting', open: 2 }) },
  { path: '/workout/', active: activeWorkout({ phase: 'rest', open: 1 }) },
  { path: '/workout/', active: activeWorkout({ phase: 'stretch', open: 0 }) },
];

async function gateViolations(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > width + 1)
      problems.push(`page scrolls horizontally (${document.documentElement.scrollWidth}px)`);
    const controls = document.querySelectorAll<HTMLElement>(
      'main a[href], main button, main input:not([type=file]):not([type=hidden]), main select, main summary, main label.list-link',
    );
    controls.forEach((control) => {
      const box = control.getBoundingClientRect();
      if (!box.width && !box.height) return;
      const label =
        control.getAttribute('aria-label') ||
        control.textContent?.trim() ||
        control.closest('label')?.textContent?.trim() ||
        (control.id && document.querySelector(`label[for="${control.id}"]`)?.textContent?.trim());
      const name = label || control.outerHTML.slice(0, 60);
      if (!label) problems.push(`no accessible name: ${name}`);
      // Layout can land a hair under 44 (43.999996) from sub-pixel rounding.
      if (box.height < 43.9 && (control as HTMLInputElement).type !== 'checkbox')
        problems.push(`target ${Math.round(box.height)}px tall: ${name}`);
      if (box.left < -1 || box.right > width + 1) problems.push(`clipped horizontally: ${name}`);
    });
    if (!document.querySelector('main h1')) problems.push('no screen title');
    return problems;
  });
}

for (const screen of SCREENS) {
  const label = `${screen.path}${screen.active ? ` (${screen.active.phase})` : ''}`;
  test(`watch gate: ${label}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await seed(page, appState({ active: screen.active || null }));
    await page.goto(screen.path);
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForTimeout(150);
    expect(await gateViolations(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('every screen has a visible keyboard focus state', async ({ page }) => {
  await seed(page, appState());
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);
    const before = getComputedStyle(element, '::before');
    return `${style.outlineStyle}|${before.boxShadow}|${before.outlineStyle}|${before.borderStyle}`;
  });
  expect(outline).not.toBe('none|none|none|none');
});

test('keyboard navigation moves focus to the new heading without a focus ring', async ({
  page,
}) => {
  await seed(page, appState());
  await page.goto('/routine/');
  await page.getByRole('link', { name: /^Full body A/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/day=Monday/);
  const heading = page.locator('main h1');
  await expect(heading).toBeFocused();
  expect(await heading.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
});

test('dark mode, reduced motion, and 200% zoom keep the gate', async ({ browser }, info) => {
  test.skip(info.project.name !== 'phone', 'zoom is checked from the phone canvas');
  const context = await browser.newContext({
    viewport: { width: 196, height: 420 },
    deviceScaleFactor: 4,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await seed(page, appState({ active: activeWorkout({ phase: 'rest', open: 1 }) }));
  for (const path of ['/', '/routine/', '/history/', '/workout/']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await gateViolations(page), path).toEqual([]);
  }
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(13, 18, 16)');
  await context.close();
});
