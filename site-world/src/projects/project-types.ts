export type ProjectStatus = 'profile' | 'prototype' | 'community' | 'in-progress';
export type ActivityId = 'mini-fireworks';

export type InteractionSpec =
  | { type: 'panel' }
  | { type: 'navigate' }
  | { type: 'activity'; activityId: ActivityId };

export interface HitArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectManifestEntry {
  id: string;
  kind: 'profile' | 'project';
  icon: string;
  title: string;
  status: ProjectStatus;
  summary: string;
  cardAction?: string;
  href?: string;
  mapAnchor: string;
  spriteKey: string;
  hitArea: HitArea;
  interaction: InteractionSpec;
  featureActivityId?: ActivityId;
}

export interface ProjectMapAnchor {
  name: string;
  projectId: string;
  x: number;
  y: number;
}

export type LinkExists = (href: string) => boolean;
