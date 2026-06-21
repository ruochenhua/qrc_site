import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { RECIPES } from '../js/config.js';

async function setup() {
  const htmlPath = resolve('index.html');
  const html = readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/firework-master/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    storageQuota: 10000000,
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  await import('../js/game.js');
  return dom;
}

describe('Build UI ownership gating', () => {
  test('assembly bench marks visible unowned components as locked', async () => {
    await setup();
    const { state, setCurrentAssemblyTab } = await import('../js/app-state.js');
    const { renderAssemblyBench } = await import('../js/views/build.js');

    state.fame = 400;
    setCurrentAssemblyTab('gunpowder');
    renderAssemblyBench();

    const cards = document.querySelectorAll('#assembly-categories .component-card');
    assert.ok(cards.length >= 2, 'should render multiple gunpowder cards');

    const ownedCard = [...cards].find(c => c.textContent.includes('黑火药'));
    const lockedCard = [...cards].find(c => c.textContent.includes('高性能火药'));
    assert.ok(ownedCard, 'owned starter card should render');
    assert.ok(lockedCard, 'visible unowned card should render');
    assert.ok(!ownedCard.classList.contains('locked'), 'owned card should not be locked');
    assert.ok(lockedCard.classList.contains('locked'), 'unowned card should be locked');
    assert.ok(lockedCard.querySelector('.lock-badge'), 'locked card should show lock badge');
  });

  test('library lists all example recipes and locks unowned ones', async () => {
    await setup();
    const { state } = await import('../js/app-state.js');
    const { renderLibrary } = await import('../js/views/build.js');

    state.fame = 0;
    renderLibrary();

    const items = document.querySelectorAll('#library-recipes .library-item');
    assert.equal(items.length, Object.keys(RECIPES).length, 'should list every example recipe');

    const ownedItem = [...items].find(i => i.textContent.includes('红牡丹'));
    const lockedItem = [...items].find(i => i.textContent.includes('二次绽放'));
    assert.ok(ownedItem, 'owned example should appear');
    assert.ok(lockedItem, 'unowned example should appear');
    assert.ok(!ownedItem.classList.contains('locked'), 'owned example should not be locked');
    assert.ok(lockedItem.classList.contains('locked'), 'unowned example should be locked');
  });
});
