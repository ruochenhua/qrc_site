import {
  ROUTES, setRoute, ROUTE, SEASONS, WEATHER_TYPES,
  TRAVEL_MODES, STARTING_ITEMS, NODE_EVENTS, ENDINGS,
  CONTENT_TYPES, rollCampEvent,
  rollDailyWeather, getWeatherNarrative,
} from './config.js';
import { TimeEngine, EventEngine, ContentSystem, PlatformAlgorithm, SinSystem } from './systems.js';
import { GameState, SaveSystem } from './state.js';
import { Renderer } from './renderer.js';

class Game {
  constructor() {
    this.state = new GameState();
    this.timeEngine = new TimeEngine(this.state);
    this.eventEngine = new EventEngine();
    this.renderer = new Renderer({
      onToggleMap: () => this.toggleMap(),
    });
  }

  toggleMap() {
    const opened = this.renderer.toggleMap();
    if (opened) {
      this.renderer.renderMap(this.state);
    }
  }

  restart() {
    this.state.reset();
    SaveSystem.clear();
    this.showStartScreen();
  }

  showStartScreen() {
    this.renderer.setPhase('选择你的开局人设');
    this.renderer.clearLog();
    this.renderer.els.stats.style.display = 'none';

    this.renderer.log('欢迎来到骑行网红模拟器！', 'success');
    this.renderer.log('选择路线：', 'info');

    const routeChoices = [
      { id: 'short', name: '短线（新手模式）', desc: '成都→新都桥，8个节点，约15-20分钟', nodes: 8 },
      { id: 'long', name: '长线（标准模式）', desc: '成都→拉萨，22个节点，约60-90分钟', nodes: 22 },
    ];

    for (const rc of routeChoices) {
      const card = document.createElement('div');
      card.className = 'identity-card';
      card.innerHTML = `
        <h3>${rc.name}</h3>
        <div class="desc">${rc.desc}</div>
      `;
      card.onclick = () => {
        setRoute(rc.id);
        this.renderer.log(`选择了${rc.name}`, 'success');
        this.showIdentitySelect();
      };
      this.renderer.els.log.appendChild(card);
    }

    this.renderer.showChoices([]);
  }

  showIdentitySelect() {
    this.renderer.clearLog();
    this.renderer.log('选择角色：', 'info');

    const identities = [
      { id: 'coder', name: '前互联网大厂程序员', emoji: '💻', con: 35, int: 85, hrt: 30, art: 40, luk: 50, money: 25000, fans: { bilibili: 500, douyin: 0, xiaohongshu: 0 }, desc: '懂算法但体能堪忧，视频爆款率+30%。' },
      { id: 'tough', name: '民间狠活老铁', emoji: '🛠️', con: 90, int: 30, hrt: 80, art: 10, luk: 40, money: 500, fans: { bilibili: 0, douyin: 800, xiaohongshu: 0 }, desc: '体能爆表，黑红Sin减半，短视频流量翻倍。' },
    ];

    for (const idt of identities) {
      const card = document.createElement('div');
      card.className = 'identity-card';
      card.innerHTML = `
        <h3>${idt.emoji} ${idt.name}</h3>
        <div class="attrs">体力${idt.con} | 智力${idt.int} | 情商${idt.hrt} | 审美${idt.art} | 运气${idt.luk}</div>
        <div class="desc">${idt.desc}</div>
        <div style="margin-top:6px;font-size:12px;color:var(--muted)">资金：¥${idt.money}</div>
        <div style="margin-top:4px">
          ${Object.entries(idt.fans).filter(([_,v])=>v>0).map(([k,v])=>`<span class="platform-tag">${k === 'bilibili' ? 'B站' : k === 'douyin' ? '抖音' : '小红书'} ${v}</span>`).join('')}
        </div>
      `;
      card.onclick = () => this.selectIdentity(idt);
      this.renderer.els.log.appendChild(card);
    }

    this.renderer.showChoices([]);
  }

