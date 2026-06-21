import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const CSS_DIR = new URL('../css', import.meta.url).pathname;
const HTML_PATH = new URL('../index.html', import.meta.url).pathname;

function loadCss() {
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

const css = loadCss();
const html = readFileSync(HTML_PATH, 'utf-8');

test('preview canvas does not have fixed width/height attributes', () => {
  const dom = new JSDOM(html);
  const canvas = dom.window.document.getElementById('preview-canvas');
  assert.ok(canvas);
  assert.equal(canvas.getAttribute('width'), null, 'preview canvas should not have fixed width attribute');
  assert.equal(canvas.getAttribute('height'), null, 'preview canvas should not have fixed height attribute');
});

test('start screen is centered and fills viewport', () => {
  assert.ok(css.includes('#view-start'), 'start view selector exists');
  assert.ok(
    /#view-start(?:\.active)?[,\s][^{]*\{[^}]*(?:min-height|height)\s*:\s*(?:calc\([^)]*100vh|100vh)/i.test(css),
    'start view should fill viewport height',
  );
  assert.ok(
    /\.start-screen[^{]*\{[^}]*display\s*:\s*flex/i.test(css),
    'start screen should use flex layout',
  );
  assert.ok(
    /\.start-screen[^{]*\{[^}]*justify-content\s*:\s*center/i.test(css),
    'start screen content should be vertically centered',
  );
});

test('build layout uses flexible height instead of overflowing content', () => {
  assert.ok(
    /\.build-layout\s*\{[^}]*(?:flex|min-height\s*:\s*0)/i.test(css),
    'build layout should use flex or min-height:0 to prevent overflow',
  );
  assert.ok(
    /#preview-canvas\s*\{[^}]*max-width\s*:\s*100%/i.test(css),
    'preview canvas should be width-responsive',
  );
  assert.ok(
    /#preview-canvas\s*\{[^}]*height\s*:\s*auto/i.test(css),
    'preview canvas height should be auto',
  );
});

test('game container supports wider screens', () => {
  assert.ok(
    /#game\s*\{[^}]*max-width\s*:\s*(?:1200|1400|100%)/i.test(css),
    'game container max-width should allow wider screens',
  );
});
