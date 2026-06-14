import {
  state,
  saveGame,
  switchView,
  currentAssembly,
  currentAssemblyTab,
  currentShell,
  previewRenderer,
  setCurrentShell,
  setCurrentAssemblyTab,
  setPreviewRenderer,
} from '../app-state.js';
import { RECIPES, EVENT_TYPES, RANKS } from '../config.js';
import { FireworkRenderer } from '../renderer.js';
import {
  getAvailableEvents,
  getRecipeById,
  getUnlockedComponents,
  getComponentById,
  assembleShell,
  loadRecipe,
  isExactRecipeMatch,
  getEventPreferenceHint,
  displayLabel,
  validateShellComponents,
  validateShow,
} from '../systems.js';
import {
  formatMoney,
  getQty,
  setQty,
  sumQty,
  dominantColor,
  formatColorVector,
  formatEffects,
  formatPercent,
  componentStatLine,
} from '../ui-utils.js';
import { updateHub } from './hub.js';

const CATEGORY_LABELS = {
  gunpowder: '火药',
  casing: '壳体',
  colorant: '颜色剂',
  fuse: '引线',
  effect: '特效剂',
};

const VALIDATION_REASONS = {
  missing_category: '缺少必要分类',
  invalid_casing: '壳体无效',
  invalid_component: '组件无效',
  invalid_fuse: '引线无效',
  over_capacity: '超出主层容量',
  needs_multi_layer_casing: '需要多层壳体才能使用二层装药',
  gunpowder_in_secondary: '二层不能装火药',
  over_secondary_capacity: '超出二层容量',
  event_not_found: '赛事不存在',
  empty_show: '节目单为空',
  too_few_shells: '弹数不足',
  too_many_shells: '弹数超过上限',
  component_not_unlocked: '包含未解锁组件',
  recipe_not_owned: '包含未拥有配方',
  over_budget: '超出预算',
  insufficient_entry_fee: '报名费不足',
};

export function resetAssemblyToDefault() {
  currentAssembly.gunpowder = { g001: 2 };
  currentAssembly.casing = 'c001';
  currentAssembly.colorant = { col001: 2 };
  currentAssembly.fuse = 'f002';
  currentAssembly.effect = {};
  currentAssembly.secondary = { colorant: {}, effect: {} };
}

export function renderBuild() {
  const event = getAvailableEvents(state).find(e => e.id === state.selectedEventId);
  if (!event) {
    switchView('events');
    return;
  }

  document.getElementById('build-title').textContent = event.name;
  document.getElementById('build-budget').textContent = event.budget !== null ? formatMoney(event.budget) : '无限制';
  document.getElementById('build-min').textContent = event.minShells;
  document.getElementById('build-max').textContent = event.maxShells;
  document.getElementById('build-rewards').textContent = `资金 ${event.rewards.funds} / 名气 ${event.rewards.fame}`;
  document.getElementById('build-hint').textContent = `偏好：${getEventPreferenceHint(event.id)}`;

  const detailBtn = document.getElementById('event-detail-btn');
  detailBtn.onclick = () => showEventDetail(event);

  renderAssemblyBench();
  updateAssemblyPreview();
  renderLibrary();
  renderShow();
}

