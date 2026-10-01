import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProjectWorld } from '../src/projects/project-validation.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = path.resolve(projectRoot, '..');
const loadJson = async (relativePath) => JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'));
const [manifest, map, spriteRegistry, activityIds, homepage] = await Promise.all([
  loadJson('src/projects/manifest.json'),
  loadJson('maps/workshop-town.json'),
  loadJson('src/projects/sprite-registry.json'),
  loadJson('src/projects/activity-ids.json'),
  readFile(path.join(repositoryRoot, 'index.html'), 'utf8'),
]);

const objects = map.layers.find((layer) => layer.name === 'Objects')?.objects ?? [];
const readProperty = (object, name) => Array.isArray(object.properties)
  ? object.properties.find((property) => property.name === name)?.value
  : object.properties?.[name];
const anchors = objects
  .filter((object) => object.type === 'project-anchor')
  .map((object) => ({ name: object.name, projectId: readProperty(object, 'projectId'), x: object.x, y: object.y }));

const homepageHrefs = new Set([...homepage.matchAll(/\bhref=["']([^"']+)["']/g)].map((match) => match[1]));
const linkExists = async (href) => {
  const relativePath = href.slice(1);
  const absolutePath = path.resolve(repositoryRoot, relativePath);
  if (absolutePath !== repositoryRoot && !absolutePath.startsWith(`${repositoryRoot}${path.sep}`)) return false;
  const homepageReferenceExists = homepageHrefs.has(relativePath) || homepageHrefs.has(href);
  if (!homepageReferenceExists) return false;
  try {
    return (await stat(absolutePath)).isFile();
  } catch {
    return false;
  }
};

const pageReferences = [...new Set(manifest.flatMap((entry) => entry.href ? [entry.href] : []))];
const links = new Map(await Promise.all(pageReferences.map(async (href) => [href, await linkExists(href)])));
const errors = validateProjectWorld(
  manifest,
  anchors,
  spriteRegistry,
  activityIds,
  (href) => links.get(href) ?? false,
  { width: map.width * map.tilewidth, height: map.height * map.tileheight },
);
if (errors.length > 0) throw new Error(`Invalid project world data:\n- ${errors.join('\n- ')}`);
console.log(`Validated ${manifest.length} project/profile records, ${anchors.length} map anchors, and ${links.size} page references.`);
