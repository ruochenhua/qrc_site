export const COLLECTION_STORAGE_KEY = 'qrc-money-tree:collection';
export const MAX_COLLECTION_SIZE = 100;
export const COLLECTION_RARITY_FILTERS = Object.freeze(['all', 'rare', 'legendary']);

function normalizeRarity(rarity) {
  return rarity === 'rare' || rarity === 'legendary' ? rarity : 'common';
}

export function countRarities(cards) {
  const counts = { total: 0, rare: 0, legendary: 0 };
  for (const card of Array.isArray(cards) ? cards : []) {
    counts.total += 1;
    const rarity = normalizeRarity(card?.rarity);
    if (rarity !== 'common') counts[rarity] += 1;
  }
  return counts;
}

export function filterCollectionByRarity(cards, filter) {
  const list = Array.isArray(cards) ? cards : [];
  if (filter === 'rare' || filter === 'legendary') {
    return list.filter((card) => normalizeRarity(card?.rarity) === filter);
  }
  return [...list];
}

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readCollection(storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return [];
    const parsed = JSON.parse(target.getItem(COLLECTION_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((card) => card && (typeof card.id === 'string' || Number.isInteger(card.id)))
      .slice(0, MAX_COLLECTION_SIZE);
  } catch {
    return [];
  }
}

export function addToCollection(card, storage) {
  if (!card || (typeof card.id !== 'string' && !Number.isInteger(card.id))) return false;
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    const current = readCollection(target);
    if (current.some((item) => String(item.id) === String(card.id))) return false;
    target.setItem(COLLECTION_STORAGE_KEY, JSON.stringify([card, ...current].slice(0, MAX_COLLECTION_SIZE)));
    return true;
  } catch {
    return false;
  }
}

export function removeFromCollection(cardId, storage) {
  if (typeof cardId !== 'string' && !Number.isInteger(cardId)) return false;
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    const current = readCollection(target);
    const next = current.filter((card) => String(card.id) !== String(cardId));
    if (next.length === current.length) return false;
    target.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
