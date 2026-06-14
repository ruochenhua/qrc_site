import {
  state,
  renderer,
  previewRenderer,
  setRenderer,
  switchView,
  saveGame,
} from '../app-state.js';
import { RANKS, COMBO_RULES } from '../config.js';
import { FireworkRenderer } from '../renderer.js';
import { validateShow, settleEvent, getEventById, getScoreGrade } from '../systems.js';
import { formatMoney } from '../ui-utils.js';

export function startPerformance() {
  const validation = validateShow(state, state.selectedEventId, state.currentShow);
  if (!validation.valid) return;

  const event = getEventById(state.selectedEventId);

  if (previewRenderer) previewRenderer.stop();
  switchView('perform');
  const canvas = document.getElementById('perform-canvas');

  document.getElementById('perform-status').textContent = '表演中...';

  requestAnimationFrame(() => {
    if (!renderer) {
      setRenderer(new FireworkRenderer(canvas));
    }
    renderer.init(canvas);
    renderer.setBackdrop(event && event.backdrop ? event.backdrop : null);
    renderer.playShow(state.currentShow, () => {
      document.getElementById('perform-status').textContent = '表演结束';
      setTimeout(showResult, 500);
    });
  });
}

export function showResult() {
  const result = settleEvent(state, state.selectedEventId, state.currentShow);
  if (!result.success) {
    alert('结算失败：' + result.reason);
    switchView('build');
    return;
  }

  saveGame();
  switchView('result');
  document.getElementById('result-score').textContent = result.score.score;
  document.getElementById('result-grade').textContent = getScoreGrade(result.score.score);
  document.getElementById('result-funds').textContent = (result.rewards.funds >= 0 ? '+' : '') + formatMoney(result.rewards.funds);
  document.getElementById('result-fame').textContent = (result.rewards.fame >= 0 ? '+' : '') + result.rewards.fame;

  const breakdown = document.getElementById('result-breakdown');
  const comboNames = result.score.combos.map(id => COMBO_RULES.find(r => r.id === id)?.name || id);
  breakdown.innerHTML = `
    <div class="breakdown-row"><span>基础分</span><span>${result.score.baseScore}</span></div>
    ${result.score.complexityBonus > 0 ? `<div class="breakdown-row bonus"><span>复杂度加成</span><span>+${Math.round(result.score.complexityBonus * 100)}%</span></div>` : ''}
    ${result.score.comboBonus > 0 ? `<div class="breakdown-row bonus"><span>组合加成${comboNames.length ? `（${comboNames.join('、')}）` : ''}</span><span>+${Math.round(result.score.comboBonus * 100)}%</span></div>` : ''}
    ${result.score.repeatPenalty > 0 ? `<div class="breakdown-row penalty"><span>重复惩罚</span><span>-${Math.round(result.score.repeatPenalty * 100)}%</span></div>` : ''}
    <div class="breakdown-row total"><span>最终得分</span><span>${result.score.score}</span></div>
  `;

  const extra = document.getElementById('result-extra');
  extra.innerHTML = '';
  if (result.isFirstClear) extra.innerHTML += '<p>🎉 首次通关奖励已发放</p>';
  if (result.rankedUp) extra.innerHTML += `<p>🆙 晋升至「${RANKS[state.rank].name}」</p>`;

  if (state.won) {
    document.getElementById('result-continue').textContent = '查看结局';
  } else {
    document.getElementById('result-continue').textContent = '返回 Hub';
  }
}
