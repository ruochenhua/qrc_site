import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const runtimeDir = fileURLToPath(new URL('../../assets/world/runtime/', import.meta.url));
const entryPath = path.join(runtimeDir, 'world.js');
const stylesheetPath = path.join(runtimeDir, 'world.css');
const noticesPath = path.join(runtimeDir, 'THIRD_PARTY_NOTICES.txt');

async function requireFile(filePath, label) {
  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size === 0) throw new Error('empty or not a file');
  } catch (error) {
    throw new Error(`${label} missing or invalid: ${filePath}`, { cause: error });
  }
}

await requireFile(entryPath, 'World entry');
await requireFile(stylesheetPath, 'World stylesheet');
await requireFile(noticesPath, 'Third-party notices');

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const item of entries) {
    const relative = path.posix.join(prefix, item.name);
    if (item.isDirectory()) result.push(...await listFiles(path.join(directory, item.name), relative));
    else result.push(relative);
  }
  return result;
}

const files = await listFiles(runtimeDir);
if (files.some((file) => file.endsWith('.map'))) {
  throw new Error('Source maps are not allowed in the committed runtime directory.');
}

const rasterAssets = files.filter((file) => /^assets\/.*\.png$/i.test(file));
const mapAssets = files.filter((file) => /^assets\/.*\.json$/i.test(file));
if (rasterAssets.length < 3 || mapAssets.length < 1) {
  throw new Error(`Expected three PNG atlases and one map JSON, found ${rasterAssets.length} PNG and ${mapAssets.length} JSON files.`);
}
const entry = await readFile(entryPath, 'utf8');
const expectedAssets = [...rasterAssets, ...mapAssets];
const missingAssetReferences = expectedAssets.filter((asset) => !entry.includes(`/assets/world/runtime/${asset}`));
if (missingAssetReferences.length > 0) {
  throw new Error(`World entry does not reference expected runtime assets: ${missingAssetReferences.join(', ')}`);
}
const jsGzipBytes = gzipSync(await readFile(entryPath)).byteLength;
const pngBytes = (await Promise.all(rasterAssets.map(async (asset) => (await stat(path.join(runtimeDir, asset))).size)))
  .reduce((total, size) => total + size, 0);
if (jsGzipBytes > 500 * 1024) throw new Error(`World entry gzip size exceeds 500 KiB: ${jsGzipBytes} bytes.`);
if (pngBytes > 1024 * 1024) throw new Error(`Initial PNG atlas size exceeds 1 MiB: ${pngBytes} bytes.`);
const activityChunk = files.find((file) => /^chunks\/mini-fireworks-.*\.js$/.test(file));
if (!activityChunk) throw new Error('The registered mini-fireworks activity must be emitted as a deferred chunk.');
if (!entry.includes(activityChunk)) throw new Error('The world entry does not reference the deferred firework activity chunk.');

for (const relativeFile of files.filter((file) => file.endsWith('.js'))) {
  const source = await readFile(path.join(runtimeDir, relativeFile), 'utf8');
  if (/from\s*["']phaser["']|import\s*\(\s*["']phaser["']/.test(source)) {
    throw new Error(`Production file contains an unresolved Phaser import: ${relativeFile}`);
  }
  if (/https?:\/\/[^"'\s]*cdn\./i.test(source)) {
    throw new Error(`Production file depends on a runtime CDN: ${relativeFile}`);
  }
}

const notices = await readFile(noticesPath, 'utf8');
if (!notices.includes('Phaser 4.2.0 (MIT)') || !notices.includes('Permission is hereby granted')) {
  throw new Error('Third-party notice does not contain the expected Phaser version and license text.');
}

console.log(`Verified ${files.length} runtime files: ${rasterAssets.length} PNG atlases (${pngBytes} bytes), ${mapAssets.length} map JSON, a deferred firework chunk, and a ${Math.round(jsGzipBytes / 1024)} KiB gzip entry.`);
