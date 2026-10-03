import projectManifest from '../projects/manifest.json';
import type { ProjectManifestEntry } from '../projects/project-types';

const projects = projectManifest as ProjectManifestEntry[];
const projectsById = new Map(projects.map((project) => [project.id, project]));

const STATUS_LABELS: Record<ProjectManifestEntry['status'], string> = {
  profile: '工作室',
  prototype: '可玩原型',
  community: '共同养成',
  'in-progress': '制作中',
};

interface HoverDetail {
  id?: string | null;
  clientX?: number;
  clientY?: number;
}

export function attachProjectHovercard(host: HTMLElement): () => void {
  const card = document.createElement('aside');
  card.className = 'qrc-world-hovercard';
  card.hidden = true;
  card.setAttribute('role', 'tooltip');
  card.setAttribute('aria-live', 'polite');

  let activeProjectId: string | null = null;
  host.ownerDocument.body.append(card);

  const onHover = (event: Event) => {
    const detail = (event as CustomEvent<HoverDetail>).detail;
    const id = typeof detail?.id === 'string' ? detail.id : null;
    const project = id ? projectsById.get(id) : undefined;
    if (!project) {
      activeProjectId = null;
      card.hidden = true;
      return;
    }

    if (activeProjectId !== project.id) {
      activeProjectId = project.id;
      card.replaceChildren();

      const heading = document.createElement('div');
      heading.className = 'qrc-world-hovercard__heading';
      const icon = document.createElement('span');
      icon.className = 'qrc-world-hovercard__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = project.icon;

      const titleGroup = document.createElement('div');
      titleGroup.className = 'qrc-world-hovercard__title-group';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'qrc-world-hovercard__eyebrow';
      eyebrow.textContent = '公会档案';
      const title = document.createElement('strong');
      title.className = 'qrc-world-hovercard__title';
      title.textContent = project.title;
      titleGroup.append(eyebrow, title);

      const status = document.createElement('span');
      status.className = 'qrc-world-hovercard__status';
      status.textContent = STATUS_LABELS[project.status];
      heading.append(icon, titleGroup, status);

      const summary = document.createElement('p');
      summary.className = 'qrc-world-hovercard__summary';
      summary.textContent = project.summary;

      const action = document.createElement('span');
      action.className = 'qrc-world-hovercard__action';
      action.textContent = '点击查看详情';
      card.append(heading, summary, action);
    }

    card.hidden = false;
    const clientX = Number.isFinite(detail.clientX) ? Number(detail.clientX) : window.innerWidth / 2;
    const clientY = Number.isFinite(detail.clientY) ? Number(detail.clientY) : window.innerHeight / 2;
    const gap = 18;
    const margin = 12;
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    let left = clientX + gap;
    let top = clientY + gap;
    if (left + width > window.innerWidth - margin) left = clientX - width - gap;
    if (top + height > window.innerHeight - margin) top = clientY - height - gap;
    card.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - width - margin))}px`;
    card.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - height - margin))}px`;
  };

  host.addEventListener('qrc-world:hover', onHover);
  return () => {
    host.removeEventListener('qrc-world:hover', onHover);
    card.remove();
  };
}
