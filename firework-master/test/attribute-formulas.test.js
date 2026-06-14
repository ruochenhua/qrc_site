import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assembleShell } from '../js/systems.js';

describe('Shell attribute formulas', () => {
  test('height increases with gunpowder and fuse', () => {
    const low = assembleShell({
      gunpowder: { g001: 1 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: {},
    });
    const high = assembleShell({
      gunpowder: { g004: 10 }, casing: 'c012', colorant: {}, fuse: 'f004', effect: {},
    });
    assert.ok(high.height > low.height);
    assert.ok(high.height <= 1);
    assert.ok(low.height >= 0);
  });

  test('scale increases with gunpowder and casing multiplier', () => {
    const small = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: {},
    });
    const large = assembleShell({
      gunpowder: { g003: 6 }, casing: 'c009', colorant: {}, fuse: 'f001', effect: {},
    });
    assert.ok(large.scale > small.scale);
  });

  test('density depends on colorant quantity vs capacity', () => {
    const sparse = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c002', colorant: { col001: 1 }, fuse: 'f001', effect: {},
    });
    const dense = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c002', colorant: { col001: 6 }, fuse: 'f001', effect: {},
    });
    assert.ok(dense.density > sparse.density);
  });

  test('color vector reflects proportions', () => {
    const shell = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2, col002: 2 }, fuse: 'f001', effect: {},
    });
    assert.ok(Math.abs(shell.color.red - 0.5) < 0.01);
    assert.ok(Math.abs(shell.color.gold - 0.5) < 0.01);
  });

  test('effects vector triggered by thresholds', () => {
    const weak = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: { e001: 1 },
    });
    const strong = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: { e001: 6 },
    });
    assert.ok(!weak.effects.glitter);
    assert.ok(strong.effects.glitter > 0);
  });

  test('secondary explosion gets its own attributes', () => {
    const shell = assembleShell({
      gunpowder: { g001: 4 }, casing: 'c010', colorant: { col001: 2 }, fuse: 'f002', effect: { e002: 2 },
      secondary: { effect: { e006: 4 } },
    });
    assert.equal(shell.hasSecondary, true);
    assert.ok(shell.secondaryAttr.scale > 0);
    assert.ok(shell.secondaryAttr.density >= 0);
    assert.ok(typeof shell.secondaryAttr.delay === 'number');
    assert.ok(shell.secondaryAttr.effects.secondary > 0);
  });
});
