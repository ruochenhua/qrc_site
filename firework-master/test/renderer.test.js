import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FireworkRenderer, parseColors } from '../js/renderer.js';

beforeEach(() => {
  globalThis.devicePixelRatio = 1;
  globalThis.performance = { now: () => Date.now() };
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
});

function createMockCanvas() {
  const calls = [];
  const ctx = {
    fillRect: (...args) => calls.push(['fillRect', args]),
    beginPath: () => calls.push(['beginPath']),
    arc: (...args) => calls.push(['arc', args]),
    fill: () => calls.push(['fill']),
    moveTo: (...args) => calls.push(['moveTo', args]),
    lineTo: (...args) => calls.push(['lineTo', args]),
    stroke: () => calls.push(['stroke']),
    scale: () => {},
    setTransform: () => {},
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

describe('Renderer utilities', () => {
  test('parseColors single color', () => {
    assert.deepEqual(parseColors('red'), ['#ff4444']);
    assert.deepEqual(parseColors('blue'), ['#4488ff']);
  });

  test('parseColors dual color', () => {
    assert.deepEqual(parseColors('red+gold'), ['#ff4444', '#ffcc33']);
  });

  test('parseColors multi returns rainbow', () => {
    assert.equal(parseColors('multi').length, 6);
  });
});

describe('FireworkRenderer', () => {
  test('init sets up canvas', () => {
    const canvas = createMockCanvas();
    const renderer = new FireworkRenderer();
    renderer.init(canvas);
    assert.equal(renderer.canvas, canvas);
    assert.equal(renderer.width, 800);
    assert.equal(renderer.height, 600);
  });

  test('playShow schedules shells and stops when empty', (t, done) => {
    const canvas = createMockCanvas();
    const renderer = new FireworkRenderer(canvas);
    renderer.resize();

    let completed = false;
    renderer.playShow(['r001'], () => {
      completed = true;
    });

    assert.equal(renderer.running, true);
    assert.equal(renderer.shells.length, 0); // scheduled, not launched yet

    // Fast-forward internal timers: manually launch and explode
    renderer._launch({ id: 'r001', color: 'red', shape: 'peony', height: 'mid', duration: 'short', effect: 'none', cost: 10 });
    assert.equal(renderer.shells.length, 1);

    const shell = renderer.shells[0];
    shell.age = shell.maxAge;
    renderer._update(16);
    assert.equal(renderer.shells.length, 0);
    assert.ok(renderer.particles.length > 0);

    // Drain particles
    for (const p of renderer.particles) p.life = 0;
    renderer.particles.forEach(p => { p.y = 1000; p.life = 0; });
    renderer._update(16);
    assert.equal(renderer.particles.length, 0);

    renderer.stop();
    assert.equal(renderer.running, false);
    assert.equal(completed, false);
    done();
  });

  test('launcher obeys height mapping', () => {
    const canvas = createMockCanvas();
    const renderer = new FireworkRenderer(canvas);
    renderer.resize();

    renderer._launch({ id: 'r001', color: 'red', shape: 'peony', height: 'low', duration: 'short', effect: 'none', cost: 10 });
    const lowY = renderer.shells[0].targetY;
    renderer._launch({ id: 'r001', color: 'red', shape: 'peony', height: 'high', duration: 'short', effect: 'none', cost: 10 });
    const highY = renderer.shells[1].targetY;
    assert.ok(highY < lowY, 'high target should be higher (smaller y)');
  });
});
