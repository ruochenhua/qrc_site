import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/firework-master/',
    pretendToBeVisual: true,
  });
  global.document = dom.window.document;
  global.window = dom.window;
  return dom;
}

describe('UI component factories', () => {
  test('createButton builds button with text, variant and disabled state', async () => {
    setupDom();
    const { createButton } = await import('../js/ui/components/index.js');
    const btn = createButton({ text: '选择', variant: 'primary', disabled: true });

    assert.equal(btn.tagName, 'BUTTON');
    assert.ok(btn.classList.contains('btn'));
    assert.ok(btn.classList.contains('primary'));
    assert.equal(btn.textContent, '选择');
    assert.equal(btn.disabled, true);
  });

  test('createButton attaches click listener', async () => {
    setupDom();
    const { createButton } = await import('../js/ui/components/index.js');
    let clicked = false;
    const btn = createButton({ text: 'Click', onClick: () => { clicked = true; } });
    btn.click();
    assert.equal(clicked, true);
  });

  test('createPill builds a pill span with text and dataset', async () => {
    setupDom();
    const { createPill } = await import('../js/ui/components/index.js');
    const pill = createPill({ text: '等级：学徒', className: 'pill-rank', dataset: { pill: 'rank' } });

    assert.equal(pill.tagName, 'SPAN');
    assert.ok(pill.classList.contains('pill'));
    assert.ok(pill.classList.contains('pill-rank'));
    assert.equal(pill.textContent, '等级：学徒');
    assert.equal(pill.dataset.pill, 'rank');
  });

  test('createBadge builds a badge span with optional icon', async () => {
    setupDom();
    const { createBadge } = await import('../js/ui/components/index.js');
    const badge = createBadge({ text: '锁定', className: 'status-locked', icon: '🔒' });

    assert.equal(badge.tagName, 'SPAN');
    assert.ok(badge.classList.contains('status-locked'));
    assert.ok(badge.textContent.includes('锁定'));
    assert.ok(badge.textContent.includes('🔒'));
  });

  test('createCard builds a card container with children', async () => {
    setupDom();
    const { createCard, createPill } = await import('../js/ui/components/index.js');
    const child = createPill({ text: 'tag' });
    const card = createCard({ className: 'recipe-card owned', children: [child], dataset: { id: 'r1' } });

    assert.equal(card.tagName, 'DIV');
    assert.ok(card.classList.contains('recipe-card'));
    assert.ok(card.classList.contains('owned'));
    assert.equal(card.children.length, 1);
    assert.equal(card.firstChild, child);
    assert.equal(card.dataset.id, 'r1');
  });

  test('createCard accepts string children as text nodes', async () => {
    setupDom();
    const { createCard } = await import('../js/ui/components/index.js');
    const card = createCard({ className: 'event-card', children: ['hello'] });

    assert.equal(card.textContent, 'hello');
  });
});