export function showEventDetail(event) {
  document.getElementById('detail-name').textContent = event.name;
  const typeInfo = EVENT_TYPES[event.type];
  const body = document.getElementById('detail-body');
  body.innerHTML = `
    <div class="detail-row"><span>类型</span><span class="tag ${typeInfo.labelClass}">${typeInfo.name}</span></div>
    <div class="detail-row"><span>等级要求</span><span>${RANKS[event.rank].name}</span></div>
    <div class="detail-row"><span>预算</span><span>${event.budget !== null ? formatMoney(event.budget) : '无限制'}</span></div>
    <div class="detail-row"><span>弹数限制</span><span>${event.minShells} ~ ${event.maxShells}</span></div>
    <div class="detail-row"><span>报名费</span><span>${event.entryFee > 0 ? formatMoney(event.entryFee) : '免费'}</span></div>
    <div class="detail-row"><span>基础奖励</span><span>资金 ${event.rewards.funds} / 名气 ${event.rewards.fame}</span></div>
    <div class="detail-row"><span>首通奖励</span><span>资金 ${event.firstClearBonus.funds} / 名气 ${event.firstClearBonus.fame}</span></div>
    <div class="detail-section">
      <div class="detail-section-title">赛事描述</div>
      <p>${event.desc}</p>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">主办方偏好</div>
      <p>${event.preferenceDesc || '无特殊偏好'}</p>
    </div>
  `;
  document.getElementById('event-detail-modal').style.display = 'block';
}

export function hideEventDetail() {
  document.getElementById('event-detail-modal').style.display = 'none';
}

export function renderAssemblyBench() {
  const container = document.getElementById('assembly-categories');
  container.innerHTML = '';
  const unlocked = getUnlockedComponents(state);
  const casing = unlocked.casing[currentAssembly.casing];

  document.querySelectorAll('#assembly-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === currentAssemblyTab);
  });
  const secColorantTab = document.getElementById('tab-secondary-colorant');
  const secEffectTab = document.getElementById('tab-secondary-effect');
  if (secColorantTab) {
    secColorantTab.style.display = casing && casing.layers >= 2 ? 'inline-block' : 'none';
  }
  if (secEffectTab) {
    secEffectTab.style.display = casing && casing.layers >= 2 ? 'inline-block' : 'none';
  }
  if (currentAssemblyTab.startsWith('secondary-') && (!casing || casing.layers < 2)) {
    setCurrentAssemblyTab('gunpowder');
  }

  let category = currentAssemblyTab;
  let isSecondary = false;
  if (category.startsWith('secondary-')) {
    isSecondary = true;
    category = category.replace('secondary-', '');
  }

  const group = document.createElement('div');
  group.className = 'category-group';
  const title = isSecondary ? `${CATEGORY_LABELS[category]}（二层）` : CATEGORY_LABELS[category];
  group.innerHTML = `<div class="category-title">${title}</div>`;
  const cards = document.createElement('div');
  cards.className = 'component-cards';

  const isQuantity = category === 'gunpowder' || category === 'colorant' || category === 'effect';
  const selectedMapOrId = isSecondary ? currentAssembly.secondary[category] : currentAssembly[category];

  for (const comp of Object.values(unlocked[category])) {
    const card = document.createElement('div');
    card.className = 'component-card';
    if (isQuantity) card.classList.add('quantity');

    const qty = isQuantity ? getQty(selectedMapOrId, comp.id) : 0;
    const selected = isQuantity ? qty > 0 : selectedMapOrId === comp.id;
    if (selected) card.classList.add('selected');

    const qtyBadge = isQuantity && qty > 0 ? `<span class="qty-badge">${qty}</span>` : '';
    const desc = comp.desc ? `<span class="comp-desc">${comp.desc}</span>` : '';
    card.innerHTML = `
      <span class="comp-name">${comp.name}${qtyBadge}</span>
      <span class="comp-meta">${formatMoney(comp.cost)} · ${componentStatLine(category, comp)}</span>
      ${desc}
    `;

    card.addEventListener('click', () => {
      if (isQuantity) {
        const map = isSecondary ? currentAssembly.secondary[category] : currentAssembly[category];
        setQty(map, comp.id, getQty(map, comp.id) + 1);
      } else {
        currentAssembly[category] = comp.id;
        if (category === 'casing' && comp.layers < 2) {
          currentAssembly.secondary = { colorant: {}, effect: {} };
        }
      }
      renderAssemblyBench();
      updateAssemblyPreview();
      renderLoadout();
    });

    cards.appendChild(card);
  }

  group.appendChild(cards);
  container.appendChild(group);

  updateCapacityBars();
  renderLoadout();
}

