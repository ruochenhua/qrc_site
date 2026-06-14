import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameState, SaveSystem } from '../js/state.js';
import { STARTING_FUNDS } from '../js/config.js';

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

beforeEach(() => {
  const storage = createMockStorage();
  globalThis.localStorage = storage;
});

describe('GameState', () => {
  test('initial state uses defaults', () => {
    const state = new GameState();
    assert.equal(state.funds, STARTING_FUNDS);
    assert.equal(state.fame, 0);
    assert.equal(state.rank, 'apprentice');
    assert.deepEqual([...state.unlockedRecipes].sort(), ['r001', 'r002', 'r003']);
    assert.deepEqual([...state.ownedRecipes].sort(), ['r001', 'r002', 'r003']);
    assert.equal(state.completedMainEvents.size, 0);
    assert.equal(state.phase, 'START');
  });

  test('reset restores defaults', () => {
    const state = new GameState();
    state.funds = 999;
    state.fame = 100;
    state.rank = 'skilled';
    state.ownRecipe('r005');
    state.completeMainEvent('e001');
    state.reset();
    assert.equal(state.funds, STARTING_FUNDS);
    assert.equal(state.fame, 0);
    assert.equal(state.rank, 'apprentice');
    assert.deepEqual([...state.ownedRecipes].sort(), ['r001', 'r002', 'r003']);
    assert.equal(state.completedMainEvents.size, 0);
  });

  test('addFunds and addFame clamp at zero', () => {
    const state = new GameState();
    state.addFunds(100);
    assert.equal(state.funds, STARTING_FUNDS + 100);
    state.addFunds(-(STARTING_FUNDS + 200));
    assert.equal(state.funds, 0);
    state.addFame(50);
    assert.equal(state.fame, 50);
    state.addFame(-100);
    assert.equal(state.fame, 0);
  });

  test('ownRecipe requires unlock first', () => {
    const state = new GameState();
    assert.equal(state.ownRecipe('r005'), false);
    state.unlockRecipe('r005');
    assert.equal(state.ownRecipe('r005'), true);
    assert.ok(state.ownedRecipes.has('r005'));
  });

  test('show management', () => {
    const state = new GameState();
    state.selectEvent('e001');
    state.addToShow('r001');
    state.addToShow('r002');
    assert.deepEqual(state.currentShow, ['r001', 'r002']);
    state.removeFromShow(0);
    assert.deepEqual(state.currentShow, ['r002']);
    state.setShow(['r003', 'r004', 'r001']);
    assert.deepEqual(state.currentShow, ['r003', 'r004', 'r001']);
    state.clearShow();
    assert.deepEqual(state.currentShow, []);
  });

  test('main event completion', () => {
    const state = new GameState();
    state.completeMainEvent('e001');
    assert.ok(state.isMainEventCompleted('e001'));
    assert.ok(!state.isMainEventCompleted('e002'));
  });
});

describe('SaveSystem', () => {
  test('save and load roundtrip', () => {
    const state = new GameState();
    state.funds = 1234;
    state.fame = 567;
    state.rank = 'technician';
    state.unlockRecipe('r005');
    state.ownRecipe('r005');
    state.completeMainEvent('e001');
    state.selectEvent('e002');
    state.setShow(['r001', 'r005']);

    SaveSystem.save(state);
    assert.ok(SaveSystem.exists());

    const loaded = SaveSystem.load();
    const fresh = new GameState();
    SaveSystem.apply(fresh, loaded);

    assert.equal(fresh.funds, 1234);
    assert.equal(fresh.fame, 567);
    assert.equal(fresh.rank, 'technician');
    assert.ok(fresh.unlockedRecipes.has('r005'));
    assert.ok(fresh.ownedRecipes.has('r005'));
    assert.ok(fresh.isMainEventCompleted('e001'));
    assert.equal(fresh.selectedEventId, 'e002');
    assert.deepEqual(fresh.currentShow, ['r001', 'r005']);
  });

  test('clear removes save', () => {
    const state = new GameState();
    SaveSystem.save(state);
    assert.ok(SaveSystem.exists());
    SaveSystem.clear();
    assert.ok(!SaveSystem.exists());
    assert.equal(SaveSystem.load(), null);
  });

  test('apply returns false for null data', () => {
    const state = new GameState();
    assert.equal(SaveSystem.apply(state, null), false);
  });
});
