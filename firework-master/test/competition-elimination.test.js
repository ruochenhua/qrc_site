import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import {
  runCompetition,
  calculateCompetitionRewards,
  settleEvent,
  getEventById,
  getCompetitionRoundNames,
  startCompetition,
  settleCompetitionRound,
  finishCompetition,
  getRoundPreference,
  assembleShell,
} from '../js/systems.js';
import { EVENTS } from '../js/config.js';

function cheapShell() {
  return assembleShell({ gunpowder: { g001: 1 }, casing: 'c001', colorant: { col001: 1 }, fuse: 'f001', effect: {} });
}

function cheapShow(count = 2) {
  return Array(count).fill(null).map((_, i) => ({ ...cheapShell(), id: `cs_${i}` }));
}

describe('Competition elimination', () => {
  test('runCompetition returns rounds and a final rank', () => {
    const event = getEventById('e001');
    const result = runCompetition(event, 80);
    assert.ok(result.finalRank >= 1);
    assert.ok(result.roundResults.length >= 3);
    assert.equal(result.roundResults[0].round, 1);
  });

  test('high player score wins all rounds and ranks 1st', () => {
    const event = getEventById('e001');
    const result = runCompetition(event, 100);
    assert.equal(result.finalRank, 1);
    assert.ok(result.roundResults.every(r => r.won));
  });

  test('low player score loses early and ranks lower', () => {
    const event = getEventById('e001');
    const result = runCompetition(event, 10);
    assert.ok(result.finalRank > 1);
    assert.ok(result.roundResults.some(r => !r.won));
  });

  test('rank 1 gives more fame than lower ranks', () => {
    const event = getEventById('e001');
    const first = calculateCompetitionRewards(event, 80, 1);
    const fourth = calculateCompetitionRewards(event, 80, 4);
    assert.ok(first.fame > fourth.fame);
  });

  test('settleEvent rejects competition events and tells caller to use competition flow', () => {
    const state = new GameState();
    const result = settleEvent(state, 'e001', ['r001', 'r002', 'r003']);
    assert.equal(result.success, false);
    assert.equal(result.reason, 'use_competition_flow');
  });

  test('settleEvent does not include competition result for activity events', () => {
    const state = new GameState();
    const result = settleEvent(state, 'e002', ['r001', 'r002', 'r003']);
    assert.equal(result.success, true);
    assert.equal(result.competition, null);
  });

  test('startCompetition initializes multi-round state', () => {
    const state = new GameState();
    const result = startCompetition(state, 'e001');
    assert.equal(result.success, true);
    assert.ok(state.competition);
    assert.equal(state.competition.eventId, 'e001');
    assert.equal(state.competition.round, 1);
    assert.equal(state.competition.remaining, 8);
  });

  test('settleCompetitionRound deducts round cost and advances on win', () => {
    const state = new GameState();
    startCompetition(state, 'e001');
    const beforeFunds = state.funds;
    const result = settleCompetitionRound(state, cheapShow(2));
    assert.equal(result.success, true);
    assert.ok(state.funds <= beforeFunds);
    if (result.advanced) {
      assert.equal(state.competition.round, 2);
      assert.equal(state.competition.remaining, 4);
    }
  });

  test('finishCompetition computes final rank and rewards', () => {
    const state = new GameState();
    startCompetition(state, 'e001');
    settleCompetitionRound(state, cheapShow(2));
    const result = finishCompetition(state);
    assert.equal(result.success, true);
    assert.ok(result.finalRank >= 1);
    assert.ok(typeof result.rewards.funds === 'number');
    assert.ok(typeof result.rewards.fame === 'number');
    assert.equal(state.competition, null);
  });

  test('getRoundPreference scales preferences by round', () => {
    const event = getEventById('e001');
    const first = getRoundPreference(event, 1, 3);
    const last = getRoundPreference(event, 3, 3);
    assert.ok(last.height >= first.height);
    assert.ok(last.scale >= first.scale);
    assert.ok(last.complexity >= first.complexity);
  });

  test('runCompetition round results include names and played flag', () => {
    const event = getEventById('e001');
    const result = runCompetition(event, 80);
    for (const r of result.roundResults) {
      assert.ok(typeof r.name === 'string' && r.name.length > 0);
      assert.ok(typeof r.played === 'boolean');
    }
  });

  test('runCompetition marks unplayed rounds after elimination', () => {
    const event = getEventById('e001');
    const result = runCompetition(event, 10);
    const played = result.roundResults.filter(r => r.played);
    const unplayed = result.roundResults.filter(r => !r.played);
    assert.ok(played.length >= 1);
    assert.ok(unplayed.length >= 1);
    assert.ok(played.every(r => r.playerScore !== null));
    assert.ok(unplayed.every(r => r.playerScore === null));
  });

  test('getCompetitionRoundNames returns named rounds for event', () => {
    const event = getEventById('e001');
    const names = getCompetitionRoundNames(event);
    assert.ok(names.length >= 3);
    assert.ok(names.includes('决赛'));
    assert.ok(names.includes('半决赛'));
  });
});

describe('Activity large shell count', () => {
  test('activities allow more shells than competitions at the same rank', () => {
    const pairs = [
      ['e002', 'e001'],
      ['e005', 'e004'],
      ['e008', 'e007'],
      ['e011', 'e010'],
      ['e014', 'e013'],
    ];
    for (const [activityId, competitionId] of pairs) {
      const activity = EVENTS[activityId];
      const competition = EVENTS[competitionId];
      assert.ok(activity.maxShells > competition.maxShells,
        `${activityId} maxShells (${activity.maxShells}) should exceed ${competitionId} (${competition.maxShells})`);
    }
  });

  test('activity validates a large show within its maxShells', () => {
    const state = new GameState();
    state.funds = 10000;
    const shell = {
      id: 'shell_1',
      name: '测试烟花',
      color: { red: 1 },
      shape: 'peony',
      height: 0.3,
      scale: 0.4,
      density: 0.5,
      duration: 0.4,
      effects: {},
      cost: 1,
      components: { gunpowder: { g001: 2 }, casing: 'c001', colorant: { col001: 2 }, fuse: 'f002', effect: {} },
    };
    const show = Array(25).fill(null).map((_, i) => ({ ...shell, id: `s${i}` }));
    const result = settleEvent(state, 'e002', show);
    assert.equal(result.success, true);
  });
});
