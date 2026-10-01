import { describe, expect, it, vi } from 'vitest';
import { getOrCreateVisitorId, VISITOR_STORAGE_KEY } from '../../client/identity.js';

function makeStorage(value = null) {
  const data = new Map(value === null ? [] : [[VISITOR_STORAGE_KEY, value]]);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, next) => data.set(key, String(next)),
  };
}

describe('anonymous browser identity', () => {
  it('reuses a valid local browser id', () => {
    const storage = makeStorage('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const createId = vi.fn(() => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(getOrCreateVisitorId(storage, createId)).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(createId).not.toHaveBeenCalled();
  });

  it('replaces a malformed id and stores a new anonymous id', () => {
    const storage = makeStorage('not-a-uuid');
    const createId = () => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    expect(getOrCreateVisitorId(storage, createId)).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(storage.getItem(VISITOR_STORAGE_KEY)).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });
});
