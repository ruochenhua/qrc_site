import { ROUTE, formatDistance } from './config.js';

export class Renderer {
  constructor({ onToggleMap }) {
    this.els = {
      day: document.getElementById('day-num'),
      time: document.getElementById('time-num'),
      km: document.getElementById('km-num'),
      phase: document.getElementById('phase-indicator'),
      stats: document.getElementById('stats'),
      log: document.getElementById('log'),
      actions: document.getElementById('actions'),
      conVal: document.getElementById('con-val'),
      energyVal: document.getElementById('energy-val'),
      cnyVal: document.getElementById('cny-val'),
      sanVal: document.getElementById('san-val'),
      sinVal: document.getElementById('sin-val'),
      fansVal: document.getElementById('fans-val'),
      conBar: document.getElementById('con-bar'),
      energyBar: document.getElementById('energy-bar'),
      cnyBar: document.getElementById('cny-bar'),
      sanBar: document.getElementById('san-bar'),
      sinBar: document.getElementById('sin-bar'),
      fansBar: document.getElementById('fans-bar'),
      poiBar: document.getElementById('poi-bar'),
      currentPoi: document.getElementById('current-poi'),
      nextPoiDist: document.getElementById('next-poi-dist'),
      mapModal: document.getElementById('map-modal'),
      mapBody: document.getElementById('map-body'),
      mapBtn: document.getElementById('map-btn'),
      mapOverlay: document.querySelector('#map-modal .modal-overlay'),
      mapClose: document.querySelector('#map-modal .modal-close'),
      weatherBar: document.getElementById('weather-bar'),
      weatherIcon: document.getElementById('weather-icon'),
      weatherName: document.getElementById('weather-name'),
      weatherStamina: document.getElementById('weather-stamina'),
      weatherMaterial: document.getElementById('weather-material'),
    };

    this.els.mapBtn.addEventListener('click', onToggleMap);
    this.els.mapOverlay.addEventListener('click', onToggleMap);
    this.els.mapClose.addEventListener('click', onToggleMap);
  }

  showStats() {
    this.els.stats.style.display = 'grid';
    this.els.poiBar.style.display = 'block';
    this.els.weatherBar.style.display = 'block';
  }

  updateWeatherBar(weather, season) {
    if (!this.els.weatherBar) return;
    this.els.weatherBar.style.display = 'block';
    const icons = {
      mild: '☀️', light_rain: '🌧️', fog: '🌫️', tailwind: '💨',
      heavy_rain: '⛈️', landslide_warning: '⚠️', heatwave: '🌡️',
      thunderstorm: '⚡', rainbow: '🌈', golden: '🍂', crisp: '🍁',
      golden_week_crowd: '👥', early_snow: '❄️', blizzard: '🌨️',
      black_ice: '🧊', extreme_cold: '🥶', avalanche_risk: '🏔️',
    };
    const totalStamina = (weather.staminaMult * season.staminaMult).toFixed(1);
    const totalMaterial = (weather.materialMult * season.materialMult).toFixed(1);
    this.els.weatherIcon.textContent = icons[weather.name] || '🌤️';
    this.els.weatherName.textContent = weather.name;
    this.els.weatherStamina.textContent = `体力×${totalStamina}`;
    this.els.weatherMaterial.textContent = `素材×${totalMaterial}`;

    const staminaMult = weather.staminaMult * season.staminaMult;
    this.els.weatherStamina.style.color = staminaMult >= 1.5 ? 'var(--danger)' : staminaMult >= 1.3 ? 'var(--warn)' : 'var(--muted)';
    this.els.weatherMaterial.style.color = 'var(--success)';
  }

  updatePoiBar(state) {
    const node = state.currentNode;
    const typeIcon = node ? (node.type === 'city' ? '🏙️' : node.type === 'wild_poi' ? '🏔️' : '🛣️') : '🛣️';
    this.els.currentPoi.textContent = `${typeIcon} ${node ? node.name : '路段中'}`;

    const dist = this._distanceToNextPoi(state);
    if (dist > 0) {
      this.els.nextPoiDist.textContent = `📍 距离下一个兴趣点：${formatDistance(dist)}`;
      this.els.nextPoiDist.style.display = 'inline';
    } else {
      this.els.nextPoiDist.style.display = 'none';
    }
  }

