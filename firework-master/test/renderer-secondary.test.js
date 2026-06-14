import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FireworkRenderer } from '../js/renderer.js';
import { assembleShell } from '../js/systems.js';

beforeEach(() => {
  globalThis.devicePixelRatio = 1;
  globalThis.performance = { now: () => Date.now() };
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
});

function createMockCanvas() {
  return {
    getContext: () => ({
      fillRect: () => {}, beginPath: () => {}, arc: () => {}, fill: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, scale: () => {}, setTransform: () => {},
    }),
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
    clientWidth: 800, clientHeight: 600, width: 800, height: 600, style: {},
  };
}

describe('Renderer secondary explosions', () => {
  test('renderer schedules secondary explosion from shell object', () => {
    const renderer = new FireworkRenderer();
    renderer.init(createMockCanvas());

    const shell = assembleShell({
      gunpowder: { g001: 4 }, casing: 'c010', colorant: { col001: 2 }, fuse: 'f001', effect: {},
      secondary: { effect: { e006: 4 } },
    });

    renderer.playShow([shell]);
    renderer._launch(shell);
    assert.equal(renderer.shells.length, 1);

    const launched = renderer.shells[0];
    launched.y = launched.targetY;
    renderer._update(16);

    assert.equal(renderer.shells.length, 0);
    assert.ok(renderer.particles.length > 0);
    assert.ok(renderer._pendingSecondary);
    assert.equal(renderer._pendingSecondary.length, 1);
    renderer.stop();
  });

  test('secondary explosion spawns additional particles after delay', () => {
    const renderer = new FireworkRenderer();
    renderer.init(createMockCanvas());

    const shell = assembleShell({
      gunpowder: { g001: 4 }, casing: 'c010', colorant: { col001: 2 }, fuse: 'f001', effect: {},
      secondary: { effect: { e006: 4 } },
    });

    renderer.playShow([shell]);
    renderer._launch(shell);
    const launched = renderer.shells[0];
    launched.y = launched.targetY;
    renderer._update(16);

    const initialParticles = renderer.particles.length;
    renderer._pendingSecondary[0].attr.delay = 0;
    for (let i = 0; i < 5; i++) renderer._update(16);

    assert.equal(renderer._pendingSecondary.length, 0);
    assert.ok(renderer.particles.length > initialParticles - 10);
    renderer.stop();
  });
});
