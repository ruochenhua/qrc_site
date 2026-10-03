import { expect, test } from '@playwright/test';

test('integrates the live pixel town with the accessible portfolio homepage', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://127.0.0.1:4174/') && !url.startsWith('blob:')) externalRequests.push(url);
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('公会地图已就绪。');

  const guide = page.getByRole('dialog', { name: /欢迎来到黄昏公会/ });
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: '明白了，开始探索' }).click();
    await expect(guide).toBeHidden();
  }
  await page.locator('#world-host canvas').focus();

  await expect(page.locator('#world')).toBeVisible();
  await expect(page.locator('#world-host canvas')).toBeVisible();
  await expect(page.locator('#world-fallback')).toBeHidden();
  const bounds = await page.locator('#world-host').boundingBox();
  expect(bounds?.width).toBe(1440);
  expect(bounds?.height).toBe(1000);
  await expect(page.getByRole('link', { name: /CyberTravel/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /公会日志/ })).toHaveAttribute('href', '/dev-blog/index.html');
  await expect(page.locator('#world-fallback .world-project-card')).toHaveCount(4);
  await page.locator('#world-host').evaluate((host) => {
    host.dispatchEvent(new CustomEvent('qrc-world:select', { detail: { id: 'cybertravel' } }));
  });
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'CyberTravel' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: '试玩项目' })).toHaveAttribute('href', '/cybertravel/index.html');
  await dialog.getByRole('button', { name: '关闭项目介绍' }).click();
  await expect(page.locator('#world-host canvas')).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(async () => {
    const resized = await page.locator('#world-host').boundingBox();
    return [resized?.width, resized?.height];
  }).toEqual([1280, 720]);
  await expect(page.getByRole('link', { name: /CyberTravel/ })).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});

test('keeps the project shelf usable when the world runtime is unavailable', async ({ page }) => {
  await page.route('**/assets/world/runtime/world.js', (route) => route.abort());
  await page.goto('/');

  await expect(page.getByRole('status')).toHaveText('小镇暂不可用，下方作品入口仍可正常使用。');
  await expect(page.locator('#world-host canvas')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /CyberTravel/ })).toBeVisible();
  await page.getByRole('button', { name: /王土之下/ }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: '王土之下' })).toBeVisible();
});

test('keeps semantic portfolio content available with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/');

  await expect(page.locator('#world-fallback')).toBeVisible();
  await expect(page.getByText(/互动场景需要启用 JavaScript/)).toBeVisible();
  await expect(page.getByRole('link', { name: /CyberTravel/ })).toHaveAttribute('href', '/cybertravel/index.html');
  await expect(page.getByRole('link', { name: /查看公会日志/ })).toHaveAttribute('href', '/dev-blog/index.html');
  await expect(page.locator('#world-host canvas')).toHaveCount(0);
  await context.close();
});

test('shows a readable fallback when a required pixel atlas fails to load', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/assets/world/runtime/assets/world-tiles-*.png', (route) => route.abort());
  await page.goto('/');

  await expect(page.getByRole('status')).toHaveText('小镇暂不可用，下方作品入口仍可正常使用。');
  await expect(page.getByRole('link', { name: /CyberTravel/ })).toBeVisible();
  await expect(page.locator('#world-host canvas')).toBeHidden();
  await page.waitForTimeout(150);
  expect(pageErrors).toEqual([]);
});

test('fits narrow mobile screens and keeps the full-screen world usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');

  await expect(page.locator('#world-host canvas')).toBeVisible();
  const bounds = await page.locator('#world-host').boundingBox();
  expect(bounds?.width).toBe(320);
  expect(bounds?.height).toBe(740);
  await expect(page.locator('#world-fallback')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await expect(page.getByRole('link', { name: /公会日志/ })).toHaveAttribute('href', '/dev-blog/index.html');
});
