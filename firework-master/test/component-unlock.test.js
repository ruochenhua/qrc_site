import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState, SaveSystem } from '../js/state.js';
import {
  isComponentOwned,
  researchComponent,
  areComponentsAccessible,
  validateShow,
  assembleShell,
  loadRecipe,
} from '../js/systems.js';
import { STARTING_COMPONENTS } from '../js/config.js';

describe('Component ownership and research', () => {
  test('GameState initializes ownedComponents from STARTING_COMPONENTS', () => {
    const state = new GameState();
    for (const id of STARTING_COMPONENTS) {
      assert.ok(state.ownedComponents.has(id), `starting component ${id} should be owned`);
    }
  });

  test('isComponentOwned returns true for owned and false for unowned', () => {
    const state = new GameState();
    assert.equal(isComponentOwned(state, 'g001'), true);
    assert.equal(isComponentOwned(state, 'g004'), false);
  });

  test('researchComponent purchases a visible component', () => {
    const state = new GameState();
    state.fame = 400;
    state.funds = 1000;
    const before = state.funds;
    const res = researchComponent(state, 'gunpowder', 'g003');
    assert.equal(res.success, true);
    assert.ok(state.ownedComponents.has('g003'));
    assert.ok(state.funds < before);
  });

  test('researchComponent fails if component is not visible', () => {
    const state = new GameState();
    state.fame = 0;
    state.funds = 10000;
    const res = researchComponent(state, 'gunpowder', 'g003');
    assert.equal(res.success, false);
    assert.equal(res.reason, 'not_unlocked');
  });

  test('researchComponent fails if already owned', () => {
    const state = new GameState();
    const res = researchComponent(state, 'gunpowder', 'g001');
    assert.equal(res.success, false);
    assert.equal(res.reason, 'already_owned');
  });

  test('researchComponent fails if funds are insufficient', () => {
    const state = new GameState();
    state.fame = 400;
    state.funds = 1;
    const res = researchComponent(state, 'gunpowder', 'g003');
    assert.equal(res.success, false);
    assert.equal(res.reason, 'insufficient_funds');
  });

  test('SaveSystem roundtrip preserves ownedComponents', () => {
    const state = new GameState();
    state.fame = 400;
    state.funds = 1000;
    researchComponent(state, 'gunpowder', 'g003');

    const data = {
      schemaVersion: 1,
      funds: state.funds,
      fame: state.fame,
      rank: state.rank,
      unlockedRecipes: Array.from(state.unlockedRecipes),
      ownedRecipes: Array.from(state.ownedRecipes),
      completedMainEvents: Array.from(state.completedMainEvents),
      ownedComponents: Array.from(state.ownedComponents),
      phase: state.phase,
      selectedEventId: state.selectedEventId,
      currentShow: state.currentShow,
      gameOver: state.gameOver,
      won: state.won,
      blueprintSlots: state.blueprintSlots,
      ownedBlueprints: Array.from(state.ownedBlueprints),
      blueprints: state.blueprints,
      timestamp: Date.now(),
    };

    const loaded = new GameState();
    SaveSystem.apply(loaded, data);
    assert.ok(loaded.ownedComponents.has('g003'));
  });

  test('areComponentsAccessible requires ownership', () => {
    const state = new GameState();
    state.fame = 0;
    const components = loadRecipe('r009');
    assert.equal(areComponentsAccessible(components, state), false);
  });

  test('validateShow rejects shell objects with unowned components', () => {
    const state = new GameState();
    state.fame = 0;
    const components = loadRecipe('r009');
    const shell = assembleShell(components);
    const result = validateShow(state, 'e001', [shell, shell]);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'component_not_unlocked');
  });
});