  selectIdentity(idt) {
    this.state.identity = idt.id;
    this.state.stats = { con: idt.con, int: idt.int, hrt: idt.hrt, art: idt.art, luk: idt.luk };
    this.state.cny = idt.money;
    this.state.fans = { ...idt.fans };
    this.state.energy = 80;
    this.state.maxEnergy = 100;

    this.state.inventory = [];
    this.state.weight = 0;
    const starting = STARTING_ITEMS[idt.id] || [];
    for (const si of starting) {
      this.state.addItem(si.item, si.count);
    }

    this.renderer.log(`你选择了【${idt.emoji} ${idt.name}】`, 'success');
    this.showSeasonSelect();
  }

  showSeasonSelect() {
    this.renderer.clearLog();
    this.renderer.log('选择出发季节：', 'info');

    const seasons = [
      { id: 'spring', name: '🌸 春季', desc: '最稳妥，新手友好', stamina: '×1.0', material: '×1.0' },
      { id: 'summer', name: '☀️ 夏季', desc: '高频事件，素材爆炸', stamina: '×1.3', material: '×1.5' },
      { id: 'autumn', name: '🍂 秋季', desc: '风景绝美，住宿翻倍', stamina: '×0.9', material: '×1.5' },
      { id: 'winter', name: '❄️ 冬季', desc: '地狱模式，存活即封神', stamina: '×1.5', material: '×2.0' },
    ];

    for (const s of seasons) {
      const card = document.createElement('div');
      card.className = 'identity-card';
      card.innerHTML = `
        <h3>${s.name}</h3>
        <div class="desc">${s.desc}</div>
        <div style="margin-top:6px;font-size:12px;color:var(--muted)">体力消耗${s.stamina} | 素材加成${s.material}</div>
      `;
      card.onclick = () => this.selectSeason(s.id);
      this.renderer.els.log.appendChild(card);
    }

    this.renderer.showChoices([]);
  }

  selectSeason(seasonId) {
    this.state.season = seasonId;
    this.renderer.showStats();
    this.renderer.updateStats(this.state);
    this.renderer.log(`你选择了【${SEASONS[seasonId].name}】，准备从成都出发！`, 'success');
    this.renderer.log(`背包负重：${this.state.weight}/${this.state.maxWeight}kg`, 'info');
    this.phaseMorning();
  }

  // ---- 晨间阶段 ----
  phaseMorning() {
    this.state.phase = 'MORNING';
    this.state.time = 9;
    this.renderer.setPhase(`第${this.state.day}天 晨间整备`);
    this.renderer.clearLog();

    if (this.state.season) {
      this.state.weather = rollDailyWeather(this.state.season);
      this.state.weatherText = getWeatherNarrative(this.state.weather);
      const w = WEATHER_TYPES[this.state.weather];
      const s = SEASONS[this.state.season];
      this.renderer.updateWeatherBar(w, s);
      if (this.state.weather !== 'mild') {
        this.renderer.log(`【天气预报】${this.state.weatherText}`, 'info');
        this.renderer.log(`今日影响：体力消耗${Math.round((w.staminaMult * s.staminaMult - 1) * 100)}%+，素材品质${Math.round((w.materialMult * s.materialMult - 1) * 100)}%+`, 'muted');
      } else {
        this.renderer.log(`【天气预报】天气宜人，适合赶路。`, 'muted');
      }
    }

    const node = this.state.currentNode;
    if (!node) {
      this.triggerEnding('arrived');
      return;
    }

    this.state.visitedPois.add(node.id);

    if (this.state.km >= node.km && NODE_EVENTS[node.id]) {
      const evt = NODE_EVENTS[node.id];
      this.renderer.log(evt.text, 'info');
      for (const eff of evt.effects) {
        this.state.modifyStat(eff.key, eff.delta);
      }
    }

    this.renderer.log(`你在${node.name}。${node.desc}`, 'muted');

    const typeNames = { city: '城市', town: '小镇', outpost: '驿站', wild_poi: '野外景点', road: '路段' };
    if (node.type === 'city' || node.type === 'town' || node.type === 'outpost') {
      this.renderer.log(`这是一个${typeNames[node.type]}，你可以补给、住宿。`, 'info');
      this.renderer.showChoices([
        { text: `🏙️ 进入${typeNames[node.type]}`, className: 'primary', onClick: () => this.enterCity(node) },
        { text: '🚴 直接出发', onClick: () => this.phaseDay() },
      ]);
    } else if (node.type === 'wild_poi') {
      this.renderer.renderWildPoi(node, {
        onShoot: () => {
          const attr = node.attractions[0];
          this.state.time += attr.time;
          for (const eff of attr.effects) {
            this.state.modifyStat(eff.key, eff.delta);
          }
          this.renderer.log(`你在${attr.name}拍摄了大量素材！`, 'success');
          this.renderer.updateStats(this.state);
          this.phaseDay();
        },
        onPass: () => this.phaseDay(),
      });
      return;
    } else {
      this.renderer.log(`今日目标：推进到下一个兴趣点。`, 'info');
      this.renderer.showChoices([
        { text: '🚴 出发前进', className: 'primary', onClick: () => this.phaseDay() },
      ]);
    }

    this.renderer.updateStats(this.state);
    SaveSystem.save(this.state);
  }

