import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
});

test('navigates to options and persists validated settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByRole('heading', { name: 'Battle options' })).toBeVisible();
  await page.getByLabel(/Game session time/).fill('180');
  await page.getByLabel(/Enemy spawn time/).fill('6');
  await page.getByRole('button', { name: 'Save options' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel(/Game session time/)).toHaveValue('180');
  await expect(page.getByLabel(/Enemy spawn time/)).toHaveValue('6');
});

test('starts, pauses, resumes, and abandons a match', async ({ page }) => {
  await page.getByRole('button', { name: 'Set sail Start a new battle' }).click();
  await expect(page.getByTestId('game-viewport')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause match' })).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Match paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume battle' }).click();
  await page.getByRole('button', { name: 'Abandon match and return to menu' }).click();
  await expect(page.getByRole('button', { name: /Set sail/ })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('pirate-havoc:pending:v1'))).toBeNull();
});

test('shows asset failure and retry UI', async ({ page }) => {
  await page.goto('/?assetFailure=1');
  await page.getByRole('button', { name: /Set sail/ }).click();
  await expect(page.getByRole('heading', { name: 'Assets failed to load' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry loading' }).click();
  await expect(page.getByRole('button', { name: 'Pause match' })).toBeVisible({ timeout: 15_000 });
});

test('menu has an accessible visual baseline', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop baseline only.');
  await expect(page).toHaveScreenshot('main-menu.png', { animations: 'disabled', fullPage: true });
});

