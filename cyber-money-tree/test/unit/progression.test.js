import { describe, expect, it } from 'vitest';
import { getGrowthStage, LEVELS } from '../../shared/progression.js';

describe('10-stage shared tree progression', () => {
  it('defines ten ordered stages with strictly increasing water thresholds', () => {
    expect(LEVELS).toHaveLength(10);
    expect(LEVELS.map((stage) => stage.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(LEVELS[0].minWaterings).toBe(0);
    for (let index = 1; index < LEVELS.length; index += 1) {
      expect(LEVELS[index].minWaterings).toBeGreaterThan(LEVELS[index - 1].minWaterings);
    }
  });

  it.each([
    [0, 1],
    [1, 2],
    [7, 2],
    [8, 3],
    [23, 3],
    [24, 4],
    [60, 5],
    [150, 6],
    [350, 7],
    [800, 8],
    [1800, 9],
    [5000, 10],
  ])('maps %i total waterings to level %i', (total, expectedLevel) => {
    expect(getGrowthStage(total).level).toBe(expectedLevel);
  });

  it('reports useful progress toward the next shared milestone', () => {
    expect(getGrowthStage(4)).toMatchObject({ level: 2, nextThreshold: 8 });
    expect(getGrowthStage(4).progress).toBeCloseTo(3 / 7);
    expect(getGrowthStage(5000)).toMatchObject({ level: 10, progress: 1, nextThreshold: null });
  });

  it('clamps invalid counts to zero instead of inventing a tree level', () => {
    expect(getGrowthStage(-10).level).toBe(1);
    expect(getGrowthStage(Number.NaN).level).toBe(1);
  });
});
