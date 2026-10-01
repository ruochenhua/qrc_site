import { describe, expect, it } from 'vitest';
import { getNextMilestone, MILESTONES } from '../../shared/milestones.js';

describe('shared-tree milestones', () => {
  it('keeps thresholds sorted and aligned with the growth ladder', () => {
    for (let index = 1; index < MILESTONES.length; index += 1) {
      expect(MILESTONES[index].threshold).toBeGreaterThan(MILESTONES[index - 1].threshold);
    }
    expect(MILESTONES.at(-1).threshold).toBe(1314);
  });

  it('reports the first milestone ahead with the remaining watering count', () => {
    expect(getNextMilestone(0)).toEqual({ threshold: 42, label: '小树开张', remaining: 42 });
    expect(getNextMilestone(41)).toMatchObject({ threshold: 42, remaining: 1 });
    expect(getNextMilestone(42)).toMatchObject({ threshold: 168, label: '一路有枝', remaining: 126 });
    expect(getNextMilestone(501)).toMatchObject({ threshold: 520, remaining: 19 });
  });

  it('advances past milestones exactly at their threshold and ends after the last one', () => {
    expect(getNextMilestone(167).threshold).toBe(168);
    expect(getNextMilestone(168).threshold).toBe(520);
    expect(getNextMilestone(1314)).toBeNull();
    expect(getNextMilestone(9000)).toBeNull();
  });

  it('treats missing or fractional counts as whole watering totals', () => {
    expect(getNextMilestone(undefined)).toMatchObject({ threshold: 42, remaining: 42 });
    expect(getNextMilestone(41.7)).toMatchObject({ threshold: 42, remaining: 1 });
  });
});
