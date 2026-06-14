import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../js/state.js';
import { getRecipeById, assembleShell, settleEvent } from '../js/systems.js';

describe('Full playthrough', () => {
  test('default start can reach master through main events', () => {
    const state = new GameState();
    assert.equal(state.rank, 'apprentice');

    // e001: village temple fair, likes red + crackle
    const redCrackle = () => assembleShell({
      gunpowder: { g001: 3 }, casing: 'c001', colorant: { col001: 3 }, fuse: 'f002', effect: { e002: 2 },
    });
    const goldShell = () => assembleShell({
      gunpowder: { g001: 4 }, casing: 'c001', colorant: { col002: 4 }, fuse: 'f002', effect: {},
    });
    const r1 = settleEvent(state, 'e001', [redCrackle(), redCrackle(), redCrackle(), goldShell()]);
    assert.equal(r1.success, true);
    assert.ok(r1.score.score >= 60, `e001 score ${r1.score.score}`);
    assert.equal(state.rank, 'skilled');

    // e004: county fireworks, likes height/scale + blue/white + tail/glitter
    const blueWhite = () => assembleShell({
      gunpowder: { g002: 5 }, casing: 'c004', colorant: { col003: 4, col005: 2 }, fuse: 'f003', effect: { e001: 2, e003: 2 },
    });
    const r2 = settleEvent(state, 'e004', [blueWhite(), blueWhite(), blueWhite()]);
    assert.equal(r2.success, true);
    assert.ok(r2.score.score >= 60, `e004 score ${r2.score.score}`);
    assert.equal(state.rank, 'technician');

    // e007: city competition, likes height/scale + multicolor + tail/strobe
    const r6 = getRecipeById('r006');
    const highMultiA = () => assembleShell({
      gunpowder: { g003: 5 }, casing: 'c009', colorant: { col001: 2, col003: 2, col005: 2 }, fuse: 'f003', effect: { e003: 3, e004: 2 },
    });
    const highMultiB = () => assembleShell({
      gunpowder: { g003: 6 }, casing: 'c009', colorant: { col002: 2, col004: 2, col005: 2 }, fuse: 'f003', effect: { e003: 2, e004: 2 },
    });
    const r3 = settleEvent(state, 'e007', [r6, r6, highMultiA(), highMultiB()]);
    assert.equal(r3.success, true);
    assert.ok(r3.score.score >= 60, `e007 score ${r3.score.score}`);
    assert.equal(state.rank, 'expert');

    // e010: provincial championship, likes gold/silver + bouquet
    const r8 = getRecipeById('r008');
    const goldSilverA = () => assembleShell({
      gunpowder: { g003: 4 }, casing: 'c009', colorant: { col002: 5, col008: 3 }, fuse: 'f003', effect: { e005: 4 },
    });
    const goldSilverB = () => assembleShell({
      gunpowder: { g003: 5 }, casing: 'c009', colorant: { col002: 4, col008: 3 }, fuse: 'f003', effect: { e005: 4 },
    });
    const r4 = settleEvent(state, 'e010', [r8, r8, goldSilverA(), goldSilverB(), goldSilverA()]);
    assert.equal(r4.success, true);
    assert.ok(r4.score.score >= 60, `e010 score ${r4.score.score}`);

    assert.equal(state.rank, 'master');
    assert.equal(state.won, true);
    assert.equal(state.gameOver, true);
    assert.ok(state.funds >= 0, 'funds should not go negative');
  });
});