export function renderLoadout() {
  const container = document.getElementById('loadout-list');
  if (!container) return;
  container.innerHTML = '';
  const unlocked = getUnlockedComponents(state);

  const sections = [
    { key: 'gunpowder', label: '火药' },
    { key: 'fuse', label: '引线', single: true },
    { key: 'casing', label: '壳体', single: true },
    { key: 'colorant', label: '颜色剂' },
    { key: 'effect', label: '特效剂' },
  ];

  for (const sec of sections) {
    const items = sec.single
      ? (currentAssembly[sec.key] ? [{ id: currentAssembly[sec.key], qty: 1 }] : [])
      : Object.entries(currentAssembly[sec.key]).map(([id, qty]) => ({ id, qty })).filter(i => i.qty > 0);

    const group = document.createElement('div');
    group.className = 'loadout-group';
    const title = document.createElement('div');
    title.className = 'loadout-group-title';
    title.textContent = sec.label;
    group.appendChild(title);

    if (items.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'loadout-empty';
      empty.textContent = '未选择';
      group.appendChild(empty);
    } else {
      for (const item of items) {
        const comp = getComponentById(sec.key, item.id);
        if (!comp) continue;
        const row = document.createElement('div');
        row.className = 'loadout-item';
        row.innerHTML = `
          <span class="loadout-name">${comp.name}${sec.single ? '' : ` ×${item.qty}`}</span>
          <span class="loadout-actions">
            ${sec.single ? '' : '<button class="loadout-minus" aria-label="减少">-</button><button class="loadout-plus" aria-label="增加">+</button>'}
            <button class="loadout-remove" aria-label="移除">×</button>
          </span>
        `;
        if (!sec.single) {
          row.querySelector('.loadout-minus').addEventListener('click', () => {
            const map = currentAssembly[sec.key];
            setQty(map, item.id, getQty(map, item.id) - 1);
            renderAssemblyBench(); updateAssemblyPreview(); renderLoadout();
          });
          row.querySelector('.loadout-plus').addEventListener('click', () => {
            const map = currentAssembly[sec.key];
            setQty(map, item.id, getQty(map, item.id) + 1);
            renderAssemblyBench(); updateAssemblyPreview(); renderLoadout();
          });
        }
        row.querySelector('.loadout-remove').addEventListener('click', () => {
          if (sec.single) {
            setCurrentAssemblyTab(sec.key);
          } else {
            delete currentAssembly[sec.key][item.id];
          }
          renderAssemblyBench(); updateAssemblyPreview(); renderLoadout();
        });
        group.appendChild(row);
      }
    }
    container.appendChild(group);
  }

  const casing = unlocked.casing[currentAssembly.casing];
  if (casing && casing.layers >= 2) {
    for (const secKey of ['colorant', 'effect']) {
      const items = Object.entries(currentAssembly.secondary[secKey])
        .map(([id, qty]) => ({ id, qty }))
        .filter(i => i.qty > 0);
      const group = document.createElement('div');
      group.className = 'loadout-group';
      const title = document.createElement('div');
      title.className = 'loadout-group-title';
      title.textContent = secKey === 'colorant' ? '二层颜色剂' : '二层特效剂';
      group.appendChild(title);
      if (items.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'loadout-empty';
        empty.textContent = '未选择';
        group.appendChild(empty);
      } else {
        for (const item of items) {
          const comp = getComponentById(secKey, item.id);
          if (!comp) continue;
          const row = document.createElement('div');
          row.className = 'loadout-item';
          row.innerHTML = `
            <span class="loadout-name">${comp.name} ×${item.qty}</span>
            <span class="loadout-actions">
              <button class="loadout-minus" aria-label="减少">-</button>
              <button class="loadout-plus" aria-label="增加">+</button>
              <button class="loadout-remove" aria-label="移除">×</button>
            </span>
          `;
          row.querySelector('.loadout-minus').addEventListener('click', () => {
            setQty(currentAssembly.secondary[secKey], item.id, getQty(currentAssembly.secondary[secKey], item.id) - 1);
            renderAssemblyBench(); updateAssemblyPreview(); renderLoadout();
          });
          row.querySelector('.loadout-plus').addEventListener('click', () => {
            setQty(currentAssembly.secondary[secKey], item.id, getQty(currentAssembly.secondary[secKey], item.id) + 1);
            renderAssemblyBench(); updateAssemblyPreview(); renderLoadout();
          });
          row.querySelector('.loadout-remove').addEventListener('click', () => {
            delete currentAssembly.secondary[secKey][item.id];
            renderAssemblyBench(); updateAssemblyPreview(); renderLoadout();
          });
          group.appendChild(row);
        }
      }
      container.appendChild(group);
    }
  }
}

