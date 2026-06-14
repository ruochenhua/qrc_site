import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, STARTING_RECIPES } from '../js/config.js';
import { getRecipeById, assembleShell } from '../js/systems.js';

describe('Simplified system recipes', () => {
  test('recipe count is 8 to 10', () => {
    assert.ok(Object.keys(RECIPES).length >= 8);
    assert.ok(Object.keys(RECIPES).length <= 10);
  });

  test('every recipe uses quantity-based components', () => {
    for (const recipe of Object.values(RECIPES)) {
      assert.equal(typeof recipe.components.gunpowder, 'object');
      assert.equal(typeof recipe.components.casing, 'string');
      assert.equal(typeof recipe.components.colorant, 'object');
      assert.equal(typeof recipe.components.fuse, 'string');
      assert.equal(typeof recipe.components.effect, 'object');
    }
  });

  test('every recipe assembles successfully', () => {
    for (const recipe of Object.values(RECIPES)) {
      const shell = assembleShell(recipe.components, recipe);
      assert.ok(shell.cost > 0);
      assert.equal(shell.recipeId, recipe.id);
    }
  });

  test('getRecipeById returns assembled shell with recipeId', () => {
    const recipe = getRecipeById(STARTING_RECIPES[0]);
    assert.ok(recipe);
    assert.ok(recipe.cost > 0);
    assert.equal(recipe.recipeId, STARTING_RECIPES[0]);
  });

  test('starting recipes cover basic shapes and concepts', () => {
    const shapes = new Set();
    for (const id of STARTING_RECIPES) {
      const shell = assembleShell(RECIPES[id].components);
      shapes.add(shell.shape);
    }
    assert.ok(shapes.size >= 2);
  });
});
