import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const root = path.dirname(fileURLToPath(import.meta.url));

test('waters, collects a leaf, composes a card and leaves it for the next visitor', async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '赛博发财树' })).toBeVisible();
  await expect(page.locator('#world-scene')).toBeVisible();
  await expect(page.getByRole('button', { name: '浇一杯水' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect.poll(() => page.locator('#leaf-wall [data-testid="leaf-card"]').count()).toBeGreaterThanOrEqual(6);
  await expect.poll(() => page.locator('#leaf-wall [data-testid="leaf-card"]').count()).toBeLessThanOrEqual(10);

  const waterButton = page.getByRole('button', { name: '浇一杯水' });
  await waterButton.focus();
  await expect(waterButton).toBeFocused();
  const wateringResponse = page.waitForResponse((response) => response.url().endsWith('/api/water') && response.status() === 201);
  await page.keyboard.press('Enter');
  const wateringReceipt = await (await wateringResponse).json();
  await expect(page.locator('#milestone-remaining')).toHaveText(String(wateringReceipt.nextMilestone.remaining));
  await expect(page.locator('#presence-line')).toContainText(/此刻 [1-9]\d* 人在浇水/);
  await expect(page.getByRole('region', { name: '收到一张来信' })).toBeVisible();
  await expect(page.getByRole('button', { name: '收下这张叶笺' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存这张海报' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^leaf-.*\.png$/);
  await page.getByRole('button', { name: '收下这张叶笺' }).click();

  await expect(page.getByRole('region', { name: '给下一位留一张' })).toBeVisible();
  await page.locator('#poster-choices').getByRole('button', { name: /晒到太阳/ }).click();
  await page.getByLabel('短句对象').selectOption('worker');
  await page.getByLabel('短句结尾').selectOption('clock-out');
  await expect(page.getByTestId('phrase-preview')).toHaveText('今天的打工人，也值得早点下班。');
  const publishedResponse = page.waitForResponse((response) => response.url().endsWith('/api/leaves') && response.status() === 201);
  await page.getByRole('button', { name: '送给下一位' }).click();
  const publishedLeaf = await (await publishedResponse).json();

  await expect(page.getByText('叶笺已经挂到树下了')).toBeVisible();
  expect(['common', 'rare', 'legendary']).toContain(publishedLeaf.rarity);
  await expect(page.locator('#milestone-line')).toContainText('还差');
  await expect(page.locator('#presence-line')).toBeVisible();
  const ownLeafCard = page.locator('#leaf-wall [data-testid="leaf-card"]').filter({
    hasText: `第 ${Number(wateringReceipt.waterNo).toLocaleString('zh-CN')} 滴水`,
  });
  await expect(ownLeafCard).toContainText(publishedLeaf.phrase);
  if (publishedLeaf.rarity !== 'common') {
    await expect(ownLeafCard).toContainText(publishedLeaf.rarity === 'rare' ? '稀有' : '传说');
  }
  const likeResponse = page.waitForResponse((response) => response.url().endsWith('/api/leaves/like') && response.status() === 200);
  await ownLeafCard.getByTestId('leaf-like').click();
  await likeResponse;
  await expect(ownLeafCard.getByTestId('leaf-like')).toBeDisabled();
  await expect(ownLeafCard.getByTestId('leaf-like')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '换一批叶笺' }).click();
  await expect(page.locator('#wall-page-status')).toContainText('人气叶笺');
  await expect.poll(() => page.locator('#leaf-wall [data-testid="leaf-card"]').count()).toBeLessThanOrEqual(10);
  expect(consoleErrors).toEqual([]);

  const screenshotDir = path.resolve(root, '../../screenshots/qa');
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `${testInfo.project.name}.png`), fullPage: true });
});