  _distanceToNextPoi(state) {
    for (let i = state.nodeIndex + 1; i < ROUTE.length; i++) {
      if (ROUTE[i].type !== 'road') {
        return ROUTE[i].km - state.km;
      }
    }
    return 0;
  }

  toggleMap() {
    this.els.mapModal.classList.toggle('modal-hidden');
    return !this.els.mapModal.classList.contains('modal-hidden');
  }

  renderMap(state) {
    const container = this.els.mapBody;
    container.innerHTML = '';

    for (let i = 0; i < ROUTE.length; i++) {
      const node = ROUTE[i];
      if (node.type === 'road') continue;

      const isCurrent = i === state.nodeIndex;
      const isVisited = state.visitedPois.has(node.id);
      const isPast = i < state.nodeIndex;
      const typeIcon = node.type === 'city' ? '🏙️' : '🏔️';
      const statusIcon = isCurrent ? '📍' : (isVisited || isPast) ? '✅' : '⬜';

      const div = document.createElement('div');
      div.className = `map-node ${isCurrent ? 'current' : ''} ${isVisited || isPast ? 'visited' : ''}`;
      div.innerHTML = `
        <span>${statusIcon}</span>
        <span class="map-node-name">${typeIcon} ${node.name}</span>
        <span class="map-node-km">${node.km}km</span>
      `;
      div.onclick = () => this.showMapNodeDetail(node);
      container.appendChild(div);

      if (i < ROUTE.length - 1) {
        const nextNode = ROUTE.slice(i + 1).find(n => n.type !== 'road');
        if (nextNode) {
          const gap = nextNode.km - node.km;
          const gapDiv = document.createElement('div');
          gapDiv.className = 'map-connector';
          gapDiv.textContent = `↓ ${formatDistance(gap)}`;
          container.appendChild(gapDiv);
        }
      }
    }
  }

