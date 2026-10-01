import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = path.resolve(projectRoot, '..');
const homepagePath = path.join(repositoryRoot, 'index.html');
const manifest = JSON.parse(await readFile(path.join(projectRoot, 'src/projects/manifest.json'), 'utf8'));
const startMarker = '<!-- WORLD-PROJECTS:START -->';
const endMarker = '<!-- WORLD-PROJECTS:END -->';
const source = await readFile(homepagePath, 'utf8');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

const statusLabels = {
  profile: '工作室',
  prototype: '可玩原型',
  community: '共同养成',
  'in-progress': '制作中',
};
const projectCards = manifest.filter((project) => project.kind === 'project').map((project) => {
  const action = project.href ? 'a' : 'button';
  const destination = project.href ? ` href="${escapeHtml(project.href)}"` : ' type="button"';
  const preview = project.href ? '' : ` data-world-project-preview="${escapeHtml(project.id)}" aria-haspopup="dialog"`;
  const opening = `<${action}${destination} class="world-project-card" data-project-id="${escapeHtml(project.id)}"${preview}>`;
  const closing = `</${action}>`;
  return `                ${opening}
                    <span class="world-project-card__top">
                        <span class="world-project-card__icon" aria-hidden="true">${escapeHtml(project.icon)}</span>
                        <span class="world-project-card__status">${escapeHtml(statusLabels[project.status] ?? project.status)}</span>
                    </span>
                    <span class="world-project-card__title">${escapeHtml(project.title)}</span>
                    <span class="world-project-card__summary">${escapeHtml(project.summary)}</span>
                    <span class="world-project-card__action">${escapeHtml(project.cardAction ?? '了解项目')} <span aria-hidden="true">→</span></span>
                ${closing}`;
}).join('\n');

if (source.split(startMarker).length !== 2 || source.split(endMarker).length !== 2) {
  throw new Error('Homepage must contain exactly one WORLD-PROJECTS marker pair.');
}
const start = source.indexOf(startMarker) + startMarker.length;
const end = source.indexOf(endMarker);
if (end < start) throw new Error('WORLD-PROJECTS markers are out of order.');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const generated = `${source.slice(0, start)}${newline}${projectCards.split('\n').join(newline)}${newline}                ${source.slice(end)}`;

if (process.argv.includes('--check')) {
  if (generated !== source) throw new Error('Homepage project cards are out of date; run npm run sync:homepage.');
  console.log(`Homepage project block matches all ${projectCards ? manifest.filter((project) => project.kind === 'project').length : 0} project records.`);
} else {
  await writeFile(homepagePath, generated);
  console.log('Updated only the WORLD-PROJECTS block in index.html.');
}
