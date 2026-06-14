import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import {
  areComponentsAccessible,
  isExactRecipeMatch,
  loadRecipe,
  validateShow,
  assembleShell,
} from '../js/systems.js';
import { RECIPES } from '../js/config.js';

describe('Quantity-based build assembly', () => {
  test('loadRecipe returns quantity-based components', () => {
    const components = loadRecipe('r001');
    assert.equal(typeof components.gunpowder, 'object');
    assert.equal(typeof components.casing, 'string');
    assert.equal(typeof components.colorant, 'object');
    assert.equal(typeof components.fuse, 'string');
    assert.equal(typeof components.effect, 'object');
  });

  test('isExactRecipeMatch detects identical quantity-based assembly', () => {
    const assembly = loadRecipe('r001');
    assert.equal(isExactRecipeMatch(assembly, 'r001'), true);
  });

  test('isExactRecipeMatch detects different quantity-based assembly', () => {
    const assembly = loadRecipe('r001');
    assembly.colorant = { col002: 1 };
    assert.equal(isExactRecipeMatch(assembly, 'r001'), false);
  });

  test('areComponentsAccessible allows starting components', () => {
    const state = new GameState();
    const components = loadRecipe('r001');
    assert.equal(areComponentsAccessible(components, state), true);
  });

  test('areComponentsAccessible rejects components above current fame', () => {
    const state = new GameState();
    state.fame = 0;
    const components = loadRecipe('r009');
    assert.equal(areComponentsAccessible(components, state), false);
  });

  test('validateShow accepts shell objects built from quantity components', () => {
    const state = new GameState();
    const components = loadRecipe('r001');
    const shell = assembleShell(components, RECIPES.r001);
    const result = validateShow(state, 'e001', [shell, shell]);
    assert.equal(result.valid, true);
  });

  test('validateShow rejects shell objects with locked components', () => {
    const state = new GameState();
    state.fame = 0;
    const components = loadRecipe('r009');
    const shell = assembleShell(components);
    const result = validateShow(state, 'e001', [shell, shell]);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'component_not_unlocked');
  });
});
