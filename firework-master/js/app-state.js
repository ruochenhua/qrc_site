import { GameState, SaveSystem } from './state.js';

export const state = new GameState();

export let renderer = null;
export let previewRenderer = null;

export const currentAssembly = {
  gunpowder: { g001: 2 },
  casing: 'c001',
  colorant: { col001: 2 },
  fuse: 'f002',
  effect: {},
  secondary: { colorant: {}, effect: {} },
};

export let currentAssemblyTab = 'gunpowder';
export let currentShell = null;

export const views = {};

export function setRenderer(r) {
  renderer = r;
}

export function setPreviewRenderer(r) {
  previewRenderer = r;
}

export function setCurrentShell(s) {
  currentShell = s;
}

export function setCurrentAssemblyTab(t) {
  currentAssemblyTab = t;
}

export function switchView(name) {
  for (const [key, el] of Object.entries(views)) {
    if (el) el.classList.toggle('active', key === name);
  }
}

export function saveGame() {
  SaveSystem.save(state);
}

export { SaveSystem };
