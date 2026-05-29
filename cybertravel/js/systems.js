import { SEASONS, WEATHER_TYPES, EVENTS, CONTENT_TYPES, PLATFORM_MULTIPLIERS, clamp } from './config.js';

export class TimeEngine {
  constructor(state) {
    this.state = state;
  }

  advance(hours) {
    this.state.time += hours;
    if (this.state.time >= 24) {
      this.endDay();
    }
  }

  endDay() {
    this.state.day++;
    this.state.time = 9;
    this.state.phase = 'MORNING';
    const recovery = 20 + this.state.stats.con * 0.3;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + recovery);
    this.state.materials = 0;
    const overload = this.state.checkOverload();
    if (overload.overloaded) {
      // 惩罚在checkOverload中已应用
    }
  }

  getPhase() {
    const t = this.state.time;
    if (t < 9) return 'MORNING';
    if (t < 12) return 'DAY_MORNING';
    if (t < 14) return 'DAY_NOON';
    if (t < 18) return 'DAY_AFTERNOON';
    if (t < 19) return 'EVENING';
    return 'NIGHT';
  }

  formatTime() {
    const h = Math.floor(this.state.time);
    const m = Math.floor((this.state.time - h) * 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
}

export class EventEngine {
  rollEvent(phase, state) {
    const candidates = EVENTS.filter(e => e.phase === phase);
    if (candidates.length === 0) return null;
    const weatherDanger = (WEATHER_TYPES[state.weather] || {}).dangerMult || 1.0;
    const totalWeight = candidates.reduce((sum, e) => sum + (e.weight || 1) * weatherDanger, 0);
    let roll = Math.random() * totalWeight;
    for (const event of candidates) {
      roll -= (event.weight || 1) * weatherDanger;
      if (roll <= 0) return event;
    }
    return null;
  }

  formatEventText(event, state) {
    let text = event.text;
    const weatherText = (WEATHER_TYPES[state.weather] || {}).text || '';
    text = text.replace('{weather_text}', weatherText ? weatherText : '');
    return text;
  }

  executeChoice(choice, state) {
    if (!choice || !choice.effects) return [];
    const messages = [];
    for (const eff of choice.effects) {
      if (eff.key === 'time') {
        state.time += eff.delta;
      } else if (eff.key === 'km') {
        state.km += eff.delta;
      } else if (eff.key === 'node') {
        state.nodeIndex = Math.max(0, state.nodeIndex + eff.delta);
        const node = ROUTE[state.nodeIndex];
        if (node) state.km = node.km;
      } else if (eff.key.startsWith('fans_')) {
        const platform = eff.key.replace('fans_', '');
        state.fans[platform] = Math.max(0, (state.fans[platform] || 0) + eff.delta);
      } else if (eff.key === 'msg') {
        if (eff.msg) messages.push({ text: eff.msg, type: 'info' });
      } else if (eff.key === 'sin') {
        let sinDelta = eff.delta;
        if (state.identity === 'tough') {
          sinDelta = Math.floor(sinDelta * 0.5);
        }
        const result = SinSystem.addSin(state, sinDelta, 'fakeScript');
        if (result.triggered) {
          messages.push({ text: `💀 ${result.signal}`, type: 'warn' });
        }
      } else if (eff.key === 'int_check') {
        const roll = Math.random();
        const success = roll < (state.stats.int / 100) * eff.delta;
        messages.push({ text: `智力判定：${success ? '成功！' : '失败...'}`, type: success ? 'success' : 'warn' });
        if (!success) {
          state.modifyStat('con', -10);
          state.time += 1;
        }
      } else {
        state.modifyStat(eff.key, eff.delta);
      }
    }
    return messages;
  }
}

export class ContentSystem {
  static calculateQuality(state, type) {
    const config = CONTENT_TYPES[type];
    const baseQuality = 50 + state.stats[config.stat];
    const materialBonus = Math.min(state.materials * 2, 50);

    const weatherData = WEATHER_TYPES[state.weather] || WEATHER_TYPES.mild;
    const seasonData = SEASONS[state.season] || SEASONS.spring;
    const hypeMult = state.hypeDecayDays > 0 ? 0.7 : 1.0;
    const freshBonus = state.materialsDay === state.day ? 1.2 : 1.0;

    const weatherMult = weatherData.materialMult || 1.0;
    const seasonMult = seasonData.materialMult || 1.0;

    let quality = (baseQuality + materialBonus) * weatherMult * seasonMult * hypeMult * freshBonus;
    quality = Math.floor(quality);

    let grade, fanMult;
    if (quality >= 80) { grade = '爆款'; fanMult = 1.3; }
    else if (quality >= 60) { grade = '合格'; fanMult = 1.0; }
    else if (quality >= 40) { grade = '低效'; fanMult = 0.3; }
    else { grade = '翻车'; fanMult = -1; }

    return { score: quality, grade, fanMult };
  }

  static calculateComboQuality(state, types) {
    let totalScore = 0;
    for (const type of types) {
      totalScore += this.calculateQuality(state, type).score;
    }
    const avgScore = Math.floor(totalScore / types.length);

    let grade, fanMult;
    if (avgScore >= 80) { grade = '爆款'; fanMult = 1.3; }
    else if (avgScore >= 60) { grade = '合格'; fanMult = 1.0; }
    else if (avgScore >= 40) { grade = '低效'; fanMult = 0.3; }
    else { grade = '翻车'; fanMult = -1; }

    return { score: avgScore, grade, fanMult };
  }

  static checkMaterialExpiry(state) {
    if (state.materials > 0 && state.day - state.materialsDay >= 3) {
      const expired = state.materials;
      state.materials = 0;
      return { expired, remaining: 0 };
    }
    return { expired: 0, remaining: state.materials };
  }

  static produceCombo(state, types) {
    let totalTime = 0;
    let totalEnergy = 0;
    const gains = { bilibili: 0, douyin: 0, xiaohongshu: 0 };
    let totalQualityScore = 0;

    for (const type of types) {
      const config = CONTENT_TYPES[type];
      totalTime += config.time;
      totalEnergy += config.energy;

      const q = this.calculateQuality(state, type);
      totalQualityScore += q.score;

      const typeGains = PlatformAlgorithm.calculate(type, state, q.fanMult);
      for (const [platform, amount] of Object.entries(typeGains)) {
        gains[platform] += amount;
      }
    }

    state.time += totalTime;
    state.energy -= totalEnergy;

    const avgQuality = Math.floor(totalQualityScore / types.length);
    let grade;
    if (avgQuality >= 80) grade = '爆款';
    else if (avgQuality >= 60) grade = '合格';
    else if (avgQuality >= 40) grade = '低效';
    else grade = '翻车';

    return { gains, totalTime, totalEnergy, quality: avgQuality, grade };
  }
}

export class PlatformAlgorithm {
  static calculate(type, state, fanMultiplier = 1.0) {
    const config = CONTENT_TYPES[type];
    const baseQuality = 50 + state.stats[config.stat];
    const materialBonus = Math.min(state.materials * 2, 50);
    const quality = baseQuality + materialBonus;

    const result = {};
    for (const platform of ['bilibili', 'douyin', 'xiaohongshu']) {
      let mult = PLATFORM_MULTIPLIERS[type][platform];
      if (state.identity === 'tough' && type === 'live' && platform === 'douyin') {
        mult *= 2;
      }
      if (state.identity === 'coder' && type === 'video') {
        mult *= 1.3;
      }
      const statBonus = state.stats[config.stat] * 0.5;
      const rawGain = Math.floor((quality + statBonus) * mult * 0.1);

      const fans = state.fans[platform];
      let monetizationBonus = 1.0;
      if (fans >= 100000) monetizationBonus = 2.0;
      else if (fans >= 10000) monetizationBonus = 1.5;
      else if (fans >= 1000) monetizationBonus = 1.2;

      if (fanMultiplier >= 0) {
        result[platform] = Math.floor(rawGain * monetizationBonus * fanMultiplier);
      } else {
        const losses = { bilibili: -15, douyin: -10, xiaohongshu: -5 };
        result[platform] = losses[platform] || -5;
      }
    }
    return result;
  }

  static checkMonetizationEvents(state) {
    const events = [];
    if (state.fans.bilibili >= 10000 && !state.flags.has('bilibili_partner')) {
      events.push({
        platform: 'bilibili',
        name: '创作激励开通',
        desc: '你的B站粉丝突破1万，创作激励已开通！',
      });
    }
    if (state.fans.douyin >= 5000 && !state.flags.has('douyin_live')) {
      events.push({
        platform: 'douyin',
        name: '直播带货资格',
        desc: '你的抖音粉丝突破5000，获得直播带货资格！',
      });
    }
    return events;
  }
}

export class SinSystem {
  static SOURCES = {
    fakeScript: { name: '编造剧本', signal: '评论区出现质疑声...' },
    fakeAd: { name: '虚假宣传', signal: '粉丝增长突然放缓...' },
    destroyEnv: { name: '破坏环境', signal: '有人私信批评你的行为...' },
    exploitTragedy: { name: '消费悲剧', signal: '媒体报道了你的"表演"...' },
  };

  static addSin(state, amount, sourceId) {
    state.sin = clamp(state.sin + amount, 0, 100);
    const source = this.SOURCES[sourceId];
    if (source && Math.random() < 0.4) {
      return { triggered: true, signal: source.signal, source: source.name };
    }
    return { triggered: false };
  }

  static checkSinEnding(state) {
    if (state.sin >= 80) {
      return 'blackred';
    }
    return null;
  }

  static getSinDescription(sin) {
    if (sin >= 80) return { level: 'danger', text: '⚠️ 你的黑红指数极高，随时可能被全网封杀' };
    if (sin >= 50) return { level: 'warn', text: '⚡ 争议越来越大，评论区开始失控' };
    if (sin >= 30) return { level: 'info', text: '💭 有人开始质疑你的内容真实性' };
    if (sin >= 10) return { level: 'muted', text: '🌫️ 隐约感觉有些不对劲...' };
    return null;
  }
}
