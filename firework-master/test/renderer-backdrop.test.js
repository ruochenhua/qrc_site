import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FireworkRenderer } from '../js/renderer.js';
import { EVENTS } from '../js/config.js';

beforeEach(() => {
  globalThis.devicePixelRatio = 1;
  globalThis.performance = { now: () => Date.now() };
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
});

function createMockCanvas() {
  const calls = [];
  const ctx = {
    _fillStyle: '',
    get fillStyle() { return this._fillStyle; },
    set fillStyle(v) { this._fillStyle = v; calls.push(['fillStyle', v]); },
    fillRect: (...args) => calls.push(['fillRect', args]),
    beginPath: () => calls.push(['beginPath']),
    arc: (...args) => calls.push(['arc', args]),
    fill: () => calls.push(['fill']),
    moveTo: (...args) => calls.push(['moveTo', args]),
    lineTo: (...args) => calls.push(['lineTo', args]),
    stroke: () => calls.push(['stroke']),
    scale: () => {},
    setTransform: () => {},
    drawImage: (...args) => calls.push(['drawImage', args]),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  return {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
    clientWidth: 800,
    clientHeight: 600,
    width: 800,
    height: 600,
    style: {},
    _calls: calls,
  };
}

describe('Renderer backdrop', () => {
  test('setBackdrop stores config and marks background dirty', () => {
    const renderer = new FireworkRenderer();
    renderer.setBackdrop({ sky: 'midnight', ground: 'village', clouds: 'few' });
    assert.deepEqual(renderer.backdrop, { sky: 'midnight', ground: 'village', clouds: 'few' });
    assert.equal(renderer._bgDirty, true);
  });

  test('draw without backdrop keeps original trail fade', () => {
    const canvas = createMockCanvas();
    const renderer = new FireworkRenderer(canvas);
    renderer.resize();
    renderer._draw();
    const fillStyleCalls = canvas._calls.filter(c => c[0] === 'fillStyle');
    assert.ok(fillStyleCalls.some(c => String(c[1]).includes('0.25')), 'should use original trail fade alpha');
  });

  test('draw with backdrop fills background when canvas creation is unavailable', () => {
    const canvas = createMockCanvas();
    const renderer = new FireworkRenderer(canvas);
    renderer.resize();
    renderer.setBackdrop({ sky: 'midnight', ground: 'village', clouds: 'few' });
    renderer._draw();
    const fillStyleCalls = canvas._calls.filter(c => c[0] === 'fillStyle');
    const drawImageCalls = canvas._calls.filter(c => c[0] === 'drawImage');
    assert.ok(fillStyleCalls.length >= 1 || drawImageCalls.length >= 1, 'should draw background');
  });

  test('every event has a valid backdrop config', () => {
    const validSkies = new Set(['midnight', 'twilight', 'festival', 'clear']);
    const validGrounds = new Set(['village', 'grass', 'city', 'park']);
    const validClouds = new Set(['none', 'few', 'scattered']);
    for (const event of Object.values(EVENTS)) {
      assert.ok(event.backdrop, `event ${event.id} should have backdrop`);
      assert.ok(validSkies.has(event.backdrop.sky), `event ${event.id} has valid sky`);
      assert.ok(validGrounds.has(event.backdrop.ground), `event ${event.id} has valid ground`);
      assert.ok(validClouds.has(event.backdrop.clouds), `event ${event.id} has valid clouds`);
    }
  });
});
