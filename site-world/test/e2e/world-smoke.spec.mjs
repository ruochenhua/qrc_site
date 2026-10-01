import { expect, test } from '@playwright/test';

test('mounts the Phaser canvas without hiding static project links', async ({ page }) => {
  await page.goto('/test/fixtures/world-host.html');

  await expect(page.locator('#world-host')).toHaveAttribute('data-world-ready', 'true');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('场景已载入');
  await expect(page.getByRole('link', { name: 'CyberTravel' })).toBeVisible();
  await expect(page.locator('#world-host')).toHaveAttribute('data-anchor-count', '5');
});

test('moves with normalized keyboard input and does not pass through the fence', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/test/fixtures/world-host.html');
  const host = page.locator('#world-host');
  await expect(host).toHaveAttribute('data-world-ready', 'true');
  const startX = Number(await host.getAttribute('data-player-x'));
  const idleFrame = await host.getAttribute('data-player-frame');

  await page.locator('canvas').click();
  await page.keyboard.down('d');
  await page.waitForTimeout(800);
  await page.keyboard.up('d');
  const blockedX = Number(await host.getAttribute('data-player-x'));
  expect(blockedX).toBeGreaterThan(startX);
  expect(blockedX).toBeLessThan(420);
  expect(await host.getAttribute('data-player-frame')).not.toBe(idleFrame);

  await page.keyboard.down('a');
  await page.waitForTimeout(350);
  await page.keyboard.up('a');
  await expect(host).toHaveAttribute('data-player-facing', 'left');
  expect(Number(await host.getAttribute('data-player-x'))).toBeLessThan(blockedX);

  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowUp');
  await expect(host).toHaveAttribute('data-player-facing', 'up');
});

test('clicking a project object emits exactly one selection event', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/test/fixtures/world-host.html');
  const host = page.locator('#world-host');
  await expect(host).toHaveAttribute('data-world-ready', 'true');
  await page.waitForTimeout(600);
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error('World host has no layout box.');
  const scale = bounds.width / 640;
  const scrollX = Number(await host.getAttribute('data-camera-x'));
  const scrollY = Number(await host.getAttribute('data-camera-y'));
  await page.mouse.click(bounds.x + (160 - scrollX) * scale, bounds.y + (224 - scrollY) * scale);
  await expect(host).toHaveAttribute('data-selected-id', 'cybertravel');
  await expect(host).toHaveAttribute('data-select-source', 'pointer');
  await expect(host).toHaveAttribute('data-select-count', '1');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'CyberTravel' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: '试玩项目' })).toHaveAttribute('href', '/cybertravel/index.html');
  await dialog.getByRole('button', { name: '关闭项目介绍' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('canvas')).toBeFocused();
});

test('shows a panel-only planned project without a broken play link', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/test/fixtures/world-host.html');
  const host = page.locator('#world-host');
  await expect(host).toHaveAttribute('data-world-ready', 'true');
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error('World host has no layout box.');
  const scale = bounds.width / 640;
  const scrollX = Number(await host.getAttribute('data-camera-x'));
  const scrollY = Number(await host.getAttribute('data-camera-y'));
  await page.mouse.click(bounds.x + (608 - scrollX) * scale, bounds.y + (376 - scrollY) * scale);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '王土之下' })).toBeVisible();
  await expect(dialog.getByText('制作中')).toBeVisible();
  await expect(dialog.getByRole('link')).toHaveCount(0);
});