  // ---- 白天阶段 ----
  phaseDay() {
    this.state.phase = 'DAY';
    this.renderer.setPhase('日间行进');
    this.renderer.log('选择赶路模式：', 'info');
    this.renderer.showChoices([
      { text: `🚴 ${TRAVEL_MODES.normal.name}（速度${TRAVEL_MODES.normal.speed}km/h，消耗适中）`, onClick: () => this.doTravel('normal') },
      { text: `🏃 ${TRAVEL_MODES.rush.name}（速度${TRAVEL_MODES.rush.speed}km/h，消耗较大）`, className: 'danger', onClick: () => this.doTravel('rush') },
    ]);
  }

  doTravel(modeId) {
    const mode = TRAVEL_MODES[modeId];
    const seasonMult = (SEASONS[this.state.season] || {}).staminaMult || 1.0;
    const weatherMult = (WEATHER_TYPES[this.state.weather] || {}).staminaMult || 1.0;
    const totalStaminaMult = seasonMult * weatherMult;

    this.state.time += mode.time;
    this.state.km += mode.speed;
    this.state.energy -= Math.floor(mode.energyCost * totalStaminaMult);
    this.state.stats.con = Math.max(0, this.state.stats.con - Math.floor(mode.conCost * totalStaminaMult));

    this.renderer.log(`你以【${mode.name}】推进了${mode.speed}km。`, 'info');
    if (totalStaminaMult > 1.2) {
      this.renderer.log(`天气恶劣，体力消耗加剧（×${totalStaminaMult.toFixed(1)}）。`, 'warn');
    }

    const nextNode = ROUTE[this.state.nodeIndex + 1];
    if (nextNode && this.state.km >= nextNode.km) {
      this.state.nodeIndex++;
      this.state.visitedPois.add(nextNode.id);
      this.renderer.log(`到达${nextNode.name}！`, 'success');
      this.renderer.log(nextNode.desc, 'info');
      if (nextNode.type === 'wild_poi') {
        const matMult = (WEATHER_TYPES[this.state.weather] || {}).materialMult || 1.0;
        const matGain = Math.floor(3 * matMult);
        this.state.materials += matGain;
        this.state.materialsDay = this.state.day;
        this.renderer.log(`路过${nextNode.name}，顺手拍了几张照片，素材+${matGain}。`, 'info');
      }
    }

    const evt = this.eventEngine.rollEvent('DAY', this.state);
    if (evt) {
      const evtText = this.eventEngine.formatEventText(evt, this.state);
      this.renderer.log(`事件：${evtText}`, 'warn');
      const choices = evt.choices
        .filter(c => !c.condition || this.checkChoiceCondition(c.condition))
        .map(c => ({
          text: c.text,
          className: c.type === 'adventure' ? 'primary' : c.type === 'blackred' ? 'danger' : '',
          onClick: () => {
            const msgs = this.eventEngine.executeChoice(c, this.state);
            for (const m of msgs) {
              this.renderer.log(m.text, m.type);
            }
            this.renderer.log(`你选择了：${c.text.split('（')[0]}`, 'success');
            if (c.effects.some(e => e.key === 'materials' && e.delta > 0)) {
              this.state.materialsDay = this.state.day;
            }
            this.checkStatus(() => this.phaseNoon());
          }
        }));
      this.renderer.showChoices(choices);
    } else {
      this.renderer.log('一路顺风。', 'muted');
      this.checkStatus(() => this.phaseNoon());
    }

    this.renderer.updateStats(this.state);
  }

