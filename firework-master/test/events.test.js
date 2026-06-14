import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import {
  getEventById,
  getAvailableEvents,
  isEventAvailable,
  getMainEventIdsUpToRank,
  getCurrentRankMainEvents,
} from '../js/systems.js';

describe('Event selection', () => {
  test('getEventById returns event or null', () => {
    assert.equal(getEventById('e001').name, '村口庙会');
    assert.equal(getEventById('nonexistent'), null);
  });

  test('apprentice sees only apprentice events', () => {
    const state = new GameState();
    const available = getAvailableEvents(state);
    const ids = available.map(e => e.id).sort();
    assert.deepEqual(ids, ['e001', 'e002', 'e003']);
  });

  test('main events must be completed in order', () => {
    const state = new GameState();
    state.rank = 'skilled';
    // e004 (skilled main) should be unavailable until e001 is completed
    assert.ok(!isEventAvailable(state, 'e004'));
    state.completeMainEvent('e001');
    assert.ok(isEventAvailable(state, 'e004'));
  });

  test('completed main events are hidden', () => {
    const state = new GameState();
    state.completeMainEvent('e001');
    const available = getAvailableEvents(state);
    const ids = available.map(e => e.id).sort();
    assert.deepEqual(ids, ['e002', 'e003']);
  });

  test('activities, repeatables and fallback remain available', () => {
    const state = new GameState();
    state.rank = 'master';
    state.completeMainEvent('e001');
    state.completeMainEvent('e004');
    state.completeMainEvent('e007');
    state.completeMainEvent('e010');
    state.completeMainEvent('e013');
    const available = getAvailableEvents(state);
    const ids = available.map(e => e.id).sort();
    assert.deepEqual(ids, ['e002', 'e003', 'e005', 'e006', 'e008', 'e009', 'e011', 'e012', 'e014', 'e015']);
  });

  test('getMainEventIdsUpToRank returns ordered main events', () => {
    assert.deepEqual(getMainEventIdsUpToRank('apprentice'), ['e001']);
    assert.deepEqual(getMainEventIdsUpToRank('skilled'), ['e001', 'e004']);
    assert.deepEqual(getMainEventIdsUpToRank('master'), ['e001', 'e004', 'e007', 'e010', 'e013']);
  });

  test('getCurrentRankMainEvents', () => {
    const state = new GameState();
    assert.deepEqual(getCurrentRankMainEvents(state).map(e => e.id), ['e001']);
    state.rank = 'master';
    assert.deepEqual(getCurrentRankMainEvents(state).map(e => e.id), ['e013']);
  });
});
