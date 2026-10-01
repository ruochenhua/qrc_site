export const LEVELS = Object.freeze([
  { level: 1, minWaterings: 0, name: '工位绿芽', sceneId: 'office', description: '窗边办公桌上的小盆发财树。' },
  { level: 2, minWaterings: 1, name: '茂盛工位', sceneId: 'office', description: '新叶冒出来，整个工位都亮堂了。' },
  { level: 3, minWaterings: 8, name: '窗边大树', sceneId: 'window', description: '枝叶已经碰到窗框。' },
  { level: 4, minWaterings: 24, name: '伸出窗外', sceneId: 'window', description: '枝条探出窗外，晒到了城市的太阳。' },
  { level: 5, minWaterings: 60, name: '沿楼攀升', sceneId: 'window', description: '发财树顺着楼体向上生长。' },
  { level: 6, minWaterings: 150, name: '冲破屋顶', sceneId: 'rooftop', description: '树冠终于穿过屋顶，伸向蓝天。' },
  { level: 7, minWaterings: 350, name: '天台树园', sceneId: 'rooftop', description: '整座天台都成了发财树的花园。' },
  { level: 8, minWaterings: 800, name: '街区树荫', sceneId: 'city', description: '树冠连起楼群，为整个街区遮阳。' },
  { level: 9, minWaterings: 1800, name: '行星发财树', sceneId: 'cosmic', description: '根系绕住了地球，发财树进入太空。' },
  { level: 10, minWaterings: 5000, name: '银河财气', sceneId: 'cosmic', description: '果实挂成行星，树冠铺满银河。' },
]);

export function getGrowthStage(totalWaterings) {
  const count = Number.isFinite(totalWaterings) && totalWaterings > 0
    ? Math.floor(totalWaterings)
    : 0;

  let index = 0;
  for (let candidate = 1; candidate < LEVELS.length; candidate += 1) {
    if (count < LEVELS[candidate].minWaterings) break;
    index = candidate;
  }

  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next
    ? Math.max(0, Math.min(1, (count - current.minWaterings) / (next.minWaterings - current.minWaterings)))
    : 1;

  return {
    ...current,
    totalWaterings: count,
    nextLevel: next?.level ?? null,
    nextThreshold: next?.minWaterings ?? null,
    progress,
  };
}
