import { state, saveGame, switchView } from '../app-state.js';
import { EVENTS, EVENT_TYPES, RANKS } from '../config.js';
import { getEventStatus, getEventLockReason, startCompetition } from '../systems.js';
import { formatMoney, renderGlobalStatus } from '../ui-utils.js';
import { createButton, createBadge, createCard } from '../ui/components/index.js';
import { renderBuild, resetAssemblyToDefault } from './build.js';

const STATUS_BADGES = {
  completed: { text: '已完成', class: 'status-completed' },
  locked: { text: '锁定', class: 'status-locked' },
  repeatable: { text: '可重复', class: 'status-repeatable' },
};

export function renderEvents() {
  renderGlobalStatus(document.getElementById('events-global-bar'), state);
  const list = document.getElementById('event-list');
  list.innerHTML = '';
  const events = Object.values(EVENTS).sort((a, b) => {
    const rankDiff = RANKS[a.rank].threshold - RANKS[b.rank].threshold;
    if (rankDiff !== 0) return rankDiff;
    return a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1;
  });

  if (events.length === 0) {
    list.innerHTML = '<p class="empty">当前没有可参加的事件。</p>';
    return;
  }

  for (const event of events) {
    const status = getEventStatus(state, event.id);
    const typeInfo = EVENT_TYPES[event.type];
    const statusBadge = status === 'available' && event.type === 'repeatable'
      ? STATUS_BADGES.repeatable
      : STATUS_BADGES[status];

    const isLocked = status === 'locked';
    const isCompleted = status === 'completed';
    const isSelectable = status === 'available';

    const card = createCard({
      className: `event-card type-${event.type} status-${status}${event.type === 'repeatable' ? ' is-repeatable' : ''}`,
      children: [],
    });
    card.innerHTML = `
      <div class="event-stripe"></div>
      <div class="event-badge" aria-hidden="true"></div>
      <div class="event-main">
        <div class="event-title-row">
          <h3 class="event-name">${event.name}</h3>
          <div class="event-tags">
            <span class="event-tag">${typeInfo.name}</span>
          </div>
        </div>
        <p class="event-desc">${event.desc}</p>
        ${isLocked ? `<p class="event-lock-reason">${getEventLockReason(state, event.id)}</p>` : ''}
        <div class="event-chips">
          <span class="event-chip chip-rank">${RANKS[event.rank].name}</span>
          <span class="event-chip chip-budget">${event.budget !== null ? formatMoney(event.budget) : '无限制'}</span>
          <span class="event-chip chip-shells">最多 ${event.maxShells} 发</span>
          <span class="event-chip chip-reward">${event.rewards.funds} 资金 / ${event.rewards.fame} 名气</span>
        </div>
      </div>
      <div class="event-action"></div>
    `;

    if (statusBadge) {
      card.querySelector('.event-tags').appendChild(
        createBadge({ text: statusBadge.text, className: `event-status ${statusBadge.class}`, icon: isLocked ? '🔒' : '' }),
      );
    }

    card.querySelector('.event-action').appendChild(
      createButton({
        text: isCompleted ? '已完成' : isLocked ? '锁定' : '选择',
        variant: 'primary',
        disabled: !isSelectable,
        className: 'event-select',
        onClick: isSelectable
          ? () => {
              if (event.type === 'competition') {
                startCompetition(state, event.id);
              } else {
                state.selectEvent(event.id);
              }
              resetAssemblyToDefault();
              saveGame();
              switchView('build');
              renderBuild();
            }
          : undefined,
      }),
    );

    list.appendChild(card);
  }
}
