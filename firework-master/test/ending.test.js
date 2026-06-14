import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { rankUp, canRankUp } from '../js/systems.js';

describe('Ending', () => {
  test('reaching master triggers win', () => {
    const state = new GameState();
    state.rank = 'expert';
    state.fame = 6000;
    state.completeMainEvent('e001');
    state.completeMainEvent('e004');
    state.completeMainEvent('e007');
    state.completeMainEvent('e010');
    assert.equal(canRankUp(state), true);
    assert.equal(rankUp(state), true);
    assert.equal(state.rank, 'master');
    assert.equal(state.gameOver, true);
    assert.equal(state.won, true);
  });

  test('lower rank ups do not trigger win', () => {
    const state = new GameState();
    state.completeMainEvent('e001');
    state.fame = 200;
    rankUp(state);
    assert.equal(state.rank, 'skilled');
    assert.equal(state.won, false);
    assert.equal(state.gameOver, false);
  });
});
