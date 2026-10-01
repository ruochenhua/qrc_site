export const RARITIES = Object.freeze(['common', 'rare', 'legendary']);

export const RARITY_BASE = Object.freeze({ common: 0.9, rare: 0.09, legendary: 0.01 });

export const PITY_AFTER = 10;
export const PITY_LEGENDARY_CHANCE = 0.1;

export const RARE_BONUS_PER_LEVEL = 0.008;
export const RARE_BONUS_CAP = 0.072;
export const LEGENDARY_BONUS_PER_LEVEL = 0.004;
export const LEGENDARY_BONUS_CAP = 0.036;

function normalizeLevel(posterLevel) {
  const level = Math.floor(Number(posterLevel));
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(10, level));
}

export function getRarityChances(posterLevel) {
  const level = normalizeLevel(posterLevel);
  const rareBonus = Math.min((level - 1) * RARE_BONUS_PER_LEVEL, RARE_BONUS_CAP);
  const legendaryBonus = Math.min((level - 1) * LEGENDARY_BONUS_PER_LEVEL, LEGENDARY_BONUS_CAP);
  const rare = RARITY_BASE.rare + rareBonus;
  const legendary = RARITY_BASE.legendary + legendaryBonus;
  return { common: 1 - rare - legendary, rare, legendary };
}

export function countConsecutiveCommons(rarities) {
  if (!Array.isArray(rarities)) return 0;
  let count = 0;
  for (const rarity of rarities) {
    if (rarity !== 'common') break;
    count += 1;
  }
  return count;
}

export function rollRarity(random, consecutiveCommons, posterLevel) {
  const source = typeof random === 'function' ? random : Math.random;
  const commons = Math.max(0, Math.floor(Number(consecutiveCommons) || 0));
  if (commons >= PITY_AFTER) {
    return source() < PITY_LEGENDARY_CHANCE ? 'legendary' : 'rare';
  }
  const { common, rare } = getRarityChances(posterLevel);
  const roll = source();
  if (roll < common) return 'common';
  if (roll < common + rare) return 'rare';
  return 'legendary';
}