export function updateCapacityBars() {
  const casing = getUnlockedComponents(state).casing[currentAssembly.casing];
  if (!casing) return;
  const primaryUsage = sumQty(currentAssembly.gunpowder) + sumQty(currentAssembly.colorant) + sumQty(currentAssembly.effect);
  const fill = document.getElementById('primary-capacity-fill');
  const text = document.getElementById('primary-capacity-text');
  const pct = Math.min(100, (primaryUsage / casing.capacity) * 100);
  fill.style.width = `${pct}%`;
  fill.classList.toggle('over', primaryUsage > casing.capacity);
  text.textContent = `${primaryUsage}/${casing.capacity}`;

  const secondaryRow = document.getElementById('secondary-capacity-row');
  if (secondaryRow) {
    secondaryRow.style.display = casing.layers >= 2 ? 'flex' : 'none';
  }
  if (casing.layers >= 2) {
    const secondaryUsage = sumQty(currentAssembly.secondary.colorant) + sumQty(currentAssembly.secondary.effect);
    const secFill = document.getElementById('secondary-capacity-fill');
    const secText = document.getElementById('secondary-capacity-text');
    const secPct = Math.min(100, (secondaryUsage / casing.secondaryCapacity) * 100);
    secFill.style.width = `${secPct}%`;
    secFill.classList.toggle('over', secondaryUsage > casing.secondaryCapacity);
    secText.textContent = `${secondaryUsage}/${casing.secondaryCapacity}`;
  }
}

export function updateAssemblyPreview() {
  const validation = validateShellComponents(currentAssembly);
  const validationEl = document.getElementById('assembly-validation');
  const addBtn = document.getElementById('assembly-add');

  if (!validation.valid) {
    validationEl.textContent = VALIDATION_REASONS[validation.reason] || validation.reason;
    validationEl.className = 'validation-msg invalid';
    addBtn.disabled = true;
    setCurrentShell(null);
    if (previewRenderer) previewRenderer.stop();
    clearPreviewCanvas();
    resetAttrReadout();
    return;
  }

  validationEl.textContent = '';
  validationEl.className = 'validation-msg';

  const shell = assembleShell(currentAssembly);
  setCurrentShell(shell);

  document.getElementById('attr-height').textContent = formatPercent(shell.height);
  document.getElementById('attr-scale').textContent = formatPercent(shell.scale);
  document.getElementById('attr-density').textContent = formatPercent(shell.density);
  document.getElementById('attr-duration').textContent = formatPercent(shell.duration);
  document.getElementById('attr-color').textContent = formatColorVector(shell.color);
  document.getElementById('attr-effects').textContent = formatEffects(shell.effects);

  addBtn.disabled = false;

  if (!previewRenderer) {
    const canvas = document.getElementById('preview-canvas');
    setPreviewRenderer(new FireworkRenderer(canvas));
    previewRenderer.init(canvas);
  }
  previewRenderer.startPreview(shell);
}

function clearPreviewCanvas() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function resetAttrReadout() {
  for (const id of ['attr-height', 'attr-scale', 'attr-density', 'attr-duration', 'attr-color', 'attr-effects']) {
    document.getElementById(id).textContent = '--';
  }
}

