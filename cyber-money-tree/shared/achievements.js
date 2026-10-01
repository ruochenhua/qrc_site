export const COMBO_WINDOW_MS = 10 * 60 * 1000;

export const ACHIEVEMENTS = Object.freeze([
  { id: 'water-42', track: 'water', metric: 'totalWaterings', threshold: 42, title: '小树开张', description: '第一圈年轮，从这滴开始。', posterId: 'achievement-water-42', posterTitle: '小树开张', posterAsset: 'assets/achievements/water-42.webp' },
  { id: 'water-168', track: 'water', metric: 'totalWaterings', threshold: 168, title: '一路有枝', description: '树枝一路伸展，风景也一路变多。', posterId: 'achievement-water-168', posterTitle: '一路有枝', posterAsset: 'assets/achievements/water-168.webp' },
  { id: 'water-520', track: 'water', metric: 'totalWaterings', threshold: 520, title: '树有来头', description: '这棵树已经有了自己的故事。', posterId: 'achievement-water-520', posterTitle: '树有来头', posterAsset: 'assets/achievements/water-520.webp' },
  { id: 'water-1314', track: 'water', metric: 'totalWaterings', threshold: 1314, title: '枝久天长', description: '许多日常汇在一起，长成了长久。', posterId: 'achievement-water-1314', posterTitle: '枝久天长', posterAsset: 'assets/achievements/water-1314.webp' },

  { id: 'visitors-3', track: 'visitors', metric: 'uniqueVisitors', threshold: 3, title: '凑齐三片叶', description: '三位树友，刚好围成一个小圈。', posterId: 'achievement-visitors-3', posterTitle: '凑齐三片叶', posterAsset: 'assets/achievements/visitors-3.webp' },
  { id: 'visitors-8', track: 'visitors', metric: 'uniqueVisitors', threshold: 8, title: '一桌树友', description: '树下的位置，已经坐满一桌。', posterId: 'achievement-visitors-8', posterTitle: '一桌树友', posterAsset: 'assets/achievements/visitors-8.webp' },
  { id: 'visitors-24', track: 'visitors', metric: 'uniqueVisitors', threshold: 24, title: '整条街都知道了', description: '枝叶探过街角，认识了更多路过的人。', posterId: 'achievement-visitors-24', posterTitle: '整条街都知道了', posterAsset: 'assets/achievements/visitors-24.webp' },
  { id: 'visitors-88', track: 'visitors', metric: 'uniqueVisitors', threshold: 88, title: '枝枝顺意', description: '许多双手，把好意一枝枝接起来。', posterId: 'achievement-visitors-88', posterTitle: '枝枝顺意', posterAsset: 'assets/achievements/visitors-88.webp' },
  { id: 'visitors-233', track: 'visitors', metric: 'uniqueVisitors', threshold: 233, title: '树下笑出声', description: '这里留下的不止祝福，还有笑声。', posterId: 'achievement-visitors-233', posterTitle: '树下笑出声', posterAsset: 'assets/achievements/visitors-233.webp' },

  { id: 'leaves-5', track: 'leaves', metric: 'visitorLeaves', threshold: 5, title: '初次递话', description: '第一批写给陌生人的小小祝福。', posterId: 'achievement-leaves-5', posterTitle: '初次递话', posterAsset: 'assets/achievements/leaves-5.webp' },
  { id: 'leaves-17', track: 'leaves', metric: 'visitorLeaves', threshold: 17, title: '叶上有回音', description: '祝福落在树下，也从树下传出去。', posterId: 'achievement-leaves-17', posterTitle: '叶上有回音', posterAsset: 'assets/achievements/leaves-17.webp' },
  { id: 'leaves-52', track: 'leaves', metric: 'visitorLeaves', threshold: 52, title: '树下开信局', description: '一张张叶笺，慢慢成了常来的约定。', posterId: 'achievement-leaves-52', posterTitle: '树下开信局', posterAsset: 'assets/achievements/leaves-52.webp' },
  { id: 'leaves-188', track: 'leaves', metric: 'visitorLeaves', threshold: 188, title: '叶笺不断', description: '这份心意，已经写了很长一程。', posterId: 'achievement-leaves-188', posterTitle: '叶笺不断', posterAsset: 'assets/achievements/leaves-188.webp' },
  { id: 'leaves-666', track: 'leaves', metric: 'visitorLeaves', threshold: 666, title: '好运叠满', description: '树下的好运，已经堆成一座小山。', posterId: 'achievement-leaves-666', posterTitle: '好运叠满', posterAsset: null, artworkStatus: 'work-in-progress' },

  { id: 'combo-1', track: 'combo', metric: 'comboSegments', threshold: 1, title: '首棒接上', description: '第一段树友接力，已经开始。', posterId: 'achievement-combo-1', posterTitle: '首棒接上', posterAsset: null, artworkStatus: 'work-in-progress' },
  { id: 'combo-4', track: 'combo', metric: 'comboSegments', threshold: 4, title: '水滴接力', description: '四次接力，把一滴水送过了远方。', posterId: 'achievement-combo-4', posterTitle: '水滴接力', posterAsset: null, artworkStatus: 'work-in-progress' },
  { id: 'combo-16', track: 'combo', metric: 'comboSegments', threshold: 16, title: '不断线的溪', description: '一段段相遇，汇成了溪流。', posterId: 'achievement-combo-16', posterTitle: '不断线的溪', posterAsset: null, artworkStatus: 'work-in-progress' },
  { id: 'combo-64', track: 'combo', metric: 'comboSegments', threshold: 64, title: '长流水', description: '树友之间的水路，已经很长很长。', posterId: 'achievement-combo-64', posterTitle: '长流水', posterAsset: null, artworkStatus: 'work-in-progress' },
  { id: 'combo-256', track: 'combo', metric: 'comboSegments', threshold: 256, title: '整座城在递水', description: '许多遥远的地方，都连进同一片绿荫。', posterId: 'achievement-combo-256', posterTitle: '整座城在递水', posterAsset: null, artworkStatus: 'work-in-progress' },

  { id: 'secret-echo', track: 'secret', secret: true, title: '心有灵犀', description: '两位树友在一天之内，写下了同一句话。', posterId: 'achievement-secret-echo', posterTitle: '心有灵犀', posterAsset: null, artworkStatus: 'work-in-progress' },
  { id: 'secret-carried', track: 'secret', secret: true, title: '漂到远方的叶笺', description: '一张树友写下的叶笺，真的遇见了另一位树友。', posterId: 'achievement-secret-carried', posterTitle: '漂到远方的叶笺', posterAsset: null, artworkStatus: 'work-in-progress' },
  { id: 'secret-loved', track: 'secret', secret: true, title: '树下有回响', description: '同一张叶笺，收到了几位树友的回应。', posterId: 'achievement-secret-loved', posterTitle: '树下有回响', posterAsset: null, artworkStatus: 'work-in-progress' },
]);

export const ACHIEVEMENT_TRACKS = Object.freeze({
  water: { title: '一滴一滴', description: '大家一起浇下的水' },
  visitors: { title: '树友来过', description: '参与过浇水的不同浏览器' },
  leaves: { title: '叶笺寄出', description: '树友亲手挂上的祝福' },
  combo: { title: '接力不断', description: '不同树友在十分钟内接上的浇水段' },
  secret: { title: '树下的秘密', description: '被偶然遇见的小故事' },
});

export const PUBLIC_ACHIEVEMENTS = ACHIEVEMENTS.filter((achievement) => !achievement.secret);
export const SECRET_ACHIEVEMENTS = ACHIEVEMENTS.filter((achievement) => achievement.secret);

export function getAchievementProgress(achievement, metrics) {
  const value = Number(metrics[achievement.metric] ?? 0);
  return {
    value,
    remaining: Math.max(0, achievement.threshold - value),
    progress: Math.min(1, value / achievement.threshold),
    unlocked: value >= achievement.threshold,
  };
}
