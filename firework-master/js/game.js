import {
  state,
  views,
  switchView,
  saveGame,
  renderer,
  previewRenderer,
  setCurrentAssemblyTab,
} from './app-state.js';
import { rankUp } from './systems.js';

import { renderStart, startNewGame, continueGame, resetSave } from './views/start.js';
import { updateHub, renderEnding } from './views/hub.js';
import { renderEvents } from './views/events.js';
import {
  renderAssemblyBench,
  renderShow,
  openBlueprintSaveModal,
  closeBlueprintSaveModal,
  confirmSaveBlueprint,
  expandBlueprintSlot,
  switchLibraryTab,
  addAssembledShell,
  hideEventDetail,
} from './views/build.js';
import { startPerformance, showResult } from './views/perform.js';
import { renderLab } from './views/lab.js';

function init() {
  views.start = document.getElementById('view-start');
  views.hub = document.getElementById('view-hub');
  views.events = document.getElementById('view-events');
  views.build = document.getElementById('view-build');
  views.perform = document.getElementById('view-perform');
  views.result = document.getElementById('view-result');
  views.lab = document.getElementById('view-lab');
  views.ending = document.getElementById('view-ending');

  renderStart();
  switchView('start');

  document.getElementById('new-game-btn').addEventListener('click', startNewGame);
  document.getElementById('continue-btn').addEventListener('click', continueGame);

  document.getElementById('hub-events').addEventListener('click', () => {
    renderEvents();
    switchView('events');
  });
  document.getElementById('hub-lab').addEventListener('click', () => {
    renderLab();
    switchView('lab');
  });
  document.getElementById('hub-settings').addEventListener('click', resetSave);
  document.getElementById('hub-rankup').addEventListener('click', () => {
    if (rankUp(state)) {
      saveGame();
      updateHub();
    }
  });

  document.getElementById('events-back').addEventListener('click', () => switchView('hub'));

  document.getElementById('build-back').addEventListener('click', () => {
    state.clearShow();
    if (previewRenderer) previewRenderer.stop();
    switchView('events');
  });
  document.getElementById('build-clear').addEventListener('click', () => {
    state.clearShow();
    renderShow();
  });
  document.getElementById('build-confirm').addEventListener('click', startPerformance);
  document.getElementById('assembly-add').addEventListener('click', addAssembledShell);

  document.querySelectorAll('.library-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchLibraryTab(btn.dataset.tab));
  });
  document.querySelectorAll('#assembly-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentAssemblyTab(btn.dataset.tab);
      renderAssemblyBench();
    });
  });
  document.getElementById('blueprint-expand').addEventListener('click', expandBlueprintSlot);

  document.getElementById('perform-skip').addEventListener('click', () => {
    if (renderer) renderer.stop();
    showResult();
  });

  document.getElementById('result-continue').addEventListener('click', () => {
    if (state.won) {
      renderEnding();
      switchView('ending');
    } else {
      updateHub();
      switchView('hub');
    }
  });

  document.getElementById('lab-back').addEventListener('click', () => switchView('hub'));
  document.getElementById('ending-back').addEventListener('click', () => switchView('hub'));

  document.getElementById('detail-close').addEventListener('click', hideEventDetail);
  document.querySelector('#event-detail-modal .modal-backdrop').addEventListener('click', hideEventDetail);

  document.getElementById('blueprint-save').addEventListener('click', openBlueprintSaveModal);
  document.getElementById('blueprint-save-cancel').addEventListener('click', closeBlueprintSaveModal);
  document.getElementById('blueprint-save-confirm').addEventListener('click', confirmSaveBlueprint);
  document.querySelector('#blueprint-save-modal .modal-backdrop').addEventListener('click', closeBlueprintSaveModal);
  document.getElementById('blueprint-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmSaveBlueprint();
    if (e.key === 'Escape') closeBlueprintSaveModal();
  });

  window.addEventListener('resize', () => {
    if (renderer && document.getElementById('view-perform').classList.contains('active')) {
      renderer.resize();
    }
    if (previewRenderer) {
      previewRenderer.resize();
    }
  });
}

init();
