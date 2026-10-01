import { fileURLToPath } from 'node:url';
import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = path.resolve(projectRoot, '..');
const runtimeDirectory = path.resolve(projectRoot, '../assets/world/runtime');
const expectedRuntimeDirectory = path.resolve(repositoryRoot, 'assets/world/runtime');

if (runtimeDirectory !== expectedRuntimeDirectory || !runtimeDirectory.startsWith(`${repositoryRoot}${path.sep}`)) {
  throw new Error(`Refusing to build outside the expected runtime directory: ${runtimeDirectory}`);
}
if (existsSync(runtimeDirectory) && lstatSync(runtimeDirectory).isSymbolicLink()) {
  throw new Error(`Refusing to clear a linked runtime directory: ${runtimeDirectory}`);
}

export default defineConfig(({ command }) => ({
  root: projectRoot,
  base: command === 'build' ? '/assets/world/runtime/' : '/',
  publicDir: false,
  build: {
    outDir: runtimeDirectory,
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: fileURLToPath(new URL('./src/bootstrap/main.ts', import.meta.url)),
      output: {
        entryFileNames: 'world.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css')
          ? 'world.css'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
}));
