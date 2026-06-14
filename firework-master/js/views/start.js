import { state, SaveSystem, switchView } from '../app-state.js';
import { updateUnlocks } from '../systems.js';
import { updateHub, renderEnding } from './hub.js';
import { resetAssemblyToDefault } from './build.js';

export function renderStart() {
  const hasSave = SaveSystem.exists();
  document.getElementById('continue-btn').style.display = hasSave ? 'inline-block' : 'none';
}

export function startNewGame() {
  state.reset();
  SaveSystem.clear();
  updateUnlocks(state);
  resetAssemblyToDefault();
  switchView('hub');
  updateHub();
}

export function continueGame() {
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
