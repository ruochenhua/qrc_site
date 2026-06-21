import { state, SaveSystem, switchView } from '../app-state.js';
import { updateUnlocks } from '../systems.js';
import { FireworkRenderer } from '../renderer.js';
import { updateHub, renderEnding } from './hub.js';
import { resetAssemblyToDefault } from './build.js';

let startRenderer = null;

function getStartRenderer() {
  if (!startRenderer) {
    const canvas = document.getElementById('start-canvas');
    if (!canvas) return null;
    startRenderer = new FireworkRenderer(canvas);
    startRenderer.init(canvas);
  }
  return startRenderer;
}

export function renderStart() {
  const hasSave = SaveSystem.exists();
  document.getElementById('continue-btn').style.display = hasSave ? 'inline-block' : 'none';
  const renderer = getStartRenderer();
  if (renderer) renderer.startAmbient();
}

export function stopStartRenderer() {
  if (startRenderer) startRenderer.stop();
}

export function resizeStartRenderer() {
  if (startRenderer) startRenderer.resize();
}

export function startNewGame() {
  stopStartRenderer();
  state.reset();
  SaveSystem.clear();
  updateUnlocks(state);
  resetAssemblyToDefault();
  switchView('hub');
  updateHub();
}

export function continueGame() {
  stopStartRenderer();
  const data = SaveSystem.load();
  if (data) {
    SaveSystem.apply(state, data);
    if (state.won) {
      renderEnding();
      switchView('ending');
    } else {
      switchView('hub');
      updateHub();
    }
  }
}

export function resetSave() {
  if (confirm('确定要重置存档吗？')) {
    SaveSystem.clear();
    state.reset();
    renderStart();
    switchView('start');
  }
}
