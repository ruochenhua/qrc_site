import { state, saveGame, switchView } from '../app-state.js';
import { EVENT_TYPES } from '../config.js';
import { getAvailableEvents } from '../systems.js';
import { formatMoney } from '../ui-utils.js';
import { renderBuild, resetAssemblyToDefault } from './build.js';

export function renderEvents() {
  const list = document.getElementById('event-list');
  list.innerHTML = '';
  const events = getAvailableEvents(state);
  if (events.length === 0) {
    list.innerHTML = '<p class="empty">当前没有可参加的事件。</p>';
    return;
  }
  for (const event of events) {
    const typeInfo = EVENT_TYPES[event.type];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <span class="name">${event.name}</span>
        <span class="tag ${typeInfo.labelClass}">${typeInfo.name}</span>
      </div>
      <div class="card-body">
        <p>${event.desc}</p>
        <p>预算：${event.budget !== null ? formatMoney(event.budget) : '无限制'} | 最大弹数：${event.maxShells}</p>
        <p>奖励：资金 ${event.rewards.funds} / 名气 ${event.rewards.fame}</p>
      </div>
      <button class="btn primary">选择</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      state.selectEvent(event.id);
      resetAssemblyToDefault();
      saveGame();
      switchView('build');
      renderBuild();
    });
    list.appendChild(card);
  }
}
