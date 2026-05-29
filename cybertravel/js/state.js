import { ITEMS, ROUTES, ROUTE, clamp } from './config.js';

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.day = 1;
    this.time = 9;
    this.km = 0;
    this.nodeIndex = 0;

    this.stats = { con: 35, int: 85, art: 40, hrt: 30, luk: 50 };
    this.energy = 80;
    this.maxEnergy = 100;
    this.san = 100;
    this.cny = 25000;
    this.sin = 0;

    this.fans = { bilibili: 500, douyin: 0, xiaohongshu: 0 };
    this.materials = 0;
    this.materialsDay = 0;

    this.phase = 'SELECT';
    this.flags = new Set();
    this.gameOver = false;
    this.ending = null;

    this.inventory = [];
    this.weight = 0;
    this.maxWeight = 15;

    this.visitedPois = new Set();
    this.accommodationChoice = null;

    this.identity = null;
    this.season = null;
    this.weather = 'mild';
    this.weatherText = '';
    this.lowQualityStreak = 0;
    this.hypeDecayDays = 0;
  }

  get totalFans() {
    return this.fans.bilibili + this.fans.douyin + this.fans.xiaohongshu;
  }

  get currentNode() {
    return ROUTE[this.nodeIndex] || null;
  }

  modifyStat(key, delta) {
    if (key in this.stats) {
      this.stats[key] = clamp(this.stats[key] + delta, 0, 100);
    } else if (key === 'energy') {
      this.energy = clamp(this.energy + delta, 0, this.maxEnergy);
    } else if (key === 'san') {
      this.san = clamp(this.san + delta, 0, 100);
    } else if (key === 'cny') {
      this.cny = Math.max(0, this.cny + delta);
    } else if (key === 'sin') {
      this.sin = clamp(this.sin + delta, 0, 100);
    } else if (key === 'materials') {
      this.materials = Math.max(0, this.materials + delta);
    }
  }

  addItem(itemId, count = 1) {
    const item = ITEMS[itemId];
    if (!item) return false;
    const newWeight = this.weight + item.weight * count;
    if (newWeight > this.maxWeight * 1.5) return false;
    this.inventory.push({ id: itemId, count });
    this.weight = newWeight;
    return true;
  }

  checkOverload() {
    if (this.weight > this.maxWeight) {
      const overload = this.weight - this.maxWeight;
      this.stats.con -= overload * 2;
      return { overloaded: true, penalty: overload * 2 };
    }
    return { overloaded: false };
  }
}

export class SaveSystem {
  static KEY = 'cybertravel_save_v1';

  static save(state) {
    const data = {
      schemaVersion: 4,
      routeType: ROUTE === ROUTES.short ? 'short' : 'long',
      day: state.day,
      time: state.time,
      km: state.km,
      nodeIndex: state.nodeIndex,
      stats: state.stats,
      energy: state.energy,
      maxEnergy: state.maxEnergy,
      san: state.san,
      cny: state.cny,
      sin: state.sin,
      fans: state.fans,
      materials: state.materials,
      materialsDay: state.materialsDay,
      inventory: state.inventory,
      weight: state.weight,
      maxWeight: state.maxWeight,
      phase: state.phase,
      flags: Array.from(state.flags),
      visitedPois: Array.from(state.visitedPois || []),
      accommodationChoice: state.accommodationChoice,
      identity: state.identity,
      season: state.season,
      weather: state.weather,
      weatherText: state.weatherText,
      lowQualityStreak: state.lowQualityStreak,
      hypeDecayDays: state.hypeDecayDays,
      gameOver: state.gameOver,
      ending: state.ending,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  static load() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (data.schemaVersion === 1) {
        data.sin = data.sin || 0;
        data.schemaVersion = 2;
      }
      if (data.schemaVersion === 2) {
        data.visitedPois = data.visitedPois || [];
        data.accommodationChoice = data.accommodationChoice || null;
        data.schemaVersion = 3;
      }
      if (data.schemaVersion === 3) {
        data.identity = data.identity || null;
        data.season = data.season || 'spring';
        data.weather = data.weather || 'mild';
        data.weatherText = data.weatherText || '';
        data.materialsDay = data.materialsDay || data.day;
        data.lowQualityStreak = data.lowQualityStreak || 0;
        data.hypeDecayDays = data.hypeDecayDays || 0;
        if (data.km !== undefined) {
          const targetRoute = data.routeType === 'short' ? ROUTES.short : ROUTES.long;
          let closestIndex = 0;
          let closestDist = Infinity;
          for (let i = 0; i < targetRoute.length; i++) {
            const dist = Math.abs(targetRoute[i].km - data.km);
            if (dist < closestDist) {
              closestDist = dist;
              closestIndex = i;
            }
          }
          data.nodeIndex = closestIndex;
          data.km = targetRoute[closestIndex].km;
        }
        data.schemaVersion = 4;
      }
      return data;
    } catch {
      return null;
    }
  }

  static exists() {
    return localStorage.getItem(this.KEY) !== null;
  }

  static clear() {
    localStorage.removeItem(this.KEY);
  }
}
