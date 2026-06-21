import { state, saveGame } from '../app-state.js';
import { COMPONENTS, COMPONENT_CATEGORIES } from '../config.js';
import {
  isComponentUnlocked,
  researchComponent,
} from '../systems.js';
import {
  formatMoney,
  componentStatLine,
  renderGlobalStatus,
  refreshGlobalBars,
  showToast,
} from '../ui-utils.js';
import { createButton, createBadge, createCard } from '../ui/components/index.js';
import { updateHub } from './hub.js';

const CATEGORY_LABELS = {
  gunpowder: '火药',
  casing: '壳体',
  colorant: '颜色剂',
  fuse: '引线',
  effect: '特效剂',
};

const CATEGORY_COLORS = {
  gunpowder: '#ffaa33',
  casing: '#8a9bb8',
  colorant: '#ff5555',
  fuse: '#ffcc33',
  effect: '#cc77ff',
};

export function renderLab() {
  renderGlobalStatus(document.getElementById('lab-global-bar'), state);

  const ownedList = document.getElementById('lab-owned');
  const researchableList = document.getElementById('lab-researchable');
  const lockedList = document.getElementById('lab-locked');
  ownedList.innerHTML = '';
  researchableList.innerHTML = '';
  lockedList.innerHTML = '';

  const groups = {
    owned: [],
    researchable: [],
    locked: [],
  };

  for (const category of COMPONENT_CATEGORIES) {
    for (const comp of Object.values(COMPONENTS[category])) {
      const item = { category, comp };
      if (state.ownedComponents.has(comp.id)) {
        groups.owned.push(item);
      } else if (isComponentUnlocked(state, comp.id)) {
        groups.researchable.push(item);
      } else {
        groups.locked.push(item);
      }
    }
  }

  for (const item of groups.owned) {
    ownedList.appendChild(createComponentCard(item, 'owned'));
  }
  for (const item of groups.researchable) {
    researchableList.appendChild(createComponentCard(item, 'researchable'));
  }
  for (const item of groups.locked) {
    lockedList.appendChild(createComponentCard(item, 'locked'));
  }
}

function createComponentCard({ category, comp }, status) {
  const card = createCard({
    className: `recipe-card ${status}`,
    children: [],
  });
  card.innerHTML = `
    <div class="recipe-swatch" style="--recipe-color: ${CATEGORY_COLORS[category]}"></div>
    <div class="recipe-main">
      <div class="recipe-title-row">
        <h3 class="recipe-name">${comp.name}</h3>
        <span class="recipe-status"></span>
      </div>
      <div class="recipe-tags">
        <span class="recipe-tag">${CATEGORY_LABELS[category]}</span>
        <span class="recipe-tag">${componentStatLine(category, comp)}</span>
        <span class="recipe-tag">单价 ${formatMoney(comp.cost)}</span>
      </div>
      <p class="recipe-desc">${comp.desc}</p>
    </div>
  `;

  card.querySelector('.recipe-status').appendChild(
    createBadge({ text: statusLabel(status, comp), className: `recipe-status-label status-${status}` }),
  );

  if (status === 'researchable') {
    const isFree = comp.researchCost === 0;
    card.querySelector('.recipe-main').appendChild(
      createButton({
        text: isFree ? '免费获取' : `购买 ${formatMoney(comp.researchCost)}`,
        variant: 'primary',
        disabled: !isFree && state.funds < comp.researchCost,
        className: 'recipe-research',
        onClick: () => {
          const res = researchComponent(state, category, comp.id);
          if (res.success) {
            saveGame();
            renderLab();
            updateHub();
            refreshGlobalBars(state);
            showToast(`购买成功：${comp.name}`, { type: 'success' });
          } else {
            const msg = res.reason === 'insufficient_funds' ? '资金不足' : res.reason;
            showToast(`购买失败：${msg}`, { type: 'warning' });
          }
        },
      }),
    );
  }

  return card;
}

function statusLabel(status, comp) {
  if (status === 'owned') return '已拥有';
  if (status === 'researchable') return '可购买';
  return `需要名气 ${comp.unlockFame}`;
}
