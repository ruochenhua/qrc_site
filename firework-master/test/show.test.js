import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { getShowCost, validateShow, assembleShell, startCompetition, settleCompetitionRound, finishCompetition } from '../js/systems.js';
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

describe('Show builder with assembled shells', () => {
  test('getShowCost sums shell costs', () => {
    const show = [makeShell({ cost: 10 }), makeShell({ cost: 20 }), makeShell({ cost: 15 })];
    assert.equal(getShowCost(show), 45);
    assert.equal(getShowCost([]), 0);
  });

  test('valid show within budget and shell limit', () => {
    const state = new GameState();
    const show = [makeShell({ cost: 12 }), makeShell({ cost: 16 }), makeShell({ cost: 12 })];
    const result = validateShow(state, 'e002', show);
    assert.equal(result.valid, true);
    assert.equal(result.cost, 40);
  });

  test('empty show is invalid', () => {
    const state = new GameState();
    const result = validateShow(state, 'e001', []);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'empty_show');
  });

  test('competition hard budget enforced', () => {
    const state = new GameState();
    const show = Array(6).fill(null).map(() => makeShell({ cost: 16 }));
    const result = validateShow(state, 'e001', show);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'over_budget');
  });

  test('activity soft budget allows over-budget shows', () => {
    const state = new GameState();
    state.rank = 'skilled';
    state.completeMainEvent('e001');
    const show = Array(8).fill(null).map(() => makeShell({ cost: 20 }));
    const result = validateShow(state, 'e002', show);
    assert.equal(result.valid, true);
  });

  test('maxShells enforced', () => {
    const state = new GameState();
    const show = Array(7).fill(null).map(() => makeShell());
    const result = validateShow(state, 'e001', show);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'too_many_shells');
  });

  test('shells using unlocked components are valid', () => {
    const state = new GameState();
    const shell = assembleShell({ gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f002', effect: {} });
    const result = validateShow(state, 'e002', [shell, shell]);
    assert.equal(result.valid, true);
  });

  test('shells using locked components are invalid', () => {
    const state = new GameState();
    const shell = assembleShell({ gunpowder: { g003: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f002', effect: {} });
    const validShell = assembleShell({ gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f002', effect: {} });
    const result = validateShow(state, 'e002', [shell, validShell]);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'component_not_unlocked');
  });

  test('GameState stores shell objects in currentShow', () => {
    const state = new GameState();
    const shell = makeShell();
    state.addToShow(shell);
    assert.equal(state.currentShow.length, 1);
    assert.equal(state.currentShow[0].cost, 12);
  });

  test('removeFromShow removes shell at index', () => {
    const state = new GameState();
    state.addToShow(makeShell({ id: 'a' }));
    state.addToShow(makeShell({ id: 'b' }));
    state.removeFromShow(0);
    assert.equal(state.currentShow.length, 1);
    assert.equal(state.currentShow[0].id, 'b');
  });

  test('competition round works with assembled shell objects', () => {
    const state = new GameState();
    const shell = assembleShell({ gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f002', effect: {} });
    const initialFunds = state.funds;
    startCompetition(state, 'e001');
    const round = settleCompetitionRound(state, [shell, shell]);
    assert.equal(round.success, true);
    const result = finishCompetition(state);
    assert.equal(result.success, true);
    assert.ok(round.roundResult.score.score > 0);
    assert.ok(state.isMainEventCompleted('e001'));
    assert.equal(state.funds, initialFunds - shell.cost * 2 + result.rewards.funds);
  });

  test('entry fee is validated and included in total cost', () => {
    const state = new GameState();
    state.funds = 5;
    const shell = makeShell({ cost: 1 });
    EVENTS.e_test = { ...EVENTS.e001, id: 'e_test', entryFee: 100, minShells: 1, budget: 1000 };
    try {
      const tooPoor = validateShow(state, 'e_test', [shell, shell]);
      assert.equal(tooPoor.valid, false);
      assert.equal(tooPoor.reason, 'insufficient_entry_fee');

      state.funds = 150;
      const ok = validateShow(state, 'e_test', [shell, shell]);
      assert.equal(ok.valid, true);
      assert.equal(ok.cost, shell.cost * 2 + 100);
    } finally {
      delete EVENTS.e_test;
    }
  });
});
