import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
});

test('paginates deterministic ranking fixtures', async ({ page }) => {
  await expect(page.getByRole('cell', { name: 'Sea Wolf' })).toBeVisible();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
});

test('shows empty ranking scenario', async ({ page }) => {
  await page.getByText('Network scenario tools').click();
  await page.getByLabel('Scenario').selectOption('empty');
  await expect(page.getByText('No records found for this fleet configuration.')).toBeVisible();
});

test('recovers from ranking retrieval failure', async ({ page }) => {
  await page.getByText('Network scenario tools').click();
  await page.getByLabel('Scenario').selectOption('ranking-failure');
  await expect(page.getByText('Records are unavailable. Gameplay remains ready.')).toBeVisible();
  await page.getByLabel('Scenario').selectOption('success');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('cell', { name: 'Sea Wolf' })).toBeVisible();
});

test('history tab exposes empty state for a new local captain', async ({ page }) => {
  await page.getByRole('tab', { name: 'Match history' }).click();
  await expect(page.getByText('No records found for this fleet configuration.')).toBeVisible();
});

