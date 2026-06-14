import { displayLabel } from './systems.js';

export function formatMoney(n) {
  return `¥${n}`;
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