export function addAssembledShell() {
  const event = getAvailableEvents(state).find(e => e.id === state.selectedEventId);
  if (!event || !currentShell) return;
  if (state.currentShow.length >= event.maxShells) return;

  const matchedRecipeId = findMatchingOwnedRecipe();
  const shell = matchedRecipeId
    ? assembleShell(currentAssembly, RECIPES[matchedRecipeId])
    : currentShell;

  state.addToShow(shell);
  renderShow();
}

function findMatchingOwnedRecipe() {
  for (const recipeId of state.ownedRecipes) {
    if (isExactRecipeMatch(currentAssembly, recipeId)) return recipeId;
  }
  return null;
}

export function removeFromShow(index) {
  state.removeFromShow(index);
  renderShow();
}

export function renderShow() {
  const showList = document.getElementById('build-show');
  showList.innerHTML = '';
  let cost = 0;
  state.currentShow.forEach((item, index) => {
    const shell = typeof item === 'object' ? item : getRecipeById(item);
    if (!shell) return;
    cost += shell.cost;
    const itemEl = document.createElement('div');
    itemEl.className = 'show-item';
    const displayName = shell.name || `${displayLabel('color', dominantColor(shell.color))}·${displayLabel('shape', shell.shape)}`;
    itemEl.innerHTML = `<span>${displayName}</span><button aria-label="移除">×</button>`;
    itemEl.querySelector('button').addEventListener('click', () => removeFromShow(index));
    showList.appendChild(itemEl);
  });
  if (state.currentShow.length === 0) {
    showList.innerHTML = '<p class="empty-show">节目单为空，请从左侧组装或加载配方</p>';
  }
  document.getElementById('build-cost').textContent = formatMoney(cost);
  document.getElementById('build-count').textContent = state.currentShow.length;

  const validation = validateShow(state, state.selectedEventId, state.currentShow);
  const confirmBtn = document.getElementById('build-confirm');
  confirmBtn.disabled = !validation.valid;

  const validationEl = document.getElementById('build-validation');
  if (validation.valid) {
    validationEl.textContent = '';
    validationEl.className = 'validation-msg';
  } else {
    validationEl.textContent = VALIDATION_REASONS[validation.reason] || validation.reason;
    validationEl.className = 'validation-msg invalid';
  }
}

export function renderLibrary() {
  const recipeTab = document.getElementById('library-recipes');
  recipeTab.innerHTML = '';
  for (const recipeId of Array.from(state.ownedRecipes).sort()) {
    const recipe = getRecipeById(recipeId);
    if (!recipe) continue;
    const item = document.createElement('button');
    item.className = 'library-item';
    item.innerHTML = `
      <span class="item-name">${recipe.name}</span>
      <span class="item-meta">${formatMoney(recipe.cost)} · ${displayLabel('shape', recipe.shape)} · ${displayLabel('color', dominantColor(recipe.color))}</span>
    `;
    item.addEventListener('click', () => loadRecipeIntoAssembly(recipeId));
    recipeTab.appendChild(item);
  }

  renderBlueprints();
}

export function renderBlueprints() {
  const slotsInfo = document.getElementById('blueprint-slots');
  slotsInfo.textContent = `蓝图槽位：${state.ownedBlueprints.size}/${state.blueprintSlots}`;

  const list = document.getElementById('blueprint-list');
  list.innerHTML = '';
  if (state.ownedBlueprints.size === 0) {
    list.innerHTML = '<p class="empty-show">还没有保存的蓝图</p>';
    return;
  }
  for (const id of Array.from(state.ownedBlueprints).sort()) {
    const bp = state.blueprints[id];
    if (!bp) {
      const err = document.createElement('p');
      err.className = 'empty-show';
      err.textContent = '蓝图数据异常：' + id;
      list.appendChild(err);
      continue;
    }
    const item = document.createElement('div');
    item.className = 'library-item blueprint-item';
    item.innerHTML = `
      <div class="item-info">
        <span class="item-name">${bp.name}</span>
        <span class="item-meta">${blueprintSummary(bp.components)}</span>
      </div>
      <div class="item-actions">
        <button class="btn small danger delete-btn">删除</button>
      </div>
    `;
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      loadBlueprintIntoAssembly(id);
    });
    item.querySelector('.delete-btn').addEventListener('click', () => {
      state.deleteBlueprint(id);
      saveGame();
      renderBlueprints();
    });
    list.appendChild(item);
  }
}

