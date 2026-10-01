export const VISITOR_STORAGE_KEY = 'qrc-money-tree:visitor-id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getOrCreateVisitorId(storage, createId = () => globalThis.crypto.randomUUID()) {
  if (!storage) throw new Error('Anonymous visitor storage is unavailable.');
  let current = null;
  try {
    current = storage.getItem(VISITOR_STORAGE_KEY);
  } catch {
    throw new Error('Anonymous visitor storage is unavailable.');
  }
  if (typeof current === 'string' && UUID_PATTERN.test(current)) return current;

  const next = createId();
  if (typeof next !== 'string' || !UUID_PATTERN.test(next)) {
    throw new Error('A valid anonymous visitor id could not be created.');
  }
  try {
    storage.setItem(VISITOR_STORAGE_KEY, next);
  } catch {
    throw new Error('Anonymous visitor storage is unavailable.');
  }
  return next;
}
