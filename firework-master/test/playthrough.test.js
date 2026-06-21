import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { getRecipeById, assembleShell, researchComponent, startCompetition, settleCompetitionRound, finishCompetition } from '../js/systems.js';
import { COMPONENTS, COMPONENT_CATEGORIES } from '../js/config.js';

function buyComponents(state, ids) {
  for (const id of ids) {
    for (const cat of COMPONENT_CATEGORIES) {
      if (COMPONENTS[cat][id]) {
        researchComponent(state, cat, id);
        break;
      }
    }
  }
}

function playCompetition(state, eventId, makeShow) {
  const start = startCompetition(state, eventId);
  if (!start.success) return start;
  while (state.competition && !state.competition.finished) {
    const round = state.competition.round;
    const show = makeShow(round);
    const result = settleCompetitionRound(state, show);
    if (!result.success) return result;
  }
  return finishCompetition(state);
}

describe('Full playthrough', () => {
  test('default start can reach master through main events', () => {
    const state = new GameState();
    state.addFunds(8000); // ensure enough money to buy required components and multiple rounds
    assert.equal(state.rank, 'apprentice');

    // e001: village temple fair, likes red + crackle
    const redCrackle = () => assembleShell({
      gunpowder: { g001: 3 }, casing: 'c001', colorant: { col001: 3 }, fuse: 'f002', effect: { e002: 2 },
    });
    const goldShell = () => assembleShell({
      gunpowder: { g001: 4 }, casing: 'c001', colorant: { col002: 4 }, fuse: 'f002', effect: {},
    });
    const r1 = playCompetition(state, 'e001', () => [redCrackle(), redCrackle(), redCrackle(), goldShell()]);
    assert.equal(r1.success, true);
    assert.ok(r1.finalRank >= 1, `e001 finalRank ${r1.finalRank}`);
    assert.equal(state.rank, 'skilled');

    // e004: county fireworks, likes height/scale + blue/white + tail/glitter
    buyComponents(state, ['c004', 'f003', 'e001', 'e003']);
    const blueWhite = () => assembleShell({
      gunpowder: { g002: 5 }, casing: 'c004', colorant: { col003: 4, col005: 2 }, fuse: 'f003', effect: { e001: 2, e003: 2 },
    });
    const r2 = playCompetition(state, 'e004', () => [blueWhite(), blueWhite(), blueWhite()]);
    assert.equal(r2.success, true);
    assert.ok(r2.finalRank >= 1, `e004 finalRank ${r2.finalRank}`);
    assert.equal(state.rank, 'technician');

    // e007: city competition, likes height/scale + multicolor + tail/strobe
    buyComponents(state, ['g003', 'c009', 'e004']);
    const r6 = getRecipeById('r006');
    const highMultiA = () => assembleShell({
      gunpowder: { g003: 5 }, casing: 'c009', colorant: { col001: 2, col003: 2, col005: 2 }, fuse: 'f003', effect: { e003: 3, e004: 2 },
    });
    const highMultiB = () => assembleShell({
      gunpowder: { g003: 6 }, casing: 'c009', colorant: { col002: 2, col004: 2, col005: 2 }, fuse: 'f003', effect: { e003: 2, e004: 2 },
    });
    const r3 = playCompetition(state, 'e007', (round) => round <= 2
      ? [r6, r6, highMultiA(), highMultiB()]
      : [highMultiA(), highMultiA(), highMultiB(), highMultiB()]);
    assert.equal(r3.success, true);
    assert.ok(r3.finalRank >= 1, `e007 finalRank ${r3.finalRank}`);
    assert.equal(state.rank, 'expert');

    // e010: provincial championship, likes gold/silver + bouquet
    buyComponents(state, ['col008', 'e005']);
    const r8 = getRecipeById('r008');
    const goldSilverA = () => assembleShell({
      gunpowder: { g003: 4 }, casing: 'c009', colorant: { col002: 5, col008: 3 }, fuse: 'f003', effect: { e005: 4 },
    });
    const goldSilverB = () => assembleShell({
      gunpowder: { g003: 5 }, casing: 'c009', colorant: { col002: 4, col008: 3 }, fuse: 'f003', effect: { e005: 4 },
    });
    const r4 = playCompetition(state, 'e010', (round) => round <= 2
      ? [r8, r8, goldSilverA(), goldSilverB(), goldSilverA()]
      : [goldSilverA(), goldSilverA(), goldSilverB(), goldSilverB(), goldSilverA()]);
    assert.equal(r4.success, true);
    assert.ok(r4.finalRank >= 1, `e010 finalRank ${r4.finalRank}`);

    assert.equal(state.rank, 'master');
    assert.equal(state.won, true);
    assert.equal(state.gameOver, true);
    assert.ok(state.funds >= 0, 'funds should not go negative');
  });
});
