import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CSS_DIR = new URL('../css', import.meta.url).pathname;

function loadCssFiles() {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.css')) files.push(readFileSync(path, 'utf-8'));
    }
  }
  walk(CSS_DIR);
  return files.join('\n');
}

const css = loadCssFiles();

const SELECTORS = [
  // base
  '--bg:', '--accent:', '--success:', '--danger:', '--warn:',
  '.view', '.view.active', '.view-enter',
  '.btn', '.btn.primary', '.btn:disabled',
  '.pill',
  // components
  '.event-card', '.recipe-card', '.component-card',
  '.modal', '.modal.open', '.modal-content',
  '.toast', '.toast.show', '.toast-success',
  '.global-bar', '.global-brand', '.global-pills',
  '.budget-row', '.budget-fill', '.budget-fill.warn', '.budget-fill.danger',
  '.capacity-fill', '.capacity-fill.over',
  // views (selectors may be scoped by id or class after splitting)
  '.start-screen',
  '.hub-header',
  '.card-list',
  '#view-build .panel',
  '#view-perform',
  '.result-screen',
  '#view-lab .card-list',
  '.ending-screen',
];

for (const selector of SELECTORS) {
  test(`CSS contains selector "${selector}"`, () => {
    assert.ok(css.includes(selector), `Missing selector: ${selector}`);
  });
}