  // ---- 中午选择 ----
  phaseNoon() {
    if (this.state.time >= 18) {
      this.phaseEvening();
      return;
    }

    this.renderer.setPhase('中午');
    this.renderer.log(`时间：${this.timeEngine.formatTime()}。你可以选择休息或继续赶路。`, 'info');

    this.renderer.showChoices([
      { text: '🍚 吃饭休息（精力+10，体力+8，时间+1h，资金-30）', onClick: () => {
        this.state.time += 1;
        this.state.energy += 10;
        this.state.stats.con = Math.min(100, this.state.stats.con + 8);
        this.state.cny -= 30;
        this.renderer.log('你吃了午饭，休息了一会儿，体力恢复了不少。', 'success');
        this.renderer.updateStats(this.state);
        this.phaseAfternoon();
      }},
      { text: '😴 停下休息（精力+5，体力+5，时间+1.5h）', onClick: () => {
        this.state.time += 1.5;
        this.state.energy += 5;
        this.state.stats.con = Math.min(100, this.state.stats.con + 5);
        this.renderer.log('你在路边找了块平地躺下休息，体力恢复了一些。', 'success');
        this.renderer.updateStats(this.state);
        this.phaseAfternoon();
      }},
      { text: '🚴 继续赶路（跳过休息）', className: 'primary', onClick: () => this.phaseAfternoon() },
    ]);

    this.renderer.updateStats(this.state);
  }

  // ---- 下午 ----
  phaseAfternoon() {
    if (this.state.time >= 18) {
      this.phaseEvening();
      return;
    }

    this.renderer.log('下午继续赶路...', 'info');
    this.renderer.showChoices([
      { text: `🚴 ${TRAVEL_MODES.normal.name}`, onClick: () => this.doAfternoonTravel('normal') },
      { text: `🏃 ${TRAVEL_MODES.rush.name}`, className: 'danger', onClick: () => this.doAfternoonTravel('rush') },
    ]);
  }

  doAfternoonTravel(modeId) {
    const mode = TRAVEL_MODES[modeId];
    const seasonMult = (SEASONS[this.state.season] || {}).staminaMult || 1.0;
    const weatherMult = (WEATHER_TYPES[this.state.weather] || {}).staminaMult || 1.0;
    const totalStaminaMult = seasonMult * weatherMult;

    this.state.time += mode.time;
    this.state.km += mode.speed;
    this.state.energy -= Math.floor(mode.energyCost * totalStaminaMult);
    this.state.stats.con = Math.max(0, this.state.stats.con - Math.floor(mode.conCost * totalStaminaMult));

    this.renderer.log(`下午以【${mode.name}】推进了${mode.speed}km。`, 'info');
    if (totalStaminaMult > 1.2) {
      this.renderer.log(`天气恶劣，体力消耗加剧（×${totalStaminaMult.toFixed(1)}）。`, 'warn');
    }

    const nextNode = ROUTE[this.state.nodeIndex + 1];
    if (nextNode && this.state.km >= nextNode.km) {
      this.state.nodeIndex++;
      this.state.visitedPois.add(nextNode.id);
      this.renderer.log(`到达${nextNode.name}！`, 'success');
      if (nextNode.type === 'wild_poi') {
        const matMult = (WEATHER_TYPES[this.state.weather] || {}).materialMult || 1.0;
        const matGain = Math.floor(3 * matMult);
        this.state.materials += matGain;
        this.state.materialsDay = this.state.day;
        this.renderer.log(`路过${nextNode.name}，顺手拍了几张照片，素材+${matGain}。`, 'info');
      }
    }

    this.checkStatus(() => this.phaseEvening());
    this.renderer.updateStats(this.state);
  }