function blueprintSummary(components) {
  const casing = getUnlockedComponents(state).casing[components.casing];
  const shape = casing ? displayLabel('shape', casing.shape) : '';
  return `${displayLabel('color', dominantColor(components.colorant))}·${shape}`;
}

export function loadRecipeIntoAssembly(recipeId) {
  const components = loadRecipe(recipeId);
  if (!components) return;
  applyAssembly(components);
  renderAssemblyBench();
  updateAssemblyPreview();
}

export function loadBlueprintIntoAssembly(id) {
  const components = state.loadBlueprint(id);
  if (!components) return;
  const bp = state.blueprints[id];
  applyAssembly(components);
  renderAssemblyBench();
  updateAssemblyPreview();
  showPreviewToast(bp ? `已加载蓝图：${bp.name}` : '已加载蓝图');
}

function showPreviewToast(message) {
  const toast = document.getElementById('preview-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 1800);
}

export function applyAssembly(components) {
  currentAssembly.gunpowder = { ...(components.gunpowder || {}) };
  currentAssembly.casing = components.casing || 'c001';
  currentAssembly.colorant = { ...(components.colorant || {}) };
  currentAssembly.fuse = components.fuse || 'f002';
  currentAssembly.effect = { ...(components.effect || {}) };
  currentAssembly.secondary = { colorant: {}, effect: {} };
  const sec = components.secondary || {};
  currentAssembly.secondary.colorant = { ...(sec.colorant || {}) };
  currentAssembly.secondary.effect = { ...(sec.effect || {}) };
}

export function openBlueprintSaveModal() {
  const input = document.getElementById('blueprint-name-input');
  input.value = '';
  document.getElementById('blueprint-save-modal').style.display = 'block';
  input.focus();
}

export function closeBlueprintSaveModal() {
  document.getElementById('blueprint-save-modal').style.display = 'none';
}

export function confirmSaveBlueprint() {
  const input = document.getElementById('blueprint-name-input');
  const name = input.value.trim();
  if (!name) {
    input.style.borderColor = 'var(--danger)';
    return;
  }
  input.style.borderColor = '';
  try {
    const result = state.saveBlueprint(name, currentAssembly);
    if (!result.success) {
      alert('保存失败：' + (VALIDATION_REASONS[result.reason] || result.reason));
      return;
    }
    saveGame();
    renderBlueprints();
    switchLibraryTab('blueprints');
    showPreviewToast(`蓝图已保存：${result.blueprint.name}`);
  } catch (err) {
    console.error('save blueprint failed', err);
    alert('保存蓝图时出错，请查看控制台。');
  }
  closeBlueprintSaveModal();
}

export function expandBlueprintSlot() {
  const result = state.expandBlueprintSlot();
  if (!result.success) {
    alert('扩展失败：资金不足');
    return;
  }
  saveGame();
  updateHub();
  renderBlueprints();
}

export function switchLibraryTab(tab) {
  document.querySelectorAll('.library-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('library-recipes').classList.toggle('active', tab === 'recipes');
  document.getElementById('library-blueprints').classList.toggle('active', tab === 'blueprints');
  document.getElementById('library-recipes').style.display = tab === 'recipes' ? 'flex' : 'none';
  document.getElementById('library-blueprints').style.display = tab === 'blueprints' ? 'flex' : 'none';
}
