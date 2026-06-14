import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getEventPreferenceHint } from '../js/systems.js';

describe('UI helper functions', () => {
  test('getEventPreferenceHint returns string for event', () => {
    const hint = getEventPreferenceHint('e001');
    assert.equal(typeof hint, 'string');
    assert.ok(hint.length > 0);
  });

  test('getEventPreferenceHint returns narrative description', () => {
    const hint = getEventPreferenceHint('e001');
    assert.ok(hint.includes('红'));
    assert.ok(hint.length > 10);
    assert.ok(!hint.includes('+'));
  });

  test('getEventPreferenceHint returns fallback for unknown event', () => {
    const hint = getEventPreferenceHint('unknown');
    assert.equal(hint, '');
  });
});
