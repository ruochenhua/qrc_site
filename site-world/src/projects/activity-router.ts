import activityIds from './activity-ids.json';
import type { ActivityId, InteractionSpec, ProjectManifestEntry } from './project-types';

export interface ActivityOptions {
  reducedMotion: boolean;
  onExit: () => void;
}

export interface ActivityModule {
  mount(container: HTMLElement, options: ActivityOptions): () => void;
}

export interface ActionRouterDependencies {
  openPanel(project: ProjectManifestEntry): void;
  navigate(href: string): void;
  runActivity(project: ProjectManifestEntry, activity: ActivityModule): void;
}

export type ActivityLoaders = Record<ActivityId, () => Promise<ActivityModule>>;

export const registeredActivityIds = activityIds as ActivityId[];

export const activityLoaders: ActivityLoaders = {
  'mini-fireworks': async () => (await import('../activities/mini-fireworks')).miniFireworksActivity,
};

export function createActionRouter(
  dependencies: ActionRouterDependencies,
  loaders: ActivityLoaders = activityLoaders,
) {
  return {
    async execute(interaction: InteractionSpec, project: ProjectManifestEntry): Promise<void> {
      if (interaction.type === 'panel') {
        dependencies.openPanel(project);
        return;
      }
      if (interaction.type === 'navigate') {
        if (!project.href) throw new Error(`Project ${project.id} has no destination for navigate interaction.`);
        dependencies.navigate(project.href);
        return;
      }

      const loadActivity = loaders[interaction.activityId];
      if (!loadActivity) throw new Error(`Activity ${interaction.activityId} is not registered.`);
      const activity = await loadActivity();
      dependencies.runActivity(project, activity);
    },
  };
}