  showMapNodeDetail(node) {
    let detailHtml = '';
    if (node.shop && node.shop.items) {
      detailHtml += '<div class="map-detail"><div class="map-detail-title">🛒 商店</div>';
      node.shop.items.forEach(item => {
        detailHtml += `<div>${item.name} ¥${item.price} (${item.desc})</div>`;
      });
      detailHtml += '</div>';
    }
    if (node.attractions) {
      detailHtml += '<div class="map-detail"><div class="map-detail-title">📷 景点</div>';
      node.attractions.forEach(a => {
        detailHtml += `<div>${a.name} (${a.time}h)</div>`;
      });
      detailHtml += '</div>';
    }

    const existing = this.els.mapBody.querySelector('.map-detail-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.className = 'map-detail-panel';
    panel.style.cssText = 'margin-top:10px;padding:10px;background:#0d0d14;border-radius:8px;border:1px solid var(--border);';
    panel.innerHTML = `<div style="color:var(--accent);font-weight:bold;margin-bottom:6px;">${node.name} 详情</div>${detailHtml || '<div style="color:var(--muted);font-size:12px;">此节点无特殊设施</div>'}`;
    this.els.mapBody.appendChild(panel);
  }

  renderCityMenu(node, state, tab, callbacks) {
    this.clearLog();
    this.setPhase(`🏙️ ${node.name} · 城市菜单`);

    const tabs = ['商店', '住宿', '景点', '离开'];
    const { onBuyItem, onSelectAccommodation, onVisitAttraction, onSwitchTab, onLeave, onBack } = callbacks;

    const tabContainer = document.createElement('div');
    tabContainer.className = 'city-menu-tabs';
    for (const t of tabs) {
      const tabDiv = document.createElement('div');
      tabDiv.className = 'city-menu-tab ' + (t === tab ? 'active' : '');
      tabDiv.textContent = t;
      tabDiv.onclick = () => onSwitchTab(t);
      tabContainer.appendChild(tabDiv);
    }

    const contentContainer = document.createElement('div');

    if (tab === '商店' && node.shop) {
      for (const item of node.shop.items) {
        const canAfford = state.cny >= item.price;
        const wouldOverload = state.weight + item.weight > state.maxWeight * 1.5;
        const disabled = !canAfford || wouldOverload;
        const row = document.createElement('div');
        row.className = 'shop-item';
        row.innerHTML = `
          <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${item.desc} | 重量 ${item.weight}kg</div>
          </div>
          <div class="shop-item-price">¥${item.price}</div>
        `;
        const btn = document.createElement('button');
        btn.textContent = '购买';
        if (disabled) btn.disabled = true;
        btn.onclick = () => onBuyItem(item.id);
        row.appendChild(btn);
        contentContainer.appendChild(row);
      }
    } else if (tab === '住宿' && node.accommodations) {
      for (const acc of node.accommodations) {
        const canAfford = state.cny >= acc.price;
        const row = document.createElement('div');
        row.className = 'hotel-item';
        row.innerHTML = `
          <div class="hotel-info">
            <div class="hotel-name">${acc.name}</div>
            <div class="hotel-desc">精力恢复 ×${acc.energyMult} | 体力恢复 ×${acc.conMult} | 精神 +${acc.sanBonus}</div>
          </div>
          <div class="hotel-price">¥${acc.price}</div>
        `;
        const btn = document.createElement('button');
        btn.textContent = '入住';
        if (!canAfford) btn.disabled = true;
        btn.onclick = () => onSelectAccommodation(acc.id);
        row.appendChild(btn);
        contentContainer.appendChild(row);
      }
    } else if (tab === '景点' && node.attractions) {
      for (const attr of node.attractions) {
        const hasTime = 24 - state.time >= attr.time;
        const row = document.createElement('div');
        row.className = 'attraction-item';
        row.innerHTML = `
          <div style="flex:1;">
            <div class="attraction-name">${attr.name}</div>
            <div class="attraction-desc">${attr.desc}</div>
          </div>
          <div class="attraction-time">${attr.time}h</div>
        `;
        const btn = document.createElement('button');
        btn.textContent = '参观';
        if (!hasTime) btn.disabled = true;
        btn.onclick = () => onVisitAttraction(attr.name);
        row.appendChild(btn);
        contentContainer.appendChild(row);
      }
    } else if (tab === '离开') {
      contentContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">准备继续上路？</div>';
    }

    this.els.log.innerHTML = '';
    this.els.log.appendChild(tabContainer);
    this.els.log.appendChild(contentContainer);

    if (tab === '离开') {
      this.showChoices([
        { text: '🚴 离开城市，继续前进', className: 'primary', onClick: () => onLeave() },
      ]);
    } else {
      this.showChoices([
        { text: '⬅️ 返回', onClick: () => onBack() },
      ]);
    }
  }

  renderWildPoi(node, callbacks) {
    const { onShoot, onPass } = callbacks;
    this.clearLog();
    this.setPhase(`🏔️ ${node.name}`);
    this.log(node.desc, 'info');

    const attr = node.attractions && node.attractions[0];
    if (attr) {
      this.log(`你可以在这里停留拍摄：${attr.name}`, 'info');
      this.showChoices([
        { text: `📷 ${attr.name}（${attr.time}h | 素材+${attr.effects.find(e=>e.key==='materials')?.delta || '?'} 精神+${attr.effects.find(e=>e.key==='san')?.delta || '?'})`, className: 'primary', onClick: () => onShoot() },
        { text: '🚴 路过，不停留', onClick: () => onPass() },
      ]);
    } else {
      this.log('这里风景不错，但没有什么特别的拍摄点。', 'muted');
      this.showChoices([
        { text: '🚴 继续前进', className: 'primary', onClick: () => onPass() },
      ]);
    }
  }

  updateStats(state) {
    this.els.day.textContent = state.day;
    this.els.time.textContent = this._formatTime(state.time);
    this.els.km.textContent = Math.floor(state.km);

    this.els.conVal.textContent = Math.round(state.stats.con);
    this.els.energyVal.textContent = Math.round(state.energy);
    this.els.cnyVal.textContent = '¥' + Math.round(state.cny);
    this.els.sanVal.textContent = Math.round(state.san);
    this.els.sinVal.textContent = Math.round(state.sin);
    this.els.fansVal.textContent = state.totalFans > 10000 ? (state.totalFans / 10000).toFixed(1) + 'w' : state.totalFans;

    this.els.conBar.style.width = clampBar(state.stats.con, 0, 100) + '%';
    this.els.energyBar.style.width = clampBar((state.energy / state.maxEnergy) * 100, 0, 100) + '%';
    const maxMoney = Math.max(state.cny, 25000);
    this.els.cnyBar.style.width = clampBar((state.cny / maxMoney) * 100, 0, 100) + '%';
    this.els.sanBar.style.width = clampBar(state.san, 0, 100) + '%';
    this.els.sinBar.style.width = clampBar(state.sin, 0, 100) + '%';
    const maxFans = Math.max(state.totalFans, 100000);
    this.els.fansBar.style.width = clampBar((state.totalFans / maxFans) * 100, 0, 100) + '%';

    this.updatePoiBar(state);
  }

  _formatTime(time) {
    const h = Math.floor(time);
    const m = Math.floor((time - h) * 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  setPhase(label) {
    this.els.phase.textContent = label;
  }

  log(text, type = 'info') {
    const div = document.createElement('div');
    div.className = 'log-item ' + type;
    div.textContent = text;
    this.els.log.appendChild(div);
    this.els.log.parentElement.scrollTop = this.els.log.parentElement.scrollHeight;
  }

  clearLog() {
    this.els.log.innerHTML = '';
  }

  showChoices(choices) {
    this.els.actions.innerHTML = '';
    for (const c of choices) {
      const btn = document.createElement('button');
      btn.textContent = c.text;
      if (c.className) btn.className = c.className;
      if (c.disabled) btn.disabled = true;
      btn.onclick = c.onClick;
      this.els.actions.appendChild(btn);
    }
  }

  showEnding(ending, state, onRestart) {
    this.clearLog();
    const div = document.createElement('div');
    div.className = 'ending-screen ' + ending.type;

    const typeEmoji = ending.type === 'good' ? '🏆' : ending.type === 'bad' ? '💀' : '⚖️';
    const typeColor = ending.type === 'good' ? 'var(--success)' : ending.type === 'bad' ? 'var(--danger)' : 'var(--warn)';

    div.innerHTML = `
      <div style="font-size:48px;margin-bottom:16px">${typeEmoji}</div>
      <h2 style="color:${typeColor}">${ending.title}</h2>
      <p>${ending.desc}</p>
      <div style="background:#0d0d14;border:1px solid var(--border);border-radius:8px;padding:12px;margin:16px 0;text-align:left">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">旅程统计</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
          <div>📅 天数：<span style="color:var(--text)">${state.day}</span></div>
          <div>🚴 里程：<span style="color:var(--text)">${Math.floor(state.km)}km</span></div>
          <div>👥 粉丝：<span style="color:var(--text)">${state.totalFans}</span></div>
          <div>💰 资金：<span style="color:var(--text)">¥${Math.round(state.cny)}</span></div>
          <div>😈 黑红值：<span style="color:${state.sin > 50 ? 'var(--danger)' : 'var(--muted)'}">${state.sin}</span></div>
          <div>📍 终点：<span style="color:var(--text)">${state.currentNode ? state.currentNode.name : '未知'}</span></div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted)">${ending.type === 'good' ? '你找到了属于自己的路。' : ending.type === 'bad' ? '也许下一次，会有不同的选择。' : '这就是旅程的意义。'}</p>
    `;
    this.els.log.appendChild(div);

    this.els.actions.innerHTML = '';
    const btn = document.createElement('button');
    btn.textContent = '🔄 重新开始';
    btn.className = 'primary';
    btn.onclick = onRestart;
    this.els.actions.appendChild(btn);
  }
}

function clampBar(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
