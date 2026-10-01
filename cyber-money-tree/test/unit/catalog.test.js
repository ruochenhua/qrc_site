import { describe, expect, it } from 'vitest';
import {
  composePhrase,
  isPhraseCombinationAllowed,
  isPosterUnlocked,
  POSTERS,
  PHRASE_SUBJECTS,
} from '../../shared/catalog.js';

describe('safe leaf-card catalog', () => {
  it('has posters unlocked at sensible shared-tree stages', () => {
    expect(POSTERS.length).toBeGreaterThanOrEqual(4);
    expect(POSTERS[0].unlockLevel).toBe(1);
    expect(POSTERS.find((poster) => poster.id === 'cosmic-wishes').unlockLevel).toBe(10);
    expect(isPosterUnlocked('office-sun', 1)).toBe(true);
    expect(isPosterUnlocked('window-garden', 1)).toBe(false);
    expect(isPosterUnlocked('missing-poster', 10)).toBe(false);
  });

  it('composes only reviewed short phrases from fixed parts', () => {
    expect(composePhrase('passerby', 'drink-water')).toBe('路过的你，请记得喝口水。');
    expect(composePhrase('worker', 'clock-out')).toBe('今天的打工人，也值得早点下班。');
    expect(composePhrase('passerby', 'clock-out')).toBeNull();
    expect(composePhrase('<script>', 'drink-water')).toBeNull();
    expect(PHRASE_SUBJECTS.length).toBeGreaterThanOrEqual(4);
  });

  it('exposes an explicit check for allowed phrase combinations', () => {
    expect(isPhraseCombinationAllowed('passerby', 'drink-water')).toBe(true);
    expect(isPhraseCombinationAllowed('passerby', 'clock-out')).toBe(false);
  });
});
