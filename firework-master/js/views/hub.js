import { state } from '../app-state.js';
import { RANKS } from '../config.js';
import { canRankUp } from '../systems.js';
import { formatMoney } from '../ui-utils.js';

export function updateHub() {
  document.getElementById('hub-rank').textContent = RANKS[state.rank].name;
  document.getElementById('hub-funds').textContent = formatMoney(state.funds);
  document.getElementById('hub-fame').textContent = state.fame;
  const rankInfo = RANKS[state.rank];
  document.getElementById('hub-next').textContent = rankInfo.nextThreshold ? `${state.fame} / ${rankInfo.nextThreshold}` : '已最高';
  document.getElementById('hub-rankup').style.display = canRankUp(state) ? 'inline-block' : 'none';
}

export function renderEnding() {
  document.getElementById('ending-funds').textContent = formatMoney(state.funds);
  document.getElementById('ending-fame').textContent = state.fame;
}
