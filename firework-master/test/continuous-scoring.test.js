import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore, assembleShell } from '../js/systems.js';

describe('Continuous scoring', () => {
  test('well-matched shell scores high', () => {
    // e001 likes red, crackle, low height
    const shell = assembleShell({
      gunpowder: { g002: 4 }, casing: 'c004', colorant: { col001: 3 }, fuse: 'f001', effect: { e002: 3 },
    });
    const result = calculateScore('e001', [shell]);
    assert.ok(result.score >= 80, `expected high score, got ${result.score}`);
  });

  test('higher match when attributes closer to preference', () => {
    const lowShell = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f001', effect: {},
    });
    const highShell = assembleShell({
      gunpowder: { g004: 10 }, casing: 'c012', colorant: { col001: 8 }, fuse: 'f004', effect: {},
    });
    // Event e007 prefers high shells.
    const lowResult = calculateScore('e007', [lowShell]);
    const highResult = calculateScore('e007', [highShell]);
    assert.ok(highResult.score > lowResult.score);
  });

  test('color matching affects score', () => {
    const redShell = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 4 }, fuse: 'f001', effect: {},
    });
    const blueShell = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: { col003: 4 }, fuse: 'f001', effect: {},
    });
    const redResult = calculateScore('e001', [redShell]);
    const blueResult = calculateScore('e001', [blueShell]);
    assert.ok(redResult.score > blueResult.score);
  });

  test('secondary explosion gives complexity bonus', () => {
    const simple = assembleShell({
      gunpowder: { g001: 4 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f001', effect: {},
    });
    const complex = assembleShell({
      gunpowder: { g001: 4 }, casing: 'c010', colorant: { col001: 2 }, fuse: 'f001', effect: { e002: 2 },
      secondary: { effect: { e006: 4 } },
    });
    // Compare against an event that likes complexity
    const resultSimple = calculateScore('e007', [simple]);
    const resultComplex = calculateScore('e007', [complex]);
    assert.ok(resultComplex.score > resultSimple.score || resultComplex.complexityBonus > resultSimple.complexityBonus);
  });

  test('repeat penalty still applies', () => {
    const shell = assembleShell({
      gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f001', effect: {},
    });
    const one = calculateScore('e001', [shell]);
    const many = calculateScore('e001', [shell, shell, shell, shell]);
    assert.ok(many.repeatPenalty > one.repeatPenalty);
  });
});
