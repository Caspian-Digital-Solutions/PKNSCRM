import { test, expect } from '@playwright/test';

test('body copy stays at least 16px', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /AMP Manager/ }).click();
  const size = await page.locator('body').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(16);
});
