import { test, expect } from '@playwright/test';

test('public form is bilingual and creates a profile', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /AMP Manager/ }).click();
  await page.goto('/#/activations/new');
  await page.locator('form.dialog-form input').first().fill('Storyline Activation');
  await page.locator('form.dialog-form button[type="submit"]').click();
  await expect(page.getByText('cannot be removed')).toBeVisible();
  const formId = decodeURIComponent(page.url().split('#/form/')[1] || '').split('?')[0];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/#/f/${formId}`);
  await page.getByRole('button', { name: 'BM', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hantar' })).toBeVisible();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  const inputs = page.locator('form input[type="text"]');
  await inputs.nth(0).fill('Storyline Person');
  await inputs.nth(1).fill('0188877665');
  await page.locator('.consent-pin input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible();
});
