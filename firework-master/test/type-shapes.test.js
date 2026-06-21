import assert from 'node:assert/strict';
import test from 'node:test';
import { GameState } from '../js/state.js';
import { assembleShell, calculateScore, settleEvent } from '../js/systems.js';

const VALID_COMPONENTS = {
  gunpowder: { g001: 3 },
  casing: 'c001',
  colorant: { col001: 2 },
  fuse: 'f002',
  effect: { e002: 2 },
  secondary: { colorant: {}, effect: {} },
};

test('assembleShell returns a shell with required fields', () => {
  const shell = assembleShell(VALID_COMPONENTS);
  assert.ok(shell.id, 'shell.id');
  assert.ok(shell.shape, 'shell.shape');
  assert.equal(typeof shell.height, 'number');
  assert.equal(typeof shell.scale, 'number');
  assert.equal(typeof shell.density, 'number');
  assert.equal(typeof shell.duration, 'number');
  assert.ok(shell.color && typeof shell.color === 'object', 'shell.color');
  assert.ok(shell.effects && typeof shell.effects === 'object', 'shell.effects');
  assert.equal(typeof shell.cost, 'number');
  assert.ok(shell.components && typeof shell.components === 'object', 'shell.components');
});

test('calculateScore returns a score result with required fields', () => {
  const shell = assembleShell(VALID_COMPONENTS);
  const result = calculateScore('e001', [shell]);
  assert.equal(typeof result.score, 'number');
  assert.equal(typeof result.baseScore, 'number');
  assert.equal(typeof result.complexityBonus, 'number');
  assert.equal(typeof result.comboBonus, 'number');
  assert.equal(typeof result.repeatPenalty, 'number');
  assert.ok(Array.isArray(result.combos), 'result.combos');
  assert.ok(result.preferenceHits && typeof result.preferenceHits === 'object', 'result.preferenceHits');
  assert.equal(typeof result.preferenceHits.hits, 'number');
  assert.equal(typeof result.preferenceHits.total, 'number');
});

test('settleEvent returns a settlement result with required fields', () => {
  const state = new GameState();
  const shell = assembleShell(VALID_COMPONENTS);
  const result = settleEvent(state, 'e002', [shell, shell]);
  assert.equal(result.success, true);
  assert.ok(result.score && typeof result.score === 'object', 'result.score');
  assert.ok(result.rewards && typeof result.rewards === 'object', 'result.rewards');
  assert.equal(typeof result.rewards.funds, 'number');
  assert.equal(typeof result.rewards.fame, 'number');
  assert.equal(typeof result.cost, 'number');
  assert.equal(typeof result.isFirstClear, 'boolean');
  assert.equal(typeof result.rankedUp, 'boolean');
});
