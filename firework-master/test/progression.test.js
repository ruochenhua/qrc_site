import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { canRankUp, rankUp, updateUnlocks } from '../js/systems.js';

describe('Career progression', () => {
  test('cannot rank up without fame', () => {
    const state = new GameState();
    state.completeMainEvent('e001');
    assert.equal(canRankUp(state), false);
  });

  test('cannot rank up without completing main event', () => {
    const state = new GameState();
    state.fame = 9999;
    assert.equal(canRankUp(state), false);
  });

  test('can rank up with fame and main event done', () => {
    const state = new GameState();
    state.completeMainEvent('e001');
    state.fame = 200;
    assert.equal(canRankUp(state), true);
    assert.equal(rankUp(state), true);
    assert.equal(state.rank, 'skilled');
  });

  test('cannot rank up beyond master', () => {
    const state = new GameState();
    state.rank = 'master';
    state.fame = 99999;
    state.completeMainEvent('e001');
    state.completeMainEvent('e004');
    state.completeMainEvent('e007');
    state.completeMainEvent('e010');
    state.completeMainEvent('e013');
    assert.equal(canRankUp(state), false);
    assert.equal(rankUp(state), false);
  });

  test('rank up unlocks recipes by fame threshold', () => {
    const state = new GameState();
    state.completeMainEvent('e001');
    state.fame = 200;
    rankUp(state);
    // Skilled examples unlockFame 100 should now be unlocked
    assert.ok(state.unlockedRecipes.has('r004'));
    assert.ok(state.unlockedRecipes.has('r005'));
    assert.ok(!state.unlockedRecipes.has('r006'));
  });

  test('updateUnlocks unlocks recipes based on current fame', () => {
    const state = new GameState();
    state.fame = 400;
    updateUnlocks(state);
    assert.ok(state.unlockedRecipes.has('r006'));
    assert.ok(!state.unlockedRecipes.has('r009'));
    state.fame = 1200;
    updateUnlocks(state);
    assert.ok(state.unlockedRecipes.has('r009'));
  });
});