  // ---- 傍晚 ----
  phaseEvening() {
    this.state.phase = 'EVENING';
    this.renderer.setPhase('傍晚');
    this.renderer.log(`时间：${this.timeEngine.formatTime()}。天色渐暗。`, 'muted');

    const currentNode = this.state.currentNode;
    const isCity = currentNode && currentNode.type === 'city';

    if (isCity) {
      this.renderer.log(`你现在在${currentNode.name}，可以选择在城市过夜。`, 'info');
      this.renderer.showChoices([
        { text: '🏨 进入城市过夜（住宿/补给）', className: 'primary', onClick: () => this.enterCity(currentNode, true) },
        { text: '⛺ 在城市边缘露营（省钱但恢复差）', onClick: () => {
          this.state.accommodationChoice = 'camp';
          this.renderer.log('你决定在城市边缘找个角落露营。', 'muted');
          this.phaseNight();
        }},
        { text: '🌙 继续赶路', onClick: () => {
          this.state.time += 2;
          this.state.km += 10;
          this.state.energy -= 20;
          this.state.stats.con -= 10;
          this.renderer.log('你摸黑赶路，效率很低...', 'warn');
          this.checkStatus(() => this.phaseNight());
        }},
      ]);
    } else {
      this.renderer.log('附近没有城市，你只能在野外扎营。', 'warn');
      this.renderer.showChoices([
        { text: '⛺ 野外扎营（恢复-40%，可能有突发事件）', onClick: () => {
          this.state.accommodationChoice = 'camp';
          this.renderer.log('你在荒野中搭起帐篷，四周一片寂静...', 'muted');
          this.phaseNight();
        }},
        { text: '🌙 继续赶路', onClick: () => {
          this.state.time += 2;
          this.state.km += 10;
          this.state.energy -= 20;
          this.state.stats.con -= 10;
          this.renderer.log('你摸黑赶路，效率很低...', 'warn');
          this.checkStatus(() => this.phaseNight());
        }},
      ]);
    }

    this.renderer.updateStats(this.state);
  }

  // ---- 夜间内容产出（自由组合） ----
  phaseNight() {
    this.state.phase = 'NIGHT';
    this.renderer.setPhase('夜间内容产出（自由组合）');
    this.renderer.clearLog();
    this.renderer.log('夜幕降临，你可以选择多种内容形式组合产出。', 'info');
    const daysOld = this.state.day - this.state.materialsDay;
    const freshnessIcon = daysOld === 0 ? '🟢' : daysOld === 1 ? '🟡' : daysOld >= 2 ? '🔴' : '🟢';
    const freshnessText = daysOld === 0 ? '（新鲜）' : daysOld === 1 ? '（尚可）' : daysOld >= 2 ? '（即将过期！）' : '';
    this.renderer.log(`当前素材积累：${freshnessIcon} ${this.state.materials}${freshnessText} | 剩余时间：${24 - this.state.time}h | 精力：${Math.round(this.state.energy)}`, 'muted');

    const selected = [];
    const refreshChoices = () => {
      const remainingTime = 24 - this.state.time;
      const remainingEnergy = this.state.energy;

      const buttons = Object.entries(CONTENT_TYPES).map(([id, config]) => {
        const canAfford = remainingEnergy >= config.energy && remainingTime >= config.time;
        const isSelected = selected.includes(id);
        return {
          text: `${isSelected ? '✅ ' : ''}${config.name} 时间${config.time}h 精力${config.energy} | 依赖${config.stat.toUpperCase()}`,
          disabled: !canAfford && !isSelected,
          className: isSelected ? 'primary' : '',
          onClick: () => {
            if (isSelected) {
              selected.splice(selected.indexOf(id), 1);
            } else {
              selected.push(id);
            }
            refreshChoices();
          }
        };
      });

      buttons.push({
        text: selected.length > 0 ? `🚀 发布组合（${selected.length}项）` : '💤 直接睡觉（不产出）',
        className: selected.length > 0 ? 'primary' : '',
        onClick: () => {
          if (selected.length > 0) {
            this.doContentCombo(selected);
          } else {
            this.phaseSettle();
          }
        }
      });

      this.renderer.showChoices(buttons);
    };

    refreshChoices();
    this.renderer.updateStats(this.state);
  }

