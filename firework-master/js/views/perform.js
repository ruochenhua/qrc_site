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
import { validateShow, settleEvent, getEventById, getScoreGrade, getCompetitionRoundNames, settleCompetitionRound, finishCompetition } from '../systems.js';
import { formatMoney, renderGlobalStatus, showToast, animateNumber } from '../ui-utils.js';

export function startPerformance() {
  const validation = validateShow(state, state.selectedEventId, state.currentShow);
  if (!validation.valid) return;

  const event = getEventById(state.selectedEventId);

  if (previewRenderer) previewRenderer.stop();
  switchView('perform');
  const canvas = document.getElementById('perform-canvas');

  const statusEl = document.getElementById('perform-status');
  let roundTimers = [];

  if (event && event.type === 'competition') {
    const roundNames = getCompetitionRoundNames(event);
    const duration = Math.max(2500, (state.currentShow.length - 1) * 1200 + 2500);
    const interval = duration / roundNames.length;
    statusEl.textContent = `${roundNames[0]} 进行中…`;
    for (let i = 1; i < roundNames.length; i++) {
      roundTimers.push(setTimeout(() => {
        statusEl.textContent = `${roundNames[i]} 进行中…`;
      }, i * interval));
    }
  } else {
    statusEl.textContent = '表演中…';
  }

  requestAnimationFrame(() => {
    if (!renderer) {
      setRenderer(new FireworkRenderer(canvas));
    }
    renderer.init(canvas);
    renderer.setBackdrop(event && event.backdrop ? event.backdrop : null);
    renderer.playShow(state.currentShow, () => {
      roundTimers.forEach(id => clearTimeout(id));
      roundTimers = [];
      statusEl.textContent = '表演结束';
      setTimeout(showResult, 500);
    });
  });
}

function renderScoreBreakdown(scoreResult) {
  const breakdown = document.getElementById('result-breakdown');
  const comboNames = scoreResult.combos.map(id => COMBO_RULES.find(r => r.id === id)?.name || id);
  const prefHits = scoreResult.preferenceHits || { hits: 0, total: 0 };
  breakdown.innerHTML = `
    <div class="breakdown-row"><span>基础分</span><span>${scoreResult.baseScore}</span></div>
    ${scoreResult.complexityBonus > 0 ? `<div class="breakdown-row bonus"><span>复杂度加成</span><span>+${Math.round(scoreResult.complexityBonus * 100)}%</span></div>` : ''}
    ${scoreResult.comboBonus > 0 ? `<div class="breakdown-row bonus"><span>组合加成${comboNames.length ? `（${comboNames.join('、')}）` : ''}</span><span>+${Math.round(scoreResult.comboBonus * 100)}%</span></div>` : ''}
    ${scoreResult.repeatPenalty > 0 ? `<div class="breakdown-row penalty"><span>重复惩罚</span><span>-${Math.round(scoreResult.repeatPenalty * 100)}%</span></div>` : ''}
    ${prefHits.total > 0 ? `<div class="breakdown-row"><span>偏好命中</span><span>${prefHits.hits} / ${prefHits.total}</span></div>` : ''}
    <div class="breakdown-row total"><span>最终得分</span><span>${scoreResult.score}</span></div>
  `;
}

function renderCompetitionBracket(competitionData) {
  const competitionEl = document.getElementById('result-competition');
  competitionEl.innerHTML = '';
  if (!competitionData) return;
  const { finalRank, roundResults } = competitionData;
  const bracketHtml = roundResults.map(r => {
    if (r.played === false) {
      return `
        <div class="bracket-round eliminated">
          <div class="bracket-name">${r.name}</div>
          <div class="bracket-score">未晋级</div>
        </div>
      `;
    }
    return `
      <div class="bracket-round ${r.won ? 'won' : 'lost'}">
        <div class="bracket-name">${r.name}</div>
        <div class="bracket-score">${r.playerScore} : ${r.opponentScore}</div>
        <div class="bracket-result">${r.won ? '胜' : '负'}</div>
      </div>
    `;
  }).join('<div class="bracket-connector"></div>');
  competitionEl.innerHTML = `
    <div class="competition-summary">
      <strong>🏆 锦标赛名次：第 ${finalRank} 名</strong>
      <div class="tournament-bracket">${bracketHtml}</div>
    </div>
  `;
}

function renderExtra(result) {
  const extra = document.getElementById('result-extra');
  extra.innerHTML = '';
  if (result.isFirstClear) extra.innerHTML += '<p>🎉 首次通关奖励已发放</p>';
  if (result.rankedUp) extra.innerHTML += `<p>🆙 晋升至「${RANKS[state.rank].name}」</p>`;
}

