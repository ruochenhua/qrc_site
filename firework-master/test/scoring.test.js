import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { calculateScore, calculateRewards, getScoreMultiplier, getScoreGrade, startCompetition, settleCompetitionRound, finishCompetition, assembleShell } from '../js/systems.js';

describe('Scoring', () => {
  test('well-matched shell scores high', () => {
    // r001 is red with crackle, a good fit for e001
    const result = calculateScore('e001', ['r001']);
    assert.ok(result.baseScore > 50, `expected baseScore > 50, got ${result.baseScore}`);
    assert.ok(result.score > 50, `expected score > 50, got ${result.score}`);
  });

  test('combo bonus increases score', () => {
    // 年味: red>=2, gold>=2, crackle>=1
    const show = ['r001', 'r001', 'r002', 'r002', 'r008'];
    const result = calculateScore('e001', show);
    assert.ok(result.comboBonus > 0);
    assert.ok(result.combos.includes('newYear'));
  });

  test('repeat penalty reduces score', () => {
    const single = calculateScore('e001', ['r001']);
    const repeated = calculateScore('e001', Array(4).fill('r001'));
    assert.ok(repeated.repeatPenalty > single.repeatPenalty);
    assert.ok(repeated.score < single.score);
  });

  test('score capped at 100', () => {
    const result = calculateScore('e001', ['r001', 'r002', 'r003', 'r004']);
    assert.ok(result.score <= 100);
  });

  test('empty show returns zero', () => {
    const result = calculateScore('e001', []);
    assert.equal(result.score, 0);
  });
});

describe('Rewards', () => {
  test('score multipliers and grades', () => {
    assert.equal(getScoreMultiplier(95), 1.5);
    assert.equal(getScoreGrade(95), 'S');
    assert.equal(getScoreMultiplier(80), 1.2);
    assert.equal(getScoreGrade(80), 'A');
    assert.equal(getScoreMultiplier(60), 1.0);
    assert.equal(getScoreGrade(60), 'B');
    assert.equal(getScoreMultiplier(50), 0.7);
    assert.equal(getScoreGrade(50), 'C');
    assert.equal(getScoreMultiplier(30), 0.4);
    assert.equal(getScoreGrade(30), 'D');
  });

  test('competition rewards fame-heavy', () => {
    const rewards = calculateRewards('e001', 100);
    // e001 rewards: funds 30, fame 60; competition: fame * 1.5, funds * 0.5 * 1.5
    assert.equal(rewards.fame, Math.round(60 * 1.5));
    assert.equal(rewards.funds, Math.round(30 * 0.5 * 1.5));
  });

  test('activity rewards funds-heavy', () => {
    const rewards = calculateRewards('e002', 100);
    // e002 rewards: funds 80, fame 20; activity: funds * 1.5, fame * 0.5 * 1.5
    assert.equal(rewards.funds, Math.round(80 * 1.5));
    assert.equal(rewards.fame, Math.round(20 * 0.5 * 1.5));
  });
});

function cheapShell() {
  return assembleShell({ gunpowder: { g001: 1 }, casing: 'c001', colorant: { col001: 1 }, fuse: 'f001', effect: {} });
}

function cheapShow(count = 2) {
  return Array(count).fill(null).map((_, i) => ({ ...cheapShell(), id: `cs_${i}` }));
}

describe('Settlement', () => {
  test('competition round and finish updates state and gives rewards', () => {
    const state = new GameState();
    const initialFunds = state.funds;
    startCompetition(state, 'e001');
    const round = settleCompetitionRound(state, cheapShow(2));
    assert.equal(round.success, true);
    const result = finishCompetition(state);
    assert.equal(result.success, true);
    assert.ok(round.roundResult.score.score > 0);
    assert.ok(result.rewards.fame > 0);
    assert.ok(state.isMainEventCompleted('e001'));
    assert.equal(state.funds, initialFunds - round.roundResult.cost + result.rewards.funds);
    assert.equal(state.fame, result.rewards.fame);
  });

  test('first clear bonus applied in competition finish', () => {
    const state = new GameState();
    startCompetition(state, 'e001');
    settleCompetitionRound(state, cheapShow(2));
    const result = finishCompetition(state);
    assert.equal(result.isFirstClear, true);
    assert.ok(result.rewards.fame > 0);
    assert.ok(result.competition, 'competition events include elimination result');
  });

  test('invalid competition show returns failure', () => {
    const state = new GameState();
    startCompetition(state, 'e001');
    // e001 minShells is 2; use two r005 which is not owned.
    const result = settleCompetitionRound(state, ['r005', 'r005']);
    assert.equal(result.success, false);
    assert.equal(result.reason, 'recipe_not_owned');
  });
});
