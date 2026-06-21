import { displayLabel } from './systems.js';
import { RANKS } from './config.js';

export function formatMoney(n) {
  return `¥${n}`;
}

export function renderGlobalStatus(container, state) {
  if (!container) return;
  const rankInfo = RANKS[state.rank];
  const nextText = rankInfo.nextThreshold ? `${state.fame} / ${rankInfo.nextThreshold}` : '已最高';

  let brand = container.querySelector('.global-brand');
  let pills = container.querySelector('.global-pills');
  if (!brand) {
    brand = document.createElement('span');
    brand.className = 'global-brand';
    container.appendChild(brand);
  }
  if (!pills) {
    pills = document.createElement('span');
    pills.className = 'global-pills';
    container.appendChild(pills);
  }
  brand.textContent = '🎆 烟花大师';

  const pillData = [
    { key: 'rank', text: `等级：${rankInfo.name}` },
    { key: 'funds', value: state.funds, text: v => `资金：${formatMoney(v)}` },
    { key: 'fame', value: state.fame, text: v => `名气：${v}` },
    { key: 'next', text: `下级所需：${nextText}` },
  ];

  for (const item of pillData) {
    let pill = pills.querySelector(`[data-pill="${item.key}"]`);
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'pill';
      pill.dataset.pill = item.key;
      pills.appendChild(pill);
    }
    if ('value' in item) {
      animateNumber(pill, item.value, { formatter: item.text });
    } else {
      pill.textContent = item.text;
    }
  }
}

export function refreshGlobalBars(state) {
  for (const el of document.querySelectorAll('.global-bar')) {
    renderGlobalStatus(el, state);
  }
}

export function getQty(map, id) {
  return (map && map[id]) || 0;
}

export function setQty(map, id, qty) {
  qty = Math.max(0, Math.round(Number(qty) || 0));
  if (qty <= 0) delete map[id];
  else map[id] = qty;
}

export function sumQty(map) {
  if (!map) return 0;
  return Object.values(map).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export const COLOR_HEX = {
  red: '#ff5555',
  gold: '#ffcc33',
  blue: '#66ccff',
  green: '#55cc88',
  white: '#f0f0f5',
  purple: '#cc77ff',
  pink: '#ff88bb',
  silver: '#c0c8d8',
  multi: 'conic-gradient(from 0deg, #ff5555, #ffcc33, #55cc88, #66ccff, #cc77ff, #ff5555)',
};

export function colorHex(colorKey) {
  return COLOR_HEX[colorKey] || COLOR_HEX.multi;
}

export function dominantColorHex(colorVector) {
  const entries = Object.entries(colorVector || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return COLOR_HEX.multi;
  if (entries.length === 1) return COLOR_HEX[entries[0][0]] || COLOR_HEX.multi;
  return COLOR_HEX.multi;
}

export function dominantColor(colorVector) {
  const entries = Object.entries(colorVector || {});
  if (entries.length === 0) return 'multi';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function formatColorVector(colorVector) {
  const entries = Object.entries(colorVector || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '无';
  if (entries.length === 1) return displayLabel('color', entries[0][0]);
  return entries.map(([k]) => displayLabel('color', k)).join('+');
}

export function formatEffects(effectsVector) {
  const names = Object.entries(effectsVector || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => displayLabel('effect', k));
  return names.length ? names.join('、') : '无';
}

export function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

export function componentStatLine(category, comp) {
  if (category === 'gunpowder') return `推力 ${comp.thrust}`;
  if (category === 'casing') return `${comp.shape} · 容量 ${comp.capacity}${comp.layers > 1 ? '+' + comp.secondaryCapacity : ''}`;
  if (category === 'colorant') return `${displayLabel('color', comp.color)} · 密度 ${comp.density}`;
  if (category === 'fuse') return `${comp.length} · 高度系数 ${comp.heightFactor}`;
  if (category === 'effect') return `${displayLabel('effect', comp.effect)} · 强度 ${comp.intensity}`;
  return '';
}

const TOAST_ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const TOAST_LIMIT = 3;

export function showToast(message, { type = 'info', duration = 2000 } = {}) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  while (container.children.length >= TOAST_LIMIT) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = `${TOAST_ICONS[type] || ''} ${message}`;
  container.appendChild(toast);

  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  } else {
    toast.classList.add('show');
  }

  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, { once: true });
    if (reducedMotion && toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, duration);
}

export function animateNumber(el, target, { duration = 600, formatter = v => String(v) } = {}) {
  if (!el) return;
  const startValue = Number(el.dataset.lastValue) || 0;
  const targetValue = Number(target) || 0;
  if (startValue === targetValue) {
    el.textContent = formatter(targetValue);
    return;
  }

  el.dataset.lastValue = String(targetValue);
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    el.textContent = formatter(targetValue);
    return;
  }

  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startValue + (targetValue - startValue) * eased;
    el.textContent = formatter(Math.round(current));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function flashNumber(el, color = 'var(--accent)') {
  if (!el) return;
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;
  el.style.transition = 'color 0.15s ease';
  const original = getComputedStyle(el).color;
  el.style.color = color;
  setTimeout(() => {
    el.style.color = original;
    setTimeout(() => { el.style.transition = ''; }, 150);
  }, 250);
}