function setContinueButton(label) {
  document.getElementById('result-continue').textContent = label;
}

export function showResult() {
  const event = getEventById(state.selectedEventId);

  if (state.competition && event && event.type === 'competition') {
    const roundResult = settleCompetitionRound(state, state.currentShow);
    if (!roundResult.success) {
      showToast('结算失败：' + roundResult.reason, { type: 'error' });
      switchView('build');
      return;
    }
    saveGame();

    if (roundResult.advanced) {
      switchView('result');
      renderGlobalStatus(document.getElementById('result-global-bar'), state);
      document.getElementById('result-score').textContent = roundResult.roundResult.playerScore;
      document.getElementById('result-grade').textContent = getScoreGrade(roundResult.roundResult.playerScore);
      renderScoreBreakdown(roundResult.roundResult.score);
      document.getElementById('result-funds').textContent = '-' + formatMoney(roundResult.roundResult.cost);
      document.getElementById('result-fame').textContent = '本轮暂不计奖励';
      const competitionEl = document.getElementById('result-competition');
      competitionEl.innerHTML = `
        <div class="competition-summary round-advance">
          <strong>✅ ${roundResult.roundResult.name} 晋级！</strong>
          <div class="round-score">${roundResult.roundResult.playerScore} : ${roundResult.roundResult.opponentScore}</div>
          <div class="remaining-track">剩余 ${state.competition.remaining} 人 → 下轮剩 ${Math.floor(state.competition.remaining / 2)} 人</div>
        </div>
      `;
      document.getElementById('result-extra').innerHTML = '';
      setContinueButton('调整节目单（下轮）');
      document.getElementById('result-continue').dataset.next = 'build';
      return;
    }

    const finalResult = finishCompetition(state);
    if (!finalResult.success) {
      showToast('结算失败：' + finalResult.reason, { type: 'error' });
      switchView('build');
      return;
    }
    saveGame();

    switchView('result');
    renderGlobalStatus(document.getElementById('result-global-bar'), state);
    const lastRound = finalResult.competition.roundResults[finalResult.competition.roundResults.length - 1];
    const displayScore = lastRound ? lastRound.playerScore : 0;
    document.getElementById('result-score').textContent = displayScore;
    document.getElementById('result-grade').textContent = getScoreGrade(displayScore);
    renderScoreBreakdown(lastRound ? lastRound.score : { score: 0, baseScore: 0, complexityBonus: 0, comboBonus: 0, repeatPenalty: 0, combos: [], preferenceHits: { hits: 0, total: 0 } });
    animateNumber(document.getElementById('result-funds'), finalResult.rewards.funds, { duration: 700, formatter: v => (v >= 0 ? '+' : '') + formatMoney(v) });
    animateNumber(document.getElementById('result-fame'), finalResult.rewards.fame, { duration: 700, formatter: v => (v >= 0 ? '+' : '') + v });
    renderCompetitionBracket(finalResult.competition);
    renderExtra(finalResult);
    setContinueButton(state.won ? '查看结局' : '返回 Hub');
    document.getElementById('result-continue').dataset.next = '';
    return;
  }

  const result = settleEvent(state, state.selectedEventId, state.currentShow);
  if (!result.success) {
    showToast('结算失败：' + result.reason, { type: 'error' });
    switchView('build');
    return;
  }

  saveGame();
  switchView('result');
  renderGlobalStatus(document.getElementById('result-global-bar'), state);
  const scoreEl = document.getElementById('result-score');
  const gradeEl = document.getElementById('result-grade');
  const fundsEl = document.getElementById('result-funds');
  const fameEl = document.getElementById('result-fame');
  animateNumber(scoreEl, result.score.score, { duration: 900, formatter: v => String(v) });
  gradeEl.textContent = getScoreGrade(result.score.score);
  gradeEl.classList.remove('grade-pop');
  void gradeEl.offsetWidth;
  gradeEl.classList.add('grade-pop');
  animateNumber(fundsEl, result.rewards.funds, { duration: 700, formatter: v => (v >= 0 ? '+' : '') + formatMoney(v) });
  animateNumber(fameEl, result.rewards.fame, { duration: 700, formatter: v => (v >= 0 ? '+' : '') + v });

  renderScoreBreakdown(result.score);
  renderCompetitionBracket(null);
  renderExtra(result);
  setContinueButton(state.won ? '查看结局' : '返回 Hub');
  document.getElementById('result-continue').dataset.next = '';
}
