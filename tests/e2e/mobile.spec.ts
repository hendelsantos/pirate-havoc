import { expect, test } from '@playwright/test';

test('touch controls are usable in mobile gameplay', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile project only.');
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: /Set sail/ }).click();
  await expect(page.getByRole('button', { name: 'Sail forward' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Sail forward' }).tap();
  await page.getByRole('button', { name: 'Fire forward' }).tap();
  await page.getByRole('button', { name: 'Left broadside' }).tap();
  await page.getByRole('button', { name: 'Right broadside' }).tap();
});

