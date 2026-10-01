import { describe, expect, it } from 'vitest';
import { addToCollection, readCollection } from '../../client/collection.js';

function makeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

describe('browser leaf collection', () => {
  it('stores and reads collected cards in newest-first order', () => {
    const storage = makeStorage();
    addToCollection({ id: 1, phrase: 'A' }, storage);
    addToCollection({ id: 2, phrase: 'B' }, storage);
    expect(readCollection(storage).map((card) => card.id)).toEqual([2, 1]);
  });

  it('does not add the same incoming card twice', () => {
    const storage = makeStorage();
    expect(addToCollection({ id: 5 }, storage)).toBe(true);
    expect(addToCollection({ id: 5 }, storage)).toBe(false);
    expect(readCollection(storage)).toHaveLength(1);
  });

  it('recovers from malformed saved collection data', () => {
    const storage = makeStorage({ 'qrc-money-tree:collection': '{bad json' });
    expect(readCollection(storage)).toEqual([]);
  });
});
