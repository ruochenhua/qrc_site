import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState, SaveSystem } from '../js/state.js';

describe('Blueprint system', () => {
  test('initial state has empty blueprint list and default slots', () => {
    const state = new GameState();
    assert.equal(state.blueprintSlots, 5);
    assert.equal(state.ownedBlueprints.size, 0);
    assert.deepEqual(Object.keys(state.blueprints), []);
  });

  test('saveBlueprint stores blueprint', () => {
    const state = new GameState();
    const components = {
      gunpowder: { g001: 3 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f001', effect: {},
    };
    const result = state.saveBlueprint('红牡丹', components);
    assert.equal(result.success, true);
    assert.ok(state.ownedBlueprints.has(result.blueprint.id));
    assert.deepEqual(state.blueprints[result.blueprint.id].components, components);
  });

  test('saveBlueprint fails when slots full', () => {
    const state = new GameState();
    state.blueprintSlots = 2;
    state.saveBlueprint('a', { gunpowder: { g001: 1 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: {} });
    state.saveBlueprint('b', { gunpowder: { g001: 1 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: {} });
    const result = state.saveBlueprint('c', { gunpowder: { g001: 1 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: {} });
    assert.equal(result.success, false);
    assert.equal(result.reason, 'slots_full');
  });

  test('loadBlueprint returns components', () => {
    const state = new GameState();
    const components = {
      gunpowder: { g001: 3 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f001', effect: {},
    };
    const saved = state.saveBlueprint('红牡丹', components);
    const loaded = state.loadBlueprint(saved.blueprint.id);
    assert.deepEqual(loaded, components);
  });

  test('deleteBlueprint removes blueprint', () => {
    const state = new GameState();
    const saved = state.saveBlueprint('x', { gunpowder: { g001: 1 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: {} });
    state.deleteBlueprint(saved.blueprint.id);
    assert.equal(state.ownedBlueprints.has(saved.blueprint.id), false);
    assert.equal(state.blueprints[saved.blueprint.id], undefined);
  });

  test('expandBlueprintSlot costs funds and increases slots', () => {
    const state = new GameState();
    state.funds = 200;
    const result = state.expandBlueprintSlot();
    assert.equal(result.success, true);
    assert.equal(state.blueprintSlots, 6);
    assert.ok(state.funds < 200);
  });

  test('SaveSystem persists blueprints', () => {
    const state = new GameState();
    const components = { gunpowder: { g001: 2 }, casing: 'c001', colorant: {}, fuse: 'f001', effect: {} };
    const saved = state.saveBlueprint('test', components);
    const data = JSON.parse(JSON.stringify({
      schemaVersion: 1,
      funds: state.funds,
      fame: state.fame,
      rank: state.rank,
      unlockedRecipes: Array.from(state.unlockedRecipes),
      ownedRecipes: Array.from(state.ownedRecipes),
      completedMainEvents: Array.from(state.completedMainEvents),
      phase: state.phase,
      selectedEventId: state.selectedEventId,
      currentShow: state.currentShow,
      gameOver: state.gameOver,
      won: state.won,
      blueprintSlots: state.blueprintSlots,
      ownedBlueprints: Array.from(state.ownedBlueprints),
      blueprints: state.blueprints,
    }));
    const restored = new GameState();
    SaveSystem.apply(restored, data);
    assert.equal(restored.blueprintSlots, 5);
    assert.equal(restored.ownedBlueprints.size, 1);
    assert.ok(restored.blueprints[saved.blueprint.id]);
  });
});
