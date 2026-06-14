import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore } from '../js/systems.js';

describe('Score breakdown', () => {
  test('calculateScore returns all breakdown fields', () => {
    const result = calculateScore('e001', ['r001']);
    assert.equal(typeof result.score, 'number');
    assert.equal(typeof result.baseScore, 'number');
    assert.equal(typeof result.complexityBonus, 'number');
    assert.equal(typeof result.comboBonus, 'number');
    assert.equal(typeof result.repeatPenalty, 'number');
    assert.ok(Array.isArray(result.combos));
  });

  test('complexity bonus appears for multi-layer shells', () => {
    const simple = calculateScore('e007', ['r001']);
    const complex = calculateScore('e007', ['r009']);
    assert.ok(complex.complexityBonus >= simple.complexityBonus);
  });

  test('combo bonus and names appear when combo matched', () => {
    // 年味: red>=2, gold>=2, crackle>=1
    const result = calculateScore('e001', ['r001', 'r001', 'r002', 'r002', 'r008']);
    assert.ok(result.comboBonus > 0);
    assert.ok(result.combos.includes('newYear'));
  });

  test('repeat penalty increases with duplicates', () => {
    const single = calculateScore('e001', ['r001']);
    const repeated = calculateScore('e001', Array(4).fill('r001'));
    assert.equal(single.repeatPenalty, 0);
    assert.ok(repeated.repeatPenalty > 0);
  });

  test('final score is derived from breakdown factors', () => {
    const result = calculateScore('e001', ['r001', 'r002', 'r003', 'r004']);
    const expected = result.baseScore * (1 + result.complexityBonus + result.comboBonus) * (1 - result.repeatPenalty);
    assert.ok(Math.abs(result.score - Math.min(100, Math.round(expected))) <= 1);
  });
});