test('loads the firework activity only after its preview button is activated', async ({ page }) => {
  const activityRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('mini-fireworks')) activityRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/test/fixtures/world-host.html');
  const host = page.locator('#world-host');
  await expect(host).toHaveAttribute('data-world-ready', 'true');
  expect(activityRequests).toEqual([]);
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error('World host has no layout box.');
  const scale = bounds.width / 640;
  const scrollX = Number(await host.getAttribute('data-camera-x'));
  const scrollY = Number(await host.getAttribute('data-camera-y'));
  await page.mouse.click(bounds.x + (608 - scrollX) * scale, bounds.y + (120 - scrollY) * scale);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '烟花大师' })).toBeVisible();
  expect(activityRequests).toEqual([]);
  await dialog.getByRole('button', { name: '试放一枚烟花' }).click();
  await expect(dialog.getByRole('heading', { name: '烟花试放' })).toBeVisible();
  await expect.poll(() => activityRequests.length).toBeGreaterThan(0);
  await dialog.getByRole('button', { name: '点亮一枚' }).click();
  await expect(dialog.getByRole('status')).toHaveText('烟花升空，在夜色里绽开。');
  await dialog.getByRole('button', { name: '返回项目介绍' }).click();
  await expect(dialog.getByRole('heading', { name: '烟花大师' })).toBeVisible();
});

test('E interacts with a nearby place and form focus does not move the player', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/test/fixtures/world-host.html');
  const host = page.locator('#world-host');
  await expect(host).toHaveAttribute('data-world-ready', 'true');
  await page.locator('canvas').click();
  await page.keyboard.down('a');
  await page.waitForTimeout(1600);
  await page.keyboard.up('a');
  await expect(host).toHaveAttribute('data-nearby-id', 'cybertravel');
  await page.keyboard.down('e');
  await page.waitForTimeout(80);
  await page.keyboard.up('e');
  await expect(host).toHaveAttribute('data-selected-id', 'cybertravel');
  await expect(host).toHaveAttribute('data-select-source', 'keyboard');
  await page.keyboard.down('Enter');
  await page.waitForTimeout(80);
  await page.keyboard.up('Enter');
  await expect(host).toHaveAttribute('data-select-count', '2');
  await page.keyboard.down('Escape');
  await page.waitForTimeout(80);
  await page.keyboard.up('Escape');
  await expect(host).toHaveAttribute('data-close-count', '1');

  const xBeforeTyping = await host.getAttribute('data-player-x');
  const note = page.getByRole('textbox', { name: '文本输入焦点测试' });
  await note.focus();
  await page.keyboard.down('d');
  await page.waitForTimeout(240);
  await page.keyboard.up('d');
  await expect(note).toHaveValue('d');
  await expect(host).toHaveAttribute('data-player-x', xBeforeTyping);
});

test('touching a project object uses the same pointer interaction path', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/test/fixtures/world-host.html');
  const host = page.locator('#world-host');
  await expect(host).toHaveAttribute('data-world-ready', 'true');
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error('World host has no layout box.');
  const scale = bounds.width / 640;
  const scrollX = Number(await host.getAttribute('data-camera-x'));
  const scrollY = Number(await host.getAttribute('data-camera-y'));
  await page.touchscreen.tap(bounds.x + (160 - scrollX) * scale, bounds.y + (224 - scrollY) * scale);
  await expect(host).toHaveAttribute('data-selected-id', 'cybertravel');
  await expect(host).toHaveAttribute('data-select-source', 'pointer');
  await expect(host).toHaveAttribute('data-select-count', '1');
  await context.close();
});

test('reduced-motion preference is detected and the mobile viewport retains the static entry', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/test/fixtures/world-host.html');

  await expect(page.locator('#world-host')).toHaveAttribute('data-world-ready', 'true');
  await expect(page.locator('#world-host')).toHaveAttribute('data-reduced-motion', 'true');
  await expect(page.getByRole('link', { name: 'CyberTravel' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('keeps the stage inside narrow, tablet, desktop, and wide viewports', async ({ page }) => {
  await page.goto('/test/fixtures/world-host.html');
  await expect(page.locator('#world-host')).toHaveAttribute('data-world-ready', 'true');

  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'CyberTravel' })).toBeVisible();
  }
});

test('keeps the static project entry available when the world module fails', async ({ page }) => {
  await page.route('**/src/bootstrap/main.ts**', (route) => route.abort());
  await page.goto('/test/fixtures/world-host.html');

  await expect(page.getByRole('status')).toHaveText('场景暂不可用，请使用下方项目入口');
  await expect(page.getByRole('link', { name: 'CyberTravel' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
