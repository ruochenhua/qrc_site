import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

  // Load the actual game module so all UI logic and listeners are active.
  await import('../js/game.js');
  return dom;
}

describe('Blueprint UI in browser-like env', () => {
  test('blueprint save modal opens, saves, and loads blueprint', async () => {
    await setup();

    const saveBtn = document.getElementById('blueprint-save');
    assert.ok(saveBtn, 'save button should exist');

    // Click save to open the modal.
    saveBtn.click();
    const modal = document.getElementById('blueprint-save-modal');
    assert.ok(modal.classList.contains('open'), 'save modal should be visible');

    // Enter a name and confirm.
    const input = document.getElementById('blueprint-name-input');
    input.value = '我的测试蓝图';
    const confirmBtn = document.getElementById('blueprint-save-confirm');
    confirmBtn.click();

    // Modal should close and blueprint list should contain the new item.
    assert.ok(!modal.classList.contains('open'), 'save modal should close');

    const blueprintsList = document.getElementById('library-blueprints');
    assert.equal(blueprintsList.style.display, 'flex', 'should switch to blueprints tab');

    const list = document.getElementById('blueprint-list');
    const items = list.querySelectorAll('.blueprint-item');
    assert.equal(items.length, 1, 'should render one blueprint item');
    assert.ok(items[0].textContent.includes('我的测试蓝图'), 'item should show blueprint name');

    // Click the rendered blueprint item (not the delete button) to load it.
    items[0].click();

    // After loading, a toast should appear.
    const toast = document.getElementById('preview-toast');
    assert.ok(toast.classList.contains('show'), 'toast should be visible');
    assert.ok(toast.textContent.includes('我的测试蓝图'), 'toast should mention blueprint name');
  });
});
