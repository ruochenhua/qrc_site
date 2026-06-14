import { state, saveGame } from '../app-state.js';
import { getUnlockedRecipes, researchRecipe, displayLabel } from '../systems.js';
import { dominantColor, formatMoney } from '../ui-utils.js';
import { updateHub } from './hub.js';

export function renderLab() {
  const ownedList = document.getElementById('lab-owned');
  ownedList.innerHTML = '';
  for (const recipe of getUnlockedRecipes(state)) {
    const isOwned = state.ownedRecipes.has(recipe.id);
    const item = document.createElement('div');
    item.className = `lab-item ${isOwned ? 'owned' : 'locked'}`;
    item.innerHTML = `
      <div class="lab-name">${recipe.name}</div>
      <div class="lab-meta">${displayLabel('color', dominantColor(recipe.color))} · ${displayLabel('shape', recipe.shape)} · ${formatMoney(recipe.cost)}</div>
      <div class="lab-desc">${recipe.desc}</div>
    `;
    if (!isOwned && recipe.researchCost > 0) {
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.textContent = `研发 ${formatMoney(recipe.researchCost)}`;
      btn.disabled = state.funds < recipe.researchCost;
      btn.addEventListener('click', () => {
        const res = researchRecipe(state, recipe.id);
        if (res.success) {
          saveGame();
          renderLab();
          updateHub();
        }
      });
      item.appendChild(btn);
    }
    ownedList.appendChild(item);
  }
}