  checkChoiceCondition(condition) {
    if (condition === 'weather_has_rain') {
      return ['light_rain', 'heavy_rain', 'thunderstorm'].includes(this.state.weather);
    }
    if (condition === 'weather_is_blizzard') {
      return this.state.weather === 'blizzard';
    }
    return true;
  }

  doContentCombo(types) {
    const result = ContentSystem.produceCombo(this.state, types);

    const qualityColor = result.quality >= 80 ? 'success' : result.quality >= 60 ? 'info' : result.quality >= 40 ? 'warn' : 'danger';
    this.renderer.log(`🎬 内容质量评分：${result.quality}/100 （${result.grade}）`, qualityColor);

    if (result.grade === '翻车') {
      this.renderer.log('内容太水，粉丝纷纷取关...', 'danger');
      this.state.san = Math.max(0, this.state.san - 3);
      this.state.lowQualityStreak++;
    } else if (result.grade === '低效') {
      this.renderer.log('内容反响冷淡，增长乏力。', 'warn');
      this.state.lowQualityStreak++;
    } else {
      this.renderer.log(`你发布了${types.length}项内容组合！`, 'success');
      this.state.lowQualityStreak = 0;
    }

    for (const [platform, amount] of Object.entries(result.gains)) {
      this.state.fans[platform] = Math.max(0, this.state.fans[platform] + amount);
    }

    this.renderer.log(`粉丝变化：B站${result.gains.bilibili >= 0 ? '+' : ''}${result.gains.bilibili} 抖音${result.gains.douyin >= 0 ? '+' : ''}${result.gains.douyin} 小红书${result.gains.xiaohongshu >= 0 ? '+' : ''}${result.gains.xiaohongshu}`, 'info');

    const totalGain = result.gains.bilibili + result.gains.douyin + result.gains.xiaohongshu;
    if (totalGain > 0) {
      const reward = Math.floor(totalGain * 0.2);
      this.state.cny += reward;
      this.renderer.log(`打赏收入：¥${reward}`, 'success');
    }

    if (this.state.lowQualityStreak >= 2 && this.state.hypeDecayDays === 0) {
      this.state.hypeDecayDays = 3;
      this.renderer.log('⚠️ 连续低质量内容！你的账号进入了"过气"状态，接下来3天内容质量-30%。', 'warn');
    }

    const monetizationEvents = PlatformAlgorithm.checkMonetizationEvents(this.state);
    for (const evt of monetizationEvents) {
      this.renderer.log(`🎉 ${evt.name}！${evt.desc}`, 'success');
      this.state.flags.add(`${evt.platform}_partner`);
    }

    this.phaseSettle();
  }

  // ---- 夜间结算 ----
  phaseSettle() {
    this.state.phase = 'SETTLE';
    this.renderer.setPhase('夜间结算');

    const acc = this.state.accommodationChoice;
    const isCamp = !acc || acc === 'camp';

    const seasonData = SEASONS[this.state.season] || SEASONS.spring;
    let foodCost = Math.floor(50 * seasonData.foodCostMult);
    if (acc && acc !== 'camp') {
      const node = this.state.currentNode;
      const hotel = node && node.accommodations ? node.accommodations.find(a => a.id === acc) : null;
      if (hotel) {
        const lodgingPrice = Math.floor(hotel.price * seasonData.lodgingCostMult);
        foodCost += lodgingPrice;
        this.renderer.log(`🏨 住宿 ${hotel.name}：¥${lodgingPrice}`, 'info');
      }
    } else {
      this.renderer.log(`⛺ 野外扎营，无住宿费用`, 'muted');
    }
    this.state.cny -= foodCost;
    this.renderer.log(`每日食宿消耗：¥${foodCost}`, 'muted');

    let energyMult = 1.0;
    let conMult = 1.0;
    let sanBonus = 0;

    if (acc && acc !== 'camp') {
      const node = this.state.currentNode;
      const hotel = node && node.accommodations ? node.accommodations.find(a => a.id === acc) : null;
      if (hotel) {
        energyMult = hotel.energyMult;
        conMult = hotel.conMult;
        sanBonus = hotel.sanBonus;
      }
    } else {
      energyMult = 0.75;
      conMult = 0.75;
    }

    const baseRecovery = 22 + this.state.stats.con * 0.32;
    const energyRecovery = Math.floor(baseRecovery * energyMult);
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + energyRecovery);
    this.renderer.log(`睡眠恢复精力：+${energyRecovery}${isCamp ? '（野外露营恢复一般）' : ''}`, 'success');

