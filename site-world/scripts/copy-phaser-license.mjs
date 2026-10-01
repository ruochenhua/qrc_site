import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDirectory, '..');
const runtimeDirectory = path.resolve(packageRoot, '../assets/world/runtime');
const phaserPackage = JSON.parse(await readFile(path.join(packageRoot, 'node_modules/phaser/package.json'), 'utf8'));
const licenseText = await readFile(path.join(packageRoot, 'node_modules/phaser/LICENSE.md'), 'utf8');

await mkdir(runtimeDirectory, { recursive: true });
await writeFile(
  path.join(runtimeDirectory, 'THIRD_PARTY_NOTICES.txt'),
  `QRC-Eye interactive world runtime includes Phaser ${phaserPackage.version} (${phaserPackage.license}).\n\n${licenseText}`,
  'utf8',
);
