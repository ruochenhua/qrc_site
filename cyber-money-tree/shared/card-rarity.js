export const CARD_RARITY_PRESENTATION = Object.freeze({
  common: Object.freeze({
    label: '普通',
    frameAsset: 'assets/rarity/frame-common.svg',
    iconAsset: 'assets/rarity/icons/icon-common.png',
    iconRect: Object.freeze({ x: 624, y: 24, width: 66, height: 66 }),
    badgeBackground: '#e5efdc',
    badgeBorder: '#77966a',
    badgeText: '#35583a',
  }),
  rare: Object.freeze({
    label: '稀有',
    frameAsset: 'assets/rarity/frame-rare.svg',
    iconAsset: 'assets/rarity/icons/icon-rare.png',
    iconRect: Object.freeze({ x: 623, y: 23, width: 68, height: 68 }),
    badgeBackground: '#e2edf7',
    badgeBorder: '#7fa3c4',
    badgeText: '#274a68',
  }),
  legendary: Object.freeze({
    label: '传说',
    frameAsset: 'assets/rarity/frame-legendary.svg',
    iconAsset: 'assets/rarity/icons/icon-legendary.png',
    iconRect: Object.freeze({ x: 622, y: 22, width: 70, height: 70 }),
    badgeBackground: '#ffe9a8',
    badgeBorder: '#c9932a',
    badgeText: '#5c3d05',
  }),
});

export function normalizeCardRarity(rarity) {
  return Object.hasOwn(CARD_RARITY_PRESENTATION, rarity) ? rarity : 'common';
}
