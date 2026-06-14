import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { getUnlockedRecipes, getOwnableRecipes, researchRecipe, updateUnlocks, getRecipeById } from '../js/systems.js';

describe('Recipe unlock and research', () => {
  test('getUnlockedRecipes returns unlocked recipes', () => {
    const state = new GameState();
    const unlocked = getUnlockedRecipes(state);
    assert.equal(unlocked.length, 3);
    assert.ok(unlocked.every(r => ['r001', 'r002', 'r003'].includes(r.id)));
  });

  test('getOwnableRecipes excludes already owned', () => {
    const state = new GameState();
    assert.equal(getOwnableRecipes(state).length, 0);
    state.unlockRecipe('r005');
    const ownable = getOwnableRecipes(state);
    assert.equal(ownable.length, 1);
    assert.equal(ownable[0].id, 'r005');
  });

  test('researchRecipe deducts funds and owns recipe', () => {
    const state = new GameState();
    state.funds = 1000;
    state.unlockRecipe('r005');
    const recipe = getRecipeById('r005');
    const result = researchRecipe(state, 'r005');
    assert.equal(result.success, true);
    assert.ok(state.ownedRecipes.has('r005'));
    assert.equal(state.funds, 1000 - recipe.researchCost);
  });

  test('researchRecipe fails if not unlocked', () => {
    const state = new GameState();
    state.funds = 1000;
    const result = researchRecipe(state, 'r005');
    assert.equal(result.success, false);
    assert.equal(result.reason, 'not_unlocked');
  });

  test('researchRecipe fails if already owned', () => {
    const state = new GameState();
    const result = researchRecipe(state, 'r001');
    assert.equal(result.success, false);
    assert.equal(result.reason, 'already_owned');
  });

  test('rank-based recipe unlock flow', () => {
    const state = new GameState();
    state.fame = 100;
    updateUnlocks(state);
    assert.ok(state.unlockedRecipes.has('r005'));
    state.funds = 500;
    const result = researchRecipe(state, 'r005');
    assert.equal(result.success, true);
    assert.ok(state.ownedRecipes.has('r005'));
  });
});
