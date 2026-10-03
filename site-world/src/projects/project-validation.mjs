const PROJECT_STATUSES = new Set(['profile', 'prototype', 'community', 'in-progress']);
const INTERACTION_TYPES = new Set(['panel', 'navigate', 'activity']);

export function validateProjectWorld(manifest, anchors, spriteRegistry, activityIds, linkExists = () => true, mapSize = { width: Infinity, height: Infinity }) {
  const errors = [];
  const projectById = new Map();
  const anchorByProjectId = new Map();
  const seenAnchorNames = new Set();
  const allowedActivities = new Set(activityIds);
  const projectAnchors = anchors.filter((anchor) => anchor.projectId);

  for (const anchor of projectAnchors) {
    if (anchorByProjectId.has(anchor.projectId)) errors.push(`Map anchor for project ${anchor.projectId} is duplicated.`);
    else anchorByProjectId.set(anchor.projectId, anchor);
    if (seenAnchorNames.has(anchor.name)) errors.push(`Map anchor name ${anchor.name} is duplicated.`);
    seenAnchorNames.add(anchor.name);
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)
      || anchor.x < 0 || anchor.y < 0 || anchor.x > mapSize.width || anchor.y > mapSize.height) {
      errors.push(`Map anchor ${anchor.name} is outside the world bounds.`);
    }
  }

  for (const project of manifest) {
    const label = project?.id || '(missing id)';
    if (!project || typeof project !== 'object') {
      errors.push('Manifest contains a non-object project entry.');
      continue;
    }
    if (typeof project.id !== 'string' || project.id.trim() === '') errors.push(`${label}: id must be a non-empty string.`);
    else if (projectById.has(project.id)) errors.push(`${label}: project id is duplicated.`);
    else projectById.set(project.id, project);

    if (!['profile', 'project'].includes(project.kind)) errors.push(`${label}: kind is invalid.`);
    if (!PROJECT_STATUSES.has(project.status)) errors.push(`${label}: status is invalid.`);
    for (const field of ['title', 'summary', 'mapAnchor', 'spriteKey', 'icon']) {
      if (typeof project[field] !== 'string' || project[field].trim() === '') errors.push(`${label}: ${field} is required.`);
    }

    if (!Object.hasOwn(spriteRegistry, project.spriteKey)) errors.push(`${label}: sprite key ${project.spriteKey} is not registered.`);
    const hit = project.hitArea;
    if (!hit || ![hit.x, hit.y, hit.width, hit.height].every(Number.isFinite)
      || hit.x < 0 || hit.y < 0 || hit.width <= 0 || hit.height <= 0
      || hit.x + hit.width > 192 || hit.y + hit.height > 144) {
      errors.push(`${label}: hit area must fit within the 192 by 144 pixel project hotspot.`);
    }

    const needsPage = project.kind === 'project' && ['prototype', 'community'].includes(project.status);
    if (needsPage && !project.href) errors.push(`${label}: ${project.status} projects must have a destination page.`);
    if (project.href !== undefined) {
      if (typeof project.href !== 'string' || !project.href.startsWith('/') || project.href.startsWith('//')
        || project.href.includes('\\') || project.href.includes('?') || project.href.includes('#')
        || project.href.split('/').includes('..')) {
        errors.push(`${label}: href must be a safe same-origin absolute path.`);
      } else if (!linkExists(project.href)) {
        errors.push(`${label}: destination ${project.href} does not exist or is not listed on the homepage.`);
      }
    }

    const interaction = project.interaction;
    if (!interaction || !INTERACTION_TYPES.has(interaction.type)) errors.push(`${label}: interaction type is invalid.`);
    else if (interaction.type === 'navigate' && !project.href) errors.push(`${label}: navigate interaction requires href.`);
    else if (interaction.type === 'activity' && !allowedActivities.has(interaction.activityId)) {
      errors.push(`${label}: activity ${interaction.activityId} is not registered.`);
    }
    if (project.featureActivityId && !allowedActivities.has(project.featureActivityId)) {
      errors.push(`${label}: feature activity ${project.featureActivityId} is not registered.`);
    }

    const anchor = anchorByProjectId.get(project.id);
    if (!anchor) errors.push(`${label}: no Tiled project anchor is registered.`);
    else if (anchor.name !== project.mapAnchor) errors.push(`${label}: map anchor ${anchor.name} does not match ${project.mapAnchor}.`);
  }

  for (const anchor of projectAnchors) {
    if (!projectById.has(anchor.projectId)) errors.push(`Map anchor ${anchor.name} references unknown project ${anchor.projectId}.`);
  }
  return errors;
}
