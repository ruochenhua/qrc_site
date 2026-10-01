import projectManifest from '../projects/manifest.json';
import { createActionRouter, type ActivityModule } from '../projects/activity-router';
import type { ProjectManifestEntry } from '../projects/project-types';

const projects = projectManifest as ProjectManifestEntry[];
const projectById = new Map(projects.map((project) => [project.id, project]));

const STATUS_LABELS: Record<ProjectManifestEntry['status'], string> = {
  profile: '工作室',
  prototype: '可玩原型',
  community: '共同养成',
  'in-progress': '制作中',
};

function makeButton(label: string, className = 'qrc-world-button'): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.textContent = label;
  return button;
}

export function attachProjectDialog(host: HTMLElement): () => void {
  const dialog = document.createElement('dialog');
  dialog.className = 'qrc-world-dialog';
  dialog.setAttribute('aria-labelledby', 'qrc-world-dialog-title');
  dialog.setAttribute('aria-describedby', 'qrc-world-dialog-summary');
  document.body.append(dialog);

  let returnFocus: HTMLElement | null = null;
  let currentProject: ProjectManifestEntry | null = null;
  let activityCleanup: (() => void) | undefined;
  let activityContainer: HTMLElement | undefined;

  const cleanActivity = () => {
    activityCleanup?.();
    activityCleanup = undefined;
    activityContainer = undefined;
  };

  const showProject = (project: ProjectManifestEntry, isInitial = false) => {
    cleanActivity();
    currentProject = project;
    const card = document.createElement('section');
    card.className = 'qrc-world-dialog__card';

    const top = document.createElement('div');
    top.className = 'qrc-world-dialog__top';
    const status = document.createElement('span');
    status.className = 'qrc-world-dialog__status';
    status.textContent = STATUS_LABELS[project.status];
    const close = makeButton('关闭', 'qrc-world-dialog__close');
    close.setAttribute('aria-label', '关闭项目介绍');
    close.addEventListener('click', () => dialog.close());
    top.append(status, close);

    const title = document.createElement('h2');
    title.id = 'qrc-world-dialog-title';
    title.textContent = project.title;
    const summary = document.createElement('p');
    summary.id = 'qrc-world-dialog-summary';
    summary.textContent = project.summary;

    const actions = document.createElement('div');
    actions.className = 'qrc-world-dialog__actions';
    const destination = project.href ? document.createElement('a') : undefined;
    if (destination && project.href) {
      destination.className = 'qrc-world-button qrc-world-button--primary';
      destination.href = project.href;
      destination.textContent = project.id === 'cyber-money-tree' ? '去浇水' : '试玩项目';
      actions.append(destination);
    }
    if (project.featureActivityId) {
      const activity = makeButton('试放一枚烟花', 'qrc-world-button qrc-world-button--secondary');
      activity.addEventListener('click', () => { void routeActivity(project); });
      actions.append(activity);
    }
    const activityHost = document.createElement('div');
    activityHost.className = 'qrc-world-dialog__activity';
    activityHost.hidden = true;
    card.append(top, title, summary, actions, activityHost);
    dialog.replaceChildren(card);
    activityContainer = activityHost;

    if (!dialog.open) {
      if (isInitial) {
        const active = document.activeElement;
        returnFocus = active instanceof HTMLElement && active !== document.body
          ? active
          : host.querySelector<HTMLCanvasElement>('canvas');
      }
      dialog.showModal();
    }
    close.focus();
  };

  const router = createActionRouter({
    openPanel(project) { showProject(project, true); },
    navigate(href) { window.location.assign(href); },
    runActivity(project, activity) { showActivity(project, activity); },
  });

  const showActivity = (project: ProjectManifestEntry, activity: ActivityModule) => {
    if (currentProject?.id !== project.id || !activityContainer) showProject(project, true);
    if (!activityContainer) return;
    activityContainer.hidden = false;
    activityCleanup = activity.mount(activityContainer, {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onExit: () => showProject(project),
    });
    activityContainer.querySelector('button')?.focus();
  };

  const routeActivity = async (project: ProjectManifestEntry) => {
    if (!project.featureActivityId) return;
    try {
      await router.execute({ type: 'activity', activityId: project.featureActivityId }, project);
    } catch {
      const message = document.createElement('p');
      message.className = 'qrc-world-dialog__error';
      message.setAttribute('role', 'status');
      message.textContent = '小演示暂时无法载入，项目页面仍可正常打开。';
      dialog.querySelector('.qrc-world-dialog__card')?.append(message);
    }
  };

  const onProjectSelected = (event: Event) => {
    const id = (event as CustomEvent<{ id?: string }>).detail?.id;
    const project = typeof id === 'string' ? projectById.get(id) : undefined;
    if (!project) return;
    void router.execute(project.interaction, project);
  };
  const onStaticProjectPreview = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLButtonElement>('[data-world-project-preview]');
    if (!trigger) return;
    const project = projectById.get(trigger.dataset.worldProjectPreview ?? '');
    if (project) void router.execute({ type: 'panel' }, project);
  };
  const onCloseRequested = () => { if (dialog.open) dialog.close(); };
  const restoreFocus = () => {
    cleanActivity();
    currentProject = null;
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  };
  const onBackdrop = (event: MouseEvent) => { if (event.target === dialog) dialog.close(); };
  dialog.addEventListener('close', restoreFocus);
  dialog.addEventListener('click', onBackdrop);
  host.addEventListener('qrc-world:select', onProjectSelected);
  host.addEventListener('qrc-world:close', onCloseRequested);
  document.addEventListener('click', onStaticProjectPreview);

  return () => {
    host.removeEventListener('qrc-world:select', onProjectSelected);
    host.removeEventListener('qrc-world:close', onCloseRequested);
    document.removeEventListener('click', onStaticProjectPreview);
    dialog.removeEventListener('close', restoreFocus);
    dialog.removeEventListener('click', onBackdrop);
    cleanActivity();
    if (dialog.open) dialog.close();
    dialog.remove();
  };
}
