import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { validateShow, settleEvent } from '../js/systems.js';
import { EVENTS } from '../js/config.js';

function makeShell(overrides = {}) {
  return {
    id: 'shell_1',
    name: '测试烟花',
    color: { red: 1 },
    shape: 'peony',
    height: 0.3,
    scale: 0.4,
    density: 0.5,
    duration: 0.4,
    effects: {},
    cost: 12,
    components: { gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f002', effect: {} },
    recipeId: null,
    ...overrides,
  };
}

describe('Event min/max shell constraints', () => {
  test('every event defines minShells and maxShells', () => {
    for (const event of Object.values(EVENTS)) {
      assert.equal(typeof event.minShells, 'number', `${event.id} missing minShells`);
      assert.equal(typeof event.maxShells, 'number', `${event.id} missing maxShells`);
      assert.ok(event.minShells >= 1, `${event.id} minShells below 1`);
      assert.ok(event.minShells <= event.maxShells, `${event.id} min > max`);
    }
  });

  test('minShells increases with rank', () => {
    const apprenticeMin = Math.min(EVENTS.e001.minShells, EVENTS.e002.minShells, EVENTS.e003.minShells);
    const masterMin = Math.min(EVENTS.e013.minShells, EVENTS.e014.minShells, EVENTS.e015.minShells);
    assert.ok(masterMin > apprenticeMin, 'master events should require more shells than apprentice');
  });

  test('validateShow fails when below minShells', () => {
    const state = new GameState();
    const show = [makeShell()];
    const result = validateShow(state, 'e001', show);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'too_few_shells');
  });

  test('validateShow passes when shell count is within min and max', () => {
    const state = new GameState();
    const show = [makeShell(), makeShell(), makeShell()];
    const result = validateShow(state, 'e001', show);
    assert.equal(result.valid, true);
  });

  test('higher rank events enforce higher minimum', () => {
    const state = new GameState();
    state.rank = 'technician';
    state.completeMainEvent('e001');
    state.completeMainEvent('e004');
    const show = Array(3).fill(null).map(() => makeShell());
    const result = validateShow(state, 'e007', show);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'too_few_shells');
  });

  test('settleEvent with enough shells for technician main succeeds', () => {
    const state = new GameState();
    state.rank = 'technician';
    state.completeMainEvent('e001');
    state.completeMainEvent('e004');
    state.funds = 1000;
    const show = Array(4).fill(null).map((_, i) => makeShell({ id: `s${i}` }));
    const result = settleEvent(state, 'e007', show);
    assert.equal(result.success, true);
  });
});
