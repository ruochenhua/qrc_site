import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assembleShell, validateShellComponents } from '../js/systems.js';

describe('Assembly capacity validation', () => {
  test('assembleShell accepts quantity-based components', () => {
    const shell = assembleShell({
      gunpowder: { g001: 3 },
      casing: 'c001',
      colorant: { col001: 2 },
      fuse: 'f001',
      effect: {},
    });
    assert.equal(shell.shape, 'peony');
    assert.ok(shell.cost > 0);
    assert.equal(shell.components.casing, 'c001');
  });

  test('throws when total quantity exceeds casing capacity', () => {
    assert.throws(() => assembleShell({
      gunpowder: { g001: 10 },
      casing: 'c001',
      colorant: {},
      fuse: 'f001',
      effect: {},
    }), /capacity/);
  });

  test('throws for invalid component id', () => {
    assert.throws(() => assembleShell({
      gunpowder: { invalid: 2 },
      casing: 'c001',
      colorant: {},
      fuse: 'f001',
      effect: {},
    }));
  });

  test('throws for missing required category', () => {
    assert.throws(() => assembleShell({
      gunpowder: { g001: 2 },
      casing: 'c001',
      colorant: {},
      fuse: 'f001',
    }));
  });

  test('multi-layer casing allows secondary components', () => {
    const shell = assembleShell({
      gunpowder: { g001: 4 },
      casing: 'c010',
      colorant: { col001: 2 },
      fuse: 'f001',
      effect: { e002: 2 },
      secondary: {
        effect: { e006: 4 },
      },
    });
    assert.equal(shell.hasSecondary, true);
    assert.ok(shell.secondary);
  });

  test('multi-layer casing rejects gunpowder in secondary layer', () => {
    assert.throws(() => assembleShell({
      gunpowder: { g001: 2 },
      casing: 'c010',
      colorant: {},
      fuse: 'f001',
      effect: {},
      secondary: {
        gunpowder: { g002: 2 },
      },
    }), /secondary|gunpowder/);
  });

  test('secondary explosion agent requires multi-layer casing', () => {
    assert.throws(() => assembleShell({
      gunpowder: { g001: 2 },
      casing: 'c001',
      colorant: {},
      fuse: 'f001',
      effect: { e006: 4 },
    }), /multi.layer|secondary/);
  });

  test('validateShellComponents returns validation result', () => {
    const valid = validateShellComponents({
      gunpowder: { g001: 2 },
      casing: 'c001',
      colorant: { col001: 1 },
      fuse: 'f001',
      effect: {},
    });
    assert.equal(valid.valid, true);

    const invalid = validateShellComponents({
      gunpowder: { g001: 20 },
      casing: 'c001',
      colorant: {},
      fuse: 'f001',
      effect: {},
    });
    assert.equal(invalid.valid, false);
    assert.equal(invalid.reason, 'over_capacity');
  });
});
