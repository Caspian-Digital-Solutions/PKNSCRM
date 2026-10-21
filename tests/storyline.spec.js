import { test, expect } from '@playwright/test';

const CALL = 'Called Encik Faizal; wants 1,200 sq ft office, viewing this week';

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) errors.push(msg.text());
  });
  return errors;
}

async function login(page, role) {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(`^${role}`) }).click();
}

async function switchRole(page, role) {
  await page.locator('.role-btn').click();
  await page.getByRole('menuitem', { name: new RegExp(role) }).click();
}

async function openNav(page, name) {
  await page.locator('nav.sidenav').getByRole('link', { name, exact: true }).click();
}

async function expectKpi(page, id, text) {
  await expect(page.getByTestId(id)).toContainText(text);
}

async function pageOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test('storyline figures from portfolio through reset', async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page, 'Management');

  await expect(page.getByRole('heading', { name: 'Portfolio overview' })).toBeVisible();
  await expect(page.locator('.month-select select')).toHaveValue('2026-10');
  await expectKpi(page, 'kpi-assets', '12');
  await expectKpi(page, 'kpi-units', '838');
  await expectKpi(page, 'kpi-occupied', '549');
  await expectKpi(page, 'kpi-reserved', '31');
  await expectKpi(page, 'kpi-vacant', '108');
  await expectKpi(page, 'kpi-redev', '150');
  await expectKpi(page, 'kpi-occupancy', '79.8%');
  await expectKpi(page, 'kpi-enquiries', '282');
  await expectKpi(page, 'kpi-spend', 'RM34,206');
  await expectKpi(page, 'kpi-cpl', 'RM121.30');
  await expectKpi(page, 'kpi-roas', '12.4x');
  await expectKpi(page, 'kpi-fyv', 'RM424,080');
  await expectKpi(page, 'kpi-new-leases', '9');
  const vacantHeader = page.getByRole('button', { name: 'Vacant', exact: true });
  await vacantHeader.click();
  await vacantHeader.click();
  await expect(page.locator('.data-table tbody tr').first()).toContainText('Kompleks PKNS Shah Alam');

  await switchRole(page, 'Marketing');
  await expect(page.getByRole('heading', { name: 'Marketing dashboard' })).toBeVisible();
  await page.getByRole('tab', { name: 'Website' }).click();
  await expect(page.getByTestId('sample-heatmap')).toContainText('Sample');
  await page.getByRole('tab', { name: 'Social' }).click();
  await expect(page.getByTestId('followers-pkns-fb')).toContainText('55,200');
  await expect(page.getByTestId('followers-pkns-ig')).toContainText('9,650');
  await expect(page.getByRole('heading', { name: 'Organic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paid' })).toBeVisible();
  await page.getByRole('tab', { name: 'Google Ads' }).click();
  await expectKpi(page, 'google-spend', 'RM14,500');
  await expectKpi(page, 'google-ctr', '3.8%');
  await expectKpi(page, 'google-cpc', 'RM1.41');

  await openNav(page, 'Campaigns');
  await expectKpi(page, 'campaign-enquiries', '420');
  await expectKpi(page, 'campaign-viewings', '96');
  await expectKpi(page, 'campaign-signed', '14');
  await expectKpi(page, 'campaign-cpl', 'RM114.29');
  await expectKpi(page, 'campaign-roas', '12.6x');
  const facebook = page.locator('tr', { hasText: 'Facebook lead ads' });
  const google = page.locator('tr', { hasText: 'Google Ads' });
  await expect(facebook).toContainText('210');
  await expect(facebook).toContainText('RM3,200.00');
  await expect(google).toContainText('RM3,360.00');

  await switchRole(page, 'Leasing');
  await openNav(page, 'Enquiries');
  await expect(page.getByTestId('count-New')).toContainText('18');
  await expect(page.getByTestId('count-Signed')).toContainText('9');
  await page.getByTestId('simulate-enquiry').click();
  await expect(page.getByTestId('count-New')).toContainText('19');
  await expect(page.getByTestId('hero-card')).toContainText('Teras Niaga Consulting Sdn Bhd');
  await expect(page.getByTestId('hero-card')).toContainText('4-07');
  await page.getByTestId('hero-card').getByRole('link').click();

  await page.getByRole('tab', { name: 'Call' }).click();
  await page.getByRole('textbox', { name: 'Entry' }).fill(CALL);
  await page.locator('.composer').getByRole('button', { name: 'Log call' }).click();
  await expect(page.locator('.log')).toContainText(CALL);
  await page.getByRole('button', { name: 'Contacted', exact: true }).click();
  await expect(page.getByTestId('first-response')).not.toContainText('–');
  await page.reload();
  await expect(page).toHaveURL(/#\/enquiry\/ENQ-HERO/);
  await expect(page.locator('.log')).toContainText(CALL);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Teras Niaga Consulting');
  await expect(page.locator('.lead')).toContainText('Contacted');

  await page.getByRole('button', { name: 'Qualified', exact: true }).click();
  await page.getByRole('tab', { name: 'Viewing' }).click();
  await page.getByRole('textbox', { name: 'Entry' }).fill('Viewing booked for this week.');
  await page.locator('.composer').getByRole('button', { name: 'Schedule viewing' }).click();
  await page.getByRole('button', { name: 'Viewing Scheduled', exact: true }).click();
  await page.getByRole('button', { name: 'Negotiation', exact: true }).click();
  await expect(page.getByTestId('unit-status')).toHaveText('Reserved');
  await page.getByRole('button', { name: 'Signed', exact: true }).click();
  await expect(page.locator('.modal input[name="rent"]')).toHaveValue('3360');
  await expect(page.locator('.modal input[name="start"]')).toHaveValue('2026-12-01');
  await page.getByRole('button', { name: 'Mark as signed' }).click();
  await expect(page.getByTestId('unit-status')).toHaveText('Occupied');

  await page.getByRole('link', { name: 'Back to campaign' }).click();
  await expectKpi(page, 'campaign-enquiries', '421');
  await expectKpi(page, 'campaign-viewings', '97');
  await expectKpi(page, 'campaign-signed', '15');
  await expectKpi(page, 'campaign-cpl', 'RM114.01');
  await expectKpi(page, 'campaign-cps', 'RM3,200.00');
  await expectKpi(page, 'campaign-roas', '13.4x');
  await expect(facebook).toContainText('211');
  await expect(facebook).toContainText('42');

  await openNav(page, 'Assets');
  await expect(page.getByTestId('lot-4-07')).toBeVisible();
  await expect(page.getByTestId('lot-status')).toHaveText('Occupied');

  await openNav(page, 'Overview');
  await expectKpi(page, 'kpi-occupancy', '79.9%');
  await expectKpi(page, 'kpi-occupied', '550');
  await expectKpi(page, 'kpi-vacant', '107');
  await expectKpi(page, 'kpi-enquiries', '283');
  await expectKpi(page, 'kpi-new-leases', '10');

  await switchRole(page, 'Management');
  await openNav(page, 'Reports');
  await expect(page.getByTestId('report-spend')).toHaveText('RM34,206');
  await expect(page.getByTestId('report-paid-enquiries')).toHaveText('283');
  await expect(page.getByTestId('report-cpl')).toHaveText('RM120.87');
  await expect(page.getByTestId('report-signed')).toHaveText('10');
  await expect(page.getByTestId('report-roas')).toHaveText('13.6x');
  await expect(page.getByTestId('definitions')).toContainText('Residential references are indicative only and not shown as targets.');
  const [excel] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-excel').click(),
  ]);
  expect(excel.suggestedFilename()).toMatch(/\.xlsx$/);
  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-pdf').click(),
  ]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

  await openNav(page, 'Settings');
  await page.getByTestId('fill-sitc').click();
  await expect(page.getByTestId('space-row')).toHaveCount(3);
  await page.getByTestId('save-asset').click();
  await expect(page.getByTestId('asset-saved')).toContainText('Selangor International Trade Centre');
  await page.getByRole('link', { name: 'View on the portfolio' }).click();
  await expectKpi(page, 'kpi-assets', '13');
  await expectKpi(page, 'kpi-units', '838');
  await expectKpi(page, 'kpi-occupancy', '79.9%');
  await expect(page.locator('.data-table')).toContainText('SITC');

  await switchRole(page, 'Marketing');
  await openNav(page, 'Visitors');
  await expect(page.getByTestId('visitors-banner')).toHaveText("Future phase: connects to PKNS's visitor counting system when installed. Figures below are illustrative.");

  await switchRole(page, 'Management');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Portfolio overview' })).toBeVisible();
  await expectKpi(page, 'kpi-assets', '12');
  await expectKpi(page, 'kpi-units', '838');
  await expectKpi(page, 'kpi-occupied', '549');
  await expectKpi(page, 'kpi-vacant', '108');
  await expectKpi(page, 'kpi-occupancy', '79.8%');
  await expectKpi(page, 'kpi-enquiries', '282');
  await expectKpi(page, 'kpi-new-leases', '9');
  await expect(page.locator('.data-table')).not.toContainText('SITC');
  await openNav(page, 'Campaigns');
  await expectKpi(page, 'campaign-enquiries', '420');
  await expectKpi(page, 'campaign-signed', '14');
  await expectKpi(page, 'campaign-cpl', 'RM114.29');
  await expectKpi(page, 'campaign-roas', '12.6x');
  await openNav(page, 'Enquiries');
  await expect(page.getByTestId('count-New')).toContainText('18');
  await expect(page.getByTestId('count-Signed')).toContainText('9');
  await expect(page.getByTestId('hero-card')).toHaveCount(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('layout, reload and the reset shortcut', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, 'Management');

  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const screens = [
      ['Overview', 'portfolio'],
      ['Assets', 'asset'],
      ['Marketing', 'marketing'],
      ['Campaigns', 'campaign'],
      ['Enquiries', 'pipeline'],
      ['Reports', 'report'],
      ['Visitors', 'visitors'],
      ['Settings', 'settings'],
    ];
    for (const [name] of screens) {
      await openNav(page, name);
      expect(await pageOverflow(page), `${name} at ${viewport.width}`).toBe(0);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await openNav(page, 'Overview');
  await expect(page.getByRole('button', { name: 'Asset', exact: true })).toBeVisible();
  const table = page.locator('main .table-scroll');
  await expect.poll(async () => table.evaluate((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)).toBe(true);
  const stuck = await table.evaluate((el) => {
    const th = el.querySelector('th');
    const before = th.getBoundingClientRect().left - el.getBoundingClientRect().left;
    el.scrollLeft = 200;
    const after = th.getBoundingClientRect().left - el.getBoundingClientRect().left;
    return {
      position: getComputedStyle(th).getPropertyValue('position'),
      before,
      after,
    };
  });
  expect(stuck.position, JSON.stringify(stuck)).toBe('sticky');
  expect(Math.abs(stuck.after - stuck.before)).toBeLessThanOrEqual(1);
  expect(await pageOverflow(page)).toBe(0);

  await openNav(page, 'Campaigns');
  for (const width of [1440, 1512]) {
    await page.setViewportSize({ width, height: 900 });
    const channel = page.locator('.channel-fit');
    const channelFits = await channel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(channelFits, `channel table at ${width}`).toBe(true);
    const roas = await channel.getByRole('columnheader', { name: 'ROAS' }).boundingBox();
    expect(roas.x + roas.width).toBeLessThanOrEqual(width + 1);
    expect(await pageOverflow(page), `campaigns page at ${width}`).toBe(0);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await openNav(page, 'Enquiries');
  const boardFits = await page.locator('.board').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  expect(boardFits).toBe(true);
  const lost = await page.getByTestId('column-Lost').boundingBox();
  expect(lost.x + lost.width).toBeLessThanOrEqual(1440 + 1);
  expect(await pageOverflow(page)).toBe(0);

  await openNav(page, 'Assets');
  const lotsFit = await page.getByTestId('lot-grid').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  expect(lotsFit).toBe(true);
  await expect(page.locator('.lot')).toHaveCount(120);
  await page.getByTestId('asset-select').selectOption('pas');
  await expect(page.locator('.lot')).toHaveCount(180);
  const pasLotsFit = await page.getByTestId('lot-grid').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  expect(pasLotsFit).toBe(true);
  expect(await pageOverflow(page)).toBe(0);

  await switchRole(page, 'Leasing');
  await openNav(page, 'Enquiries');
  await page.getByTestId('simulate-enquiry').click();
  await page.getByTestId('hero-card').getByRole('link').click();
  await page.getByRole('textbox', { name: 'Entry' }).fill('Shortcut note');
  await page.locator('.composer').getByRole('button', { name: 'Log call' }).click();
  await expect(page.locator('.log')).toContainText('Shortcut note');
  const enquiryUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(enquiryUrl);
  await expect(page.locator('.log')).toContainText('Shortcut note');

  // Settings is management-only. Leasing is sent back to Asset detail.
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Asset detail' })).toBeVisible();

  await switchRole(page, 'Management');
  await openNav(page, 'Settings');
  await page.getByTestId('fill-sitc').click();
  await page.getByTestId('save-asset').click();
  await expect(page.getByTestId('asset-saved')).toBeVisible();
  await page.keyboard.press('Alt+Shift+KeyR');
  await expect(page.getByRole('heading', { name: 'Portfolio overview' })).toBeVisible();
  await expectKpi(page, 'kpi-assets', '12');
  await expectKpi(page, 'kpi-occupancy', '79.8%');
  await expect(page.locator('.data-table')).not.toContainText('SITC');
  await openNav(page, 'Enquiries');
  await expect(page.getByTestId('hero-card')).toHaveCount(0);
  await expect(page.getByTestId('count-New')).toContainText('18');

  expect(errors, errors.join('\n')).toEqual([]);
});
