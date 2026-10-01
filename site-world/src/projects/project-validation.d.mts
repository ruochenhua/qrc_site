import type { ProjectManifestEntry, ProjectMapAnchor, LinkExists } from './project-types';

export function validateProjectWorld(
  manifest: readonly ProjectManifestEntry[],
  anchors: readonly ProjectMapAnchor[],
  spriteRegistry: Readonly<Record<string, number>>,
  activityIds: readonly string[],
  linkExists?: LinkExists,
  mapSize?: { width: number; height: number },
): string[];
