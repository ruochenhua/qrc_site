import { ACHIEVEMENTS } from './achievements.js';

const LEVEL_POSTERS = [
  { id: 'office-sun', title: '晒到太阳', sceneId: 'office', unlockLevel: 1, asset: 'assets/scenes/office-sun.png' },
  { id: 'window-garden', title: '窗边来信', sceneId: 'window', unlockLevel: 4, asset: 'assets/scenes/window-garden.png' },
  { id: 'roof-breakthrough', title: '屋顶新枝', sceneId: 'rooftop', unlockLevel: 6, asset: 'assets/scenes/roof-breakthrough.png' },
  { id: 'city-canopy', title: '城市树荫', sceneId: 'city', unlockLevel: 8, asset: 'assets/scenes/city-canopy.png' },
  { id: 'cosmic-wishes', title: '银河财气', sceneId: 'cosmic', unlockLevel: 10, asset: 'assets/scenes/cosmic-wishes.png' },
];

const ACHIEVEMENT_POSTERS = ACHIEVEMENTS.filter((achievement) => achievement.posterAsset).map((achievement) => ({
  id: achievement.posterId,
  title: achievement.posterTitle,
  asset: achievement.posterAsset,
  achievementId: achievement.id,
  secret: achievement.secret ?? false,
}));

export const POSTERS = Object.freeze([...LEVEL_POSTERS, ...ACHIEVEMENT_POSTERS]);

export const PHRASE_SUBJECTS = Object.freeze([
  {
    id: 'passerby',
    label: '路过的你',
    connector: '请记得',
    endings: [
      { id: 'drink-water', label: '喝口水' },
      { id: 'look-outside', label: '看一眼窗外' },
      { id: 'take-a-break', label: '给自己一点时间' },
    ],
  },
  {
    id: 'worker',
    label: '今天的打工人',
    connector: '也值得',
    endings: [
      { id: 'clock-out', label: '早点下班' },
      { id: 'good-luck', label: '遇见好事' },
      { id: 'proper-rest', label: '安心休息' },
    ],
  },
  {
    id: 'tired',
    label: '有点累的你',
    connector: '可以先',
    endings: [
      { id: 'rest', label: '休息一下' },
      { id: 'drop-worries', label: '放下烦恼' },
      { id: 'recharge', label: '重新充电' },
    ],
  },
  {
    id: 'tomorrow',
    label: '明天的你',
    connector: '会收到',
    endings: [
      { id: 'good-news', label: '今天种下的好运' },
      { id: 'small-surprise', label: '一份小惊喜' },
      { id: 'fresh-start', label: '新的好消息' },
    ],
  },
]);

export function isPosterUnlocked(posterId, level, unlockedAchievementIds = []) {
  const poster = POSTERS.find((item) => item.id === posterId);
  if (!poster) return false;
  if (poster.achievementId) return unlockedAchievementIds.includes(poster.achievementId);
  return Number.isInteger(level) && level >= poster.unlockLevel;
}

export function getUnlockedPosters(level, unlockedAchievementIds = []) {
  return POSTERS.filter((poster) => isPosterUnlocked(poster.id, level, unlockedAchievementIds));
}

export function isPhraseCombinationAllowed(subjectId, endingId) {
  const subject = PHRASE_SUBJECTS.find((item) => item.id === subjectId);
  return Boolean(subject?.endings.some((ending) => ending.id === endingId));
}

export function composePhrase(subjectId, endingId) {
  const subject = PHRASE_SUBJECTS.find((item) => item.id === subjectId);
  const ending = subject?.endings.find((item) => item.id === endingId);
  if (!subject || !ending) return null;
  return `${subject.label}，${subject.connector}${ending.label}。`;
}
