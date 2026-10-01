import { describe, expect, it } from 'vitest';
import {
  countConsecutiveCommons,
  getRarityChances,
  PITY_AFTER,
  rollRarity,
} from '../../shared/rarity.js';

function seededRandom(...values) {
  const queue = [...values];
  return () => (queue.length > 1 ? queue.shift() : values.at(-1));
}

describe('leaf rarity rolls', () => {
  it('resolves base boundaries at poster level one', () => {
    expect(rollRarity(seededRandom(0), 0, 1)).toBe('common');
    expect(rollRarity(seededRandom(0.8999), 0, 1)).toBe('common');
    expect(rollRarity(seededRandom(0.9), 0, 1)).toBe('rare');
    expect(rollRarity(seededRandom(0.9899), 0, 1)).toBe('rare');
    expect(rollRarity(seededRandom(0.99), 0, 1)).toBe('legendary');
    expect(rollRarity(seededRandom(0.9999), 0, 1)).toBe('legendary');
  });

  it('guarantees rare or better once the common pity threshold is reached', () => {
    expect(PITY_AFTER).toBe(10);
    expect(rollRarity(seededRandom(0.99), PITY_AFTER, 1)).toBe('rare');
    expect(rollRarity(seededRandom(0.5), 11, 1)).toBe('rare');
    expect(rollRarity(seededRandom(0.05), PITY_AFTER, 1)).toBe('legendary');
    expect(rollRarity(seededRandom(0.5), PITY_AFTER - 1, 1)).toBe('common');
  });

  it('raises rare and legendary odds for higher-level posters', () => {
    const low = getRarityChances(1);
    const high = getRarityChances(10);
    expect(high.legendary).toBeGreaterThan(low.legendary);
    expect(high.rare).toBeGreaterThan(low.rare);
    expect(high.common).toBeLessThan(low.common);
    expect(high.common + high.rare + high.legendary).toBeCloseTo(1);
    expect(getRarityChances(99).legendary).toBe(getRarityChances(10).legendary);
    expect(rollRarity(seededRandom(0.85), 0, 10)).toBe('rare');
    expect(rollRarity(seededRandom(0.85), 0, 1)).toBe('common');
    expect(rollRarity(seededRandom(0.96), 0, 10)).toBe('legendary');
    expect(rollRarity(seededRandom(0.96), 0, 1)).toBe('rare');
  });

  it('counts leading commons from newest to oldest', () => {
    expect(countConsecutiveCommons(['common', 'common', 'rare'])).toBe(2);
    expect(countConsecutiveCommons(['common', 'common', 'common'])).toBe(3);
    expect(countConsecutiveCommons(['rare', 'common'])).toBe(0);
    expect(countConsecutiveCommons([])).toBe(0);
    expect(countConsecutiveCommons(null)).toBe(0);
  });
});
