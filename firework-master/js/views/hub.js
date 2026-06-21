import { state, saveGame } from '../app-state.js';
import { RANKS } from '../config.js';
import { canRankUp, rankUp, getCurrentRankMainEvents } from '../systems.js';
import { formatMoney, animateNumber, flashNumber, showToast } from '../ui-utils.js';

export function updateHub() {
  if (canRankUp(state)) {
    rankUp(state);
    saveGame();
    showToast(`🆙 自动晋升至「${RANKS[state.rank].name}」`, { type: 'success', duration: 3000 });
    flashNumber(document.getElementById('hub-rank'), 'var(--success)');
  }

  const rankInfo = RANKS[state.rank];
  document.getElementById('hub-rank').textContent = rankInfo.name;
  animateNumber(document.getElementById('hub-funds'), state.funds, { formatter: v => formatMoney(v) });
  animateNumber(document.getElementById('hub-fame'), state.fame, { formatter: v => String(v) });
  document.getElementById('hub-next').textContent = rankInfo.nextThreshold ? `${state.fame} / ${rankInfo.nextThreshold}` : '已最高';

  const rankUpBtn = document.getElementById('hub-rankup');
  if (rankUpBtn) rankUpBtn.style.display = 'none';

  const mainEvents = getCurrentRankMainEvents(state);
  const completed = mainEvents.filter(e => state.isMainEventCompleted(e.id)).length;
  document.getElementById('hub-progress').textContent = `主线进度：${completed} / ${mainEvents.length}`;
}

export function renderEnding() {
  animateNumber(document.getElementById('ending-funds'), state.funds, { formatter: v => formatMoney(v) });
  animateNumber(document.getElementById('ending-fame'), state.fame, { formatter: v => String(v) });
}
