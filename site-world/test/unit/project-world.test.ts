import { describe, expect, it, vi } from 'vitest';
import activityIds from '../../src/projects/activity-ids.json';
import manifest from '../../src/projects/manifest.json';
import spriteRegistry from '../../src/projects/sprite-registry.json';
import { createActionRouter, type ActivityLoaders } from '../../src/projects/activity-router';
import type { ProjectManifestEntry, ProjectMapAnchor } from '../../src/projects/project-types';
import { validateProjectWorld } from '../../src/projects/project-validation.mjs';
import map from '../../maps/workshop-town.json';
import { readTiledProperty } from '../../src/world/map-validation';

const records = manifest as ProjectManifestEntry[];
const mapObjects = map.layers.find((layer) => layer.name === 'Objects')?.objects ?? [];
const anchors: ProjectMapAnchor[] = mapObjects
  .filter((object) => object.type === 'project-anchor')
  .map((object) => ({
    name: object.name,
    projectId: String(readTiledProperty(object, 'projectId')),
    x: object.x,
    y: object.y,
  }));
const worldSize = { width: map.width * map.tilewidth, height: map.height * map.tileheight };

describe('project manifest and world anchors', () => {
  it('accepts the current project records, map anchors, and registered sprite/activity keys', () => {
    expect(validateProjectWorld(records, anchors, spriteRegistry, activityIds, () => true, worldSize)).toEqual([]);
  });

  it('allows a planned project preview with no href and rejects unsafe or missing destinations', () => {
    const planned = records.find((project) => project.id === 'kings-field');
    expect(planned?.status).toBe('in-progress');
    expect(planned?.href).toBeUndefined();

    const broken = structuredClone(records);
    const travel = broken.find((project) => project.id === 'cybertravel');
    if (travel) travel.href = '/missing/index.html';
    const errors = validateProjectWorld(broken, anchors, spriteRegistry, activityIds, () => false, worldSize);
    expect(errors.some((error) => error.includes('cybertravel: destination'))).toBe(true);
  });

  it('reports duplicate IDs, bad sprites, invalid hit areas, unregistered activities, and map mismatches', () => {
    const broken = structuredClone(records);
    const travel = broken.find((project) => project.id === 'cybertravel');
    const fireworks = broken.find((project) => project.id === 'firework-master');
    const tree = broken.find((project) => project.id === 'cyber-money-tree');
    const extraAnchor: ProjectMapAnchor = { name: 'orphan', projectId: 'unlisted-project', x: 30, y: 30 };
    if (travel) {
      travel.spriteKey = 'missing-sprite';
      travel.mapAnchor = 'wrong-place';
      travel.hitArea.width = 100;
    }
    if (fireworks) fireworks.featureActivityId = 'not-registered' as ProjectManifestEntry['featureActivityId'];
    if (tree) tree.id = 'cybertravel';

    const errors = validateProjectWorld([...broken, ...[]], [...anchors, extraAnchor], spriteRegistry, activityIds, () => true, worldSize);
    expect(errors.some((error) => error.includes('project id is duplicated'))).toBe(true);
    expect(errors.some((error) => error.includes('sprite key missing-sprite'))).toBe(true);
    expect(errors.some((error) => error.includes('hit area'))).toBe(true);
    expect(errors.some((error) => error.includes('does not match'))).toBe(true);
    expect(errors.some((error) => error.includes('not registered'))).toBe(true);
    expect(errors.some((error) => error.includes('unknown project'))).toBe(true);
  });

  it('accepts an extension record plus one map anchor without changing the renderer contract', () => {
    const extension: ProjectManifestEntry = {
      id: 'garden-kiosk',
      kind: 'project',
      icon: '🏡',
      title: '未来展台',
      status: 'prototype',
      summary: '扩展接口验证用的项目展台。',
      href: '/cybertravel/index.html',
      mapAnchor: 'garden-kiosk-anchor',
      spriteKey: 'street-kiosk',
      hitArea: { x: 8, y: 6, width: 80, height: 68 },
      interaction: { type: 'panel' },
    };
    const extensionAnchor: ProjectMapAnchor = {
      name: extension.mapAnchor,
      projectId: extension.id,
      x: 320,
      y: 264,
    };
    expect(validateProjectWorld(
      [...records, extension],
      [...anchors, extensionAnchor],
      spriteRegistry,
      activityIds,
      () => true,
      worldSize,
    )).toEqual([]);
  });
});

describe('closed project action router', () => {
  const cybertravel = records.find((project) => project.id === 'cybertravel')!;

  it('routes a panel record to the shared panel handler', async () => {
    const openPanel = vi.fn();
    const router = createActionRouter({ openPanel, navigate: vi.fn(), runActivity: vi.fn() });
    await router.execute({ type: 'panel' }, cybertravel);
    expect(openPanel).toHaveBeenCalledWith(cybertravel);
  });

  it('routes a navigate action only through its validated same-origin destination', async () => {
    const navigate = vi.fn();
    const router = createActionRouter({ openPanel: vi.fn(), navigate, runActivity: vi.fn() });
    await router.execute({ type: 'navigate' }, cybertravel);
    expect(navigate).toHaveBeenCalledWith('/cybertravel/index.html');
    await expect(router.execute({ type: 'navigate' }, { ...cybertravel, href: undefined })).rejects.toThrow('has no destination');
  });

  it('loads an allowlisted activity only when it is explicitly requested', async () => {
    const module = { mount: vi.fn(() => vi.fn()) };
    const loader = vi.fn(async () => module);
    const loaders: ActivityLoaders = { 'mini-fireworks': loader };
    const runActivity = vi.fn();
    const router = createActionRouter({ openPanel: vi.fn(), navigate: vi.fn(), runActivity }, loaders);
    expect(loader).not.toHaveBeenCalled();
    await router.execute({ type: 'activity', activityId: 'mini-fireworks' }, cybertravel);
    expect(loader).toHaveBeenCalledOnce();
    expect(runActivity).toHaveBeenCalledWith(cybertravel, module);
  });

  it('refuses an activity ID that is outside the explicit loader registry', async () => {
    const router = createActionRouter({ openPanel: vi.fn(), navigate: vi.fn(), runActivity: vi.fn() }, {} as ActivityLoaders);
    const invalid = { type: 'activity', activityId: 'arbitrary/module' } as unknown as Parameters<typeof router.execute>[0];
    await expect(router.execute(invalid, cybertravel)).rejects.toThrow('is not registered');
  });
});
