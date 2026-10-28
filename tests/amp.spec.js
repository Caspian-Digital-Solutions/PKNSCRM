import { test, expect } from '@playwright/test';

test('AMP Hub replaces the leasing screens', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'PKNS AMP Hub' })).toBeVisible();
  await page.getByRole('button', { name: /AMP Manager/ }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/sq ft|WhatsApp|ROAS|lease expir/i);
  await page.goto('/#/import');
  await expect(page.locator('body')).toContainText('13,214');
  await expect(page.locator('body')).toContainText('Consent unknown');
  await page.goto('/#/channels');
  await expect(page.locator('.sample-badge').first()).toBeVisible();
  await page.goto('/#/asset/pas');
  await expect(page.locator('body')).toContainText('Sample data, not connected');
  expect(errors).toEqual([]);
});
