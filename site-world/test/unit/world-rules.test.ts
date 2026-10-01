import { describe, expect, it } from 'vitest';
import map from '../../maps/workshop-town.json';
import animationMetadata from '../../art/player-animations.json';
import { facingFromVector, normalizeMoveVector } from '../../src/world/movement';
import { validateWorldMap, type WorldMapDocument } from '../../src/world/map-validation';

describe('world map contract', () => {
  it('accepts the authored Tiled map and its spawn and project anchors', () => {
    expect(validateWorldMap(map)).toEqual([]);
  });

  it('reports malformed layer data, duplicate project IDs, and out-of-bounds objects', () => {
    const broken = structuredClone(map) as WorldMapDocument;
    const ground = broken.layers.find((layer) => layer.name === 'Ground');
    if (ground?.data) ground.data.pop();
    const objects = broken.layers.find((layer) => layer.name === 'Objects')?.objects ?? [];
    const firstAnchor = objects.find((object) => object.type === 'project-anchor');
    const secondAnchor = objects.find((object) => object.type === 'project-anchor' && object !== firstAnchor);
    if (firstAnchor && secondAnchor) {
      if (Array.isArray(firstAnchor.properties) && Array.isArray(secondAnchor.properties)) {
        const projectValue = firstAnchor.properties.find((property) => property.name === 'projectId')?.value;
        const target = secondAnchor.properties.find((property) => property.name === 'projectId');
        if (target) target.value = projectValue;
      }
      secondAnchor.x = broken.width * broken.tilewidth + 1;
    }
    const errors = validateWorldMap(broken);
    expect(errors.some((error) => error.includes('one tile value'))).toBe(true);
    expect(errors.some((error) => error.includes('duplicated'))).toBe(true);
    expect(errors.some((error) => error.includes('outside the map'))).toBe(true);
  });
});

describe('player movement rules', () => {
  it('normalizes diagonals so they do not move faster than straight travel', () => {
    const diagonal = normalizeMoveVector(1, 1);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(normalizeMoveVector(0, 1)).toEqual({ x: 0, y: 1 });
    expect(normalizeMoveVector(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('keeps the last facing direction while idle and chooses the dominant axis while moving', () => {
    expect(facingFromVector(0, 0, 'left')).toBe('left');
    expect(facingFromVector(-1, -1, 'down')).toBe('up');
    expect(facingFromVector(1, 0, 'down')).toBe('right');
  });
});

describe('pixel sprite export contract', () => {
  it('exports twelve named Aseprite Hash frames and four directional walk tags', () => {
    expect(Object.keys(animationMetadata.frames)).toHaveLength(12);
    expect(animationMetadata.meta.frameTags.map((tag) => tag.name)).toEqual([
      'walk-down', 'walk-left', 'walk-right', 'walk-up',
    ]);
    expect(Object.values(animationMetadata.frames).every((frame) => frame.frame.w === 16 && frame.frame.h === 24)).toBe(true);
  });
});
