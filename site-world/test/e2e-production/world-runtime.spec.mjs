import { expect, test } from '@playwright/test';

test('loads the built same-origin runtime and keeps a real project link', async ({ page }) => {
  const externalRequests = [];
  const worldAssets = [];
  const activityRequests = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4174/') && !request.url().startsWith('blob:')) externalRequests.push(request.url());
    if (request.url().includes('/assets/world/runtime/assets/')) worldAssets.push(new URL(request.url()).pathname);
    if (request.url().includes('mini-fireworks')) activityRequests.push(request.url());
  });

  await page.goto('/site-world/test/fixtures/production-host.html');

  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('生产场景已载入');
  await expect(page.getByRole('link', { name: 'CyberTravel' })).toHaveAttribute('href', '/cybertravel/index.html');
  expect(externalRequests).toEqual([]);
  expect(worldAssets.filter((url) => /\.(png|webp)$/.test(url))).toHaveLength(3);
  expect(worldAssets.filter((url) => url.endsWith('.json'))).toHaveLength(1);
  expect(activityRequests).toEqual([]);

  const host = page.locator('#world-host');
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error('World host has no layout box.');
  const scale = bounds.width / 640;
  const cameraX = Number(await host.getAttribute('data-camera-x'));
  const cameraY = Number(await host.getAttribute('data-camera-y'));
  const travelX = bounds.x + (195 - cameraX) * scale;
  const travelY = bounds.y + (168 - cameraY) * scale;
  await page.mouse.move(travelX, travelY);
  const hovercard = page.getByRole('tooltip');
  await expect(host).toHaveAttribute('data-hovered-project', 'cybertravel');
  await expect(hovercard).toContainText('在川藏线上当骑行网红，看看能走多远。');
  await page.mouse.click(travelX, travelY);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'CyberTravel' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: '试玩项目' })).toHaveAttribute('href', '/cybertravel/index.html');
  await dialog.getByRole('button', { name: '关闭项目介绍' }).click();
  await expect(dialog).toBeHidden();
  await page.locator('canvas').scrollIntoViewIfNeeded();

  const fireworkBounds = await host.boundingBox();
  if (!fireworkBounds) throw new Error('World host has no layout box after closing the project card.');
  const fireworkScale = fireworkBounds.width / 640;
  const fireworkCameraX = Number(await host.getAttribute('data-camera-x'));
  const fireworkCameraY = Number(await host.getAttribute('data-camera-y'));
  const fireworkX = fireworkBounds.x + (648 - fireworkCameraX) * fireworkScale;
  const fireworkY = fireworkBounds.y + (172 - fireworkCameraY) * fireworkScale;
  await page.mouse.move(fireworkX, fireworkY);
  await expect(host).toHaveAttribute('data-hovered-project', 'firework-master');
  await expect(hovercard).toContainText('收集配方、编排节目单，在夜空中绽放属于你的烟花秀。');
  await page.mouse.click(fireworkX, fireworkY);
  await expect(host).toHaveAttribute('data-selected-project', 'firework-master');
  await expect(dialog.getByRole('heading', { name: '烟花大师' })).toBeVisible();
  expect(activityRequests).toEqual([]);
  await dialog.getByRole('button', { name: '试放一枚烟花' }).click();
  await expect(dialog.getByRole('heading', { name: '烟花试放' })).toBeVisible();
  await expect.poll(() => activityRequests.length).toBeGreaterThan(0);
});

test('shows the static project link when the production entry is blocked', async ({ page }) => {
  await page.route('**/assets/world/runtime/world.js', (route) => route.abort());
  await page.goto('/site-world/test/fixtures/production-host.html');

  await expect(page.getByRole('status')).toHaveText('场景暂不可用，请使用下方项目入口');
  await expect(page.getByRole('link', { name: 'CyberTravel' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