    const currentNode = this.state.currentNode;
    const altitude = currentNode && currentNode.km > 400 ? 0.6 : 1.0;
    const baseConRecovery = Math.max(3, Math.floor((5 + this.state.stats.con * 0.08) * altitude));
    const conRecovery = Math.floor(baseConRecovery * conMult);
    this.state.stats.con = Math.min(100, this.state.stats.con + conRecovery);
    this.renderer.log(`睡眠恢复体力：+${conRecovery}${altitude < 1 ? '（高海拔恢复减缓）' : ''}${isCamp ? '（野外露营恢复一般）' : ''}`, 'success');

    if (sanBonus > 0) {
      this.state.san = Math.min(100, this.state.san + sanBonus);
      this.renderer.log(`住宿环境舒适，精神恢复：+${sanBonus}`, 'success');
    }

    if (isCamp && this.state.identity === 'coder') {
      const sanPenalty = 8;
      this.state.san = Math.max(0, this.state.san - sanPenalty);
      this.renderer.log('💻 【脆皮现充】你在荒野扎营，孤独感如潮水般涌来。SAN -8', 'warn');
    }

    const overload = this.state.checkOverload();
    if (overload.overloaded) {
      this.renderer.log(`⚠️ 背包超载！体力额外-${overload.penalty}`, 'danger');
    }

    const expiry = ContentSystem.checkMaterialExpiry(this.state);
    if (expiry.expired > 0) {
      this.renderer.log(`📦 ${expiry.expired} 份素材已过期失效（超过3天），粉丝喜欢新鲜内容。`, 'warn');
    }

    if (isCamp) {
      const campEvent = rollCampEvent();
      if (campEvent) {
        this.renderer.log(`---`, 'muted');
        this.renderer.log(`${campEvent.text}`, 'warn');
        for (const eff of campEvent.effects) {
          this.state.modifyStat(eff.key, eff.delta);
        }
      }
    }

    if (this.state.hypeDecayDays > 0) {
      this.state.hypeDecayDays--;
      if (this.state.hypeDecayDays === 0) {
        this.renderer.log('✨ 你的"过气"状态已解除，粉丝重新开始关注你。', 'success');
      }
    }

    this.renderer.log(`第${this.state.day}天结束。`, 'info');

    this.state.accommodationChoice = null;

    if (this.checkEnding()) return;

    this.renderer.showChoices([
      { text: '➡️ 进入下一天', className: 'primary', onClick: () => {
        this.state.day++;
        this.state.time = 9;
        this.phaseMorning();
      }}
    ]);

