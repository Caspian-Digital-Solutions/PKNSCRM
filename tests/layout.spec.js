import { test, expect } from '@playwright/test';

const ROUTES = [
  ['Management', ['#/portfolio', '#/asset/kpsa', '#/marketing', '#/campaign/sa', '#/pipeline', '#/pipeline?layout=zones', '#/enquiries', '#/report', '#/visitors', '#/settings', '#/enquiry/ENQ-5001']],
  ['Leasing', ['#/pipeline', '#/enquiries']],
  ['Marketing', ['#/marketing', '#/campaign/sa']],
];

async function problems(page, width) {
  return page.evaluate((viewWidth) => {
    const out = [];
    const pages = [...document.querySelectorAll('.page')];
    for (const root of pages) {
      const children = [...root.children].filter((el) => el.getClientRects().length);
      const lefts = children.map((el) => Math.round(el.getBoundingClientRect().left));
      if (lefts.length > 1) {
        const base = lefts[0];
        lefts.forEach((left, index) => {
          if (Math.abs(left - base) > 1) out.push(`left ${left} vs ${base} <${children[index].className || children[index].tagName}>`);
        });
      }
    }
    const nodes = [...document.querySelectorAll('body *')].filter((el) => {
      if (!el.offsetWidth || !el.textContent.trim()) return false;
      if (el.closest('.sr-only')) return false;
      if (el.closest('.table-scroll, .lot-pop, .role-menu, .toaster, [hidden]')) return viewWidth >= 1512 ? !el.closest('.table-scroll') : false;
      return true;
    });
    for (const el of nodes) {
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        const style = getComputedStyle(el);
        const clipped = style.textOverflow === 'ellipsis' || (style.webkitLineClamp && style.webkitLineClamp !== 'none');
        if (!clipped) out.push(`overflow ${el.className || el.tagName} ${el.textContent.trim().slice(0, 24)}`);
      }
    }
    for (const el of document.querySelectorAll('.pill, .chip, .stage-pill, button')) {
      if (!el.offsetWidth) continue;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) {
        const text = textNode.textContent.trim();
        if (!text) continue;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const tops = new Set([...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => Math.round(rect.top)));
        if (tops.size > 1) {
          out.push(`wrap ${el.className || el.tagName} ${text.slice(0, 24)}`);
          break;
        }
      }
    }
    const clipOf = (el) => {
      let rect = el.getBoundingClientRect();
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        const clips = /(auto|scroll|hidden)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`);
        if (clips) {
          const box = parent.getBoundingClientRect();
          const left = Math.max(rect.left, box.left);
          const right = Math.min(rect.right, box.right);
          const top = Math.max(rect.top, box.top);
          const bottom = Math.min(rect.bottom, box.bottom);
          if (right - left < 1 || bottom - top < 1) return null;
          rect = { left, right, top, bottom };
        }
        parent = parent.parentElement;
      }
      return rect;
    };
    const boxes = [...document.querySelectorAll('p, h1, h2, h3, td, th, button, a, li, span')].filter((el) => el.offsetWidth && el.childElementCount === 0 && el.textContent.trim() && !el.closest('.sr-only'));
    const visible = boxes.map((el) => ({ el, rect: clipOf(el) })).filter((item) => item.rect);
    for (let i = 0; i < visible.length; i += 1) {
      const a = visible[i].rect;
      for (let j = i + 1; j < visible.length; j += 1) {
        if (visible[i].el.contains(visible[j].el) || visible[j].el.contains(visible[i].el)) continue;
        const b = visible[j].rect;
        const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overTop = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlap > 4 && overTop > 4) {
          out.push(`overlap ${visible[i].el.textContent.trim().slice(0, 16)} / ${visible[j].el.textContent.trim().slice(0, 16)}`);
          if (out.length > 12) return out;
        }
      }
    }
    const text = document.body.innerText || '';
    if (/\b0\d (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(text)) out.push('leading zero date');
    return out.slice(0, 12);
  }, width);
}

for (const [role, routes] of ROUTES) {
  test(`layout for ${role}`, async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(`^${role}`) }).click();
    for (const width of [1366, 1512]) {
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 805 });
      for (const route of routes) {
        await page.evaluate((hash) => { window.location.hash = hash.replace(/^#/, ''); }, route);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(80);
        expect(await problems(page, width), `${width} ${route}`).toEqual([]);
      }
    }
  });
}
