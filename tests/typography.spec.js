import { test, expect } from '@playwright/test';

const ALLOWED = ['13px', '14px', '15px', '16px', '20px', '24px', '28px', '32px', '40px'];

const ROUTES = {
  Management: ['#/portfolio', '#/asset/kpsa', '#/marketing', '#/campaign/sa', '#/pipeline', '#/report', '#/visitors', '#/settings', '#/enquiry/ENQ-1001'],
  Leasing: ['#/portfolio', '#/asset/kpsa', '#/campaign/sa', '#/pipeline', '#/enquiry/ENQ-1001'],
  Marketing: ['#/portfolio', '#/asset/kpsa', '#/marketing', '#/campaign/sa', '#/pipeline', '#/report', '#/visitors', '#/enquiry/ENQ-1001'],
};

async function offenders(page) {
  return page.evaluate((allowed) => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      const text = node.textContent.trim();
      if (!text || !el || !el.offsetWidth || el.closest('[data-allow-type]')) continue;
      const style = getComputedStyle(el);
      const family = style.fontFamily || '';
      const badFamily = !/Inter/i.test(family) || /Barlow|Source Sans/i.test(family);
      const badSize = !allowed.includes(style.fontSize);
      const badWeight = !['400', '600'].includes(style.fontWeight);
      const underline = style.textDecorationLine.includes('underline');
      if (badFamily || badSize || badWeight || underline) {
        out.push(`${style.fontSize}/${style.fontWeight} ${family} ${underline ? 'underline ' : ''}${text.slice(0, 40)}`);
      }
    }
    const controls = [...document.querySelectorAll('button, input, select')];
    for (const el of controls) {
      if (!el.offsetWidth || el.closest('.lot, .role-card, .role-menu, .role-btn, .step-btn, [data-allow-type]')) continue;
      if (el.matches('input[type="checkbox"], input[type="radio"], input[type="file"]')) continue;
      const height = Math.round(parseFloat(getComputedStyle(el).height));
      if (![32, 36, 40].includes(height)) out.push(`height ${height}px <${el.tagName.toLowerCase()} ${el.getAttribute('aria-label') || el.textContent.trim().slice(0, 24)}>`);
    }
    return out.slice(0, 30);
  }, ALLOWED);
}

for (const [role, routes] of Object.entries(ROUTES)) {
  test(`type scale for ${role}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1512, height: 861 });
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(`^${role}`) }).click();
    for (const width of [1512, 1920]) {
    await page.setViewportSize({ width, height: width === 1512 ? 861 : 1080 });
    for (const route of routes) {
      await page.evaluate((hash) => { window.location.hash = hash.replace(/^#/, ''); }, route);
      await page.waitForTimeout(80);
      expect(await offenders(page), `${width} ${route}`).toEqual([]);
    }
    await page.locator('.search-btn').click();
    expect(await offenders(page), 'palette').toEqual([]);
    await page.keyboard.press('Escape');
    await page.keyboard.press('?');
    expect(await offenders(page), 'shortcuts').toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Notifications' }).click();
    expect(await offenders(page), 'notifications').toEqual([]);
    }
  });
}