    this.renderer.updateStats(this.state);
    SaveSystem.save(this.state);
  }

  // ---- 状态检查 ----
  checkStatus(next) {
    const sinDesc = SinSystem.getSinDescription(this.state.sin);
    if (sinDesc && !this.state.flags.has('sin_warned_' + Math.floor(this.state.sin / 10))) {
      this.state.flags.add('sin_warned_' + Math.floor(this.state.sin / 10));
      this.renderer.log(sinDesc.text, sinDesc.level);
    }

    if (this.state.stats.con <= 0) {
      this.triggerEnding('dead');
      return;
    }
    if (this.state.san <= 0) {
      this.triggerEnding('insane');
      return;
    }
    if (this.state.cny <= 0 && this.state.totalFans < 1000) {
      this.triggerEnding('broke');
      return;
    }
    if (this.state.sin >= 80) {
      this.triggerEnding('blackred');
      return;
    }
    next();
  }

  // ---- 结局检查 ----
  checkEnding() {
    if (this.state.stats.con <= 0) { this.triggerEnding('dead'); return true; }
    if (this.state.san <= 0) { this.triggerEnding('insane'); return true; }
    if (this.state.cny <= 0 && this.state.totalFans < 1000) { this.triggerEnding('broke'); return true; }
    const sinEnding = SinSystem.checkSinEnding(this.state);
    if (sinEnding) { this.triggerEnding(sinEnding); return true; }
    if (this.state.nodeIndex >= ROUTE.length - 1) {
      const totalFans = this.state.totalFans;
      const sin = this.state.sin;
      if (totalFans > 100000 && sin < 20) {
        this.triggerEnding('famous');
      } else if (sin >= 50) {
        this.triggerEnding('blackred');
      } else {
        this.triggerEnding('arrived');
      }
      return true;
    }
    return false;
  }

  triggerEnding(id) {
    this.state.gameOver = true;
    this.state.ending = id;
    const ending = ENDINGS[id];
    this.renderer.showEnding(ending, this.state, () => this.restart());
    SaveSystem.clear();
  }

  // ---- 城市交互 ----
  enterCity(node, isEvening = false) {
    this._currentCityNode = node;
    this._cityMenuIsEvening = isEvening;
    this._cityMenuTab = '商店';
    this._refreshCityMenu();
  }

  _refreshCityMenu() {
    const node = this._currentCityNode;
    this.renderer.renderCityMenu(node, this.state, this._cityMenuTab, {
      onBuyItem: (itemId) => this.buyItem(itemId),
      onSelectAccommodation: (accId) => this.selectAccommodation(accId),
      onVisitAttraction: (name) => this.visitAttraction(name),
      onSwitchTab: (tab) => {
        this._cityMenuTab = tab;
        this._refreshCityMenu();
      },
      onLeave: () => {
        if (this._cityMenuIsEvening) this.phaseNight();
        else this.phaseDay();
      },
      onBack: () => {
        this._cityMenuTab = '离开';
        this._refreshCityMenu();
      },
    });
  }

  buyItem(itemId) {
    const node = this._currentCityNode;
    const item = node.shop.items.find(i => i.id === itemId);
    if (!item) return;
    if (this.state.cny < item.price) {
      this.renderer.log('资金不足！', 'warn');
      return;
    }
    const newWeight = this.state.weight + item.weight;
    if (newWeight > this.state.maxWeight * 1.5) {
      this.renderer.log('背包超重，无法携带！', 'warn');
      return;
    }
    this.state.cny -= item.price;
    this.state.addItem(itemId, 1);
    this.renderer.log(`购买成功：${item.name} (-¥${item.price})`, 'success');
    this.renderer.updateStats(this.state);
    this._cityMenuTab = '商店';
    this._refreshCityMenu();
  }

  selectAccommodation(accId) {
    const node = this._currentCityNode;
    const acc = node.accommodations.find(a => a.id === accId);
    if (!acc) return;
    if (this.state.cny < acc.price) {
      this.renderer.log('资金不足！', 'warn');
      return;
    }
    this.state.accommodationChoice = accId;
    this.renderer.log(`已预订 ${acc.name}，今晚将在这里休息。`, 'success');
    if (this.state.phase === 'EVENING') {
      this.phaseNight();
    } else {
      this._cityMenuTab = '商店';
      this._refreshCityMenu();
    }
  }

  visitAttraction(attrName) {
    const node = this._currentCityNode;
    const attr = node.attractions.find(a => a.name === attrName);
    if (!attr) return;
    if (24 - this.state.time < attr.time) {
      this.renderer.log('时间不够了！', 'warn');
      return;
    }
    this.state.time += attr.time;
    for (const eff of attr.effects) {
      this.state.modifyStat(eff.key, eff.delta);
    }
    this.renderer.log(`你参观了${attr.name}：${attr.desc}`, 'success');
    this.renderer.updateStats(this.state);
    this._cityMenuTab = '景点';
    this._refreshCityMenu();
  }
}

const game = new Game();
game.showStartScreen();
