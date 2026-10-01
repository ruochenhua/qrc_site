import { PUBLIC_ACHIEVEMENTS } from './achievements.js';

export const MILESTONES = Object.freeze(
  PUBLIC_ACHIEVEMENTS
    .filter((achievement) => achievement.metric === 'totalWaterings')
    .map((achievement) => ({ threshold: achievement.threshold, label: achievement.title })),
);

export function getNextMilestone(totalWaterings) {
  const count = Number.isFinite(totalWaterings) && totalWaterings > 0
    ? Math.floor(totalWaterings)
    : 0;
  const next = MILESTONES.find((milestone) => milestone.threshold > count) ?? null;
  if (!next) return null;
  return { threshold: next.threshold, label: next.label, remaining: next.threshold - count };
}
