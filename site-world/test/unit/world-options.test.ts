import { describe, expect, it } from 'vitest';
import { normalizeWorldOptions } from '../../src/bootstrap/world-options';

describe('world viewport defaults', () => {
  it('uses the planned logical canvas size by default', () => {
    expect(normalizeWorldOptions({})).toEqual({ width: 640, height: 360, fitMapToViewport: false });
  });

  it('allows a host to request another positive logical size', () => {
    expect(normalizeWorldOptions({ width: 480, height: 320 })).toEqual({ width: 480, height: 320, fitMapToViewport: false });
  });

  it('can request a full-screen map viewport', () => {
    expect(normalizeWorldOptions({ width: 1280, height: 900, fitMapToViewport: true })).toEqual({
      width: 1280,
      height: 900,
      fitMapToViewport: true,
    });
  });
});
