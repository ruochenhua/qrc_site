# MVP 内容产出与平台系统深化 — 设计文档

## 素材系统

```javascript
class MaterialSystem {
  // 白天事件积累素材
  static addMaterials(state, amount) {
    state.materials += amount;
  }

  // 计算视频质量
  static calculateVideoQuality(state) {
    const baseQuality = state.stats.int * 0.5 + state.stats.art * 0.3;
    const materialBonus = Math.min(state.materials * 2, 50);
    return Math.floor(baseQuality + materialBonus);
  }

  // 每天清空素材（已使用）
  static dailyReset(state) {
    state.materials = 0;
  }
}
```

## 内容产出自由组合

```javascript
class ContentSystem {
  static TYPES = {
    photo: { name: '📷 摄影', time: 1, energy: 10 },
    video: { name: '🎬 剪视频', time: 4, energy: 30 },
    live: { name: '🔴 做直播', time: 2, energy: 25 },
  };

  // 组合产出
  static produceCombo(state, types) {
    const NIGHT_START = 19;
    const NIGHT_END = 24;
    const budget = NIGHT_END - NIGHT_START;

    let totalTime = 0;
    let totalEnergy = 0;
    for (const t of types) {
      totalTime += this.TYPES[t].time;
      totalEnergy += this.TYPES[t].energy;
    }

    if (totalTime > budget) return { error: '时间不够' };
    if (state.energy < totalEnergy) return { error: '精力不足' };

    state.time = NIGHT_END;
    state.energy -= totalEnergy;

    // 计算收益
    const gains = { bilibili: 0, douyin: 0, xiaohongshu: 0 };
    for (const t of types) {
      const typeGains = PlatformAlgorithm.calculate(t, state);
      for (const p of Object.keys(gains)) {
        gains[p] += typeGains[p];
      }
    }

    // 应用收益
    for (const p of Object.keys(gains)) {
      state.fans[p] += gains[p];
    }

    return { success: true, gains };
  }
}
```

## 平台变现解锁

```javascript
const MONETIZATION = {
  bilibili: [
    { fans: 10000, name: '创作激励', dailyIncome: (fans) => fans * 0.001 },
    { fans: 100000, name: '品牌合作', event: 'brand_deal_bilibili' },
  ],
  douyin: [
    { fans: 5000, name: '直播带货', dailyIncome: (fans) => fans * 0.002 },
    { fans: 50000, name: '星图广告', event: 'star_ad_douyin' },
  ],
  xiaohongshu: [
    { fans: 1000, name: '品牌置换', dailyIncome: (fans) => fans * 0.003 },
    { fans: 10000, name: '付费推广', event: 'paid_promo_xhs' },
  ],
};

class MonetizationSystem {
  static checkUnlocks(state) {
    const unlocks = [];
    for (const [platform, tiers] of Object.entries(MONETIZATION)) {
      for (const tier of tiers) {
        if (state.fans[platform] >= tier.fans && !state.flags.has(`${platform}_${tier.fans}`)) {
          state.flags.add(`${platform}_${tier.fans}`);
          unlocks.push({ platform, ...tier });
        }
      }
    }
    return unlocks;
  }

  static dailyIncome(state) {
    let total = 0;
    for (const [platform, tiers] of Object.entries(MONETIZATION)) {
      for (const tier of tiers) {
        if (state.flags.has(`${platform}_${tier.fans}`) && tier.dailyIncome) {
          total += tier.dailyIncome(state.fans[platform]);
        }
      }
    }
    return Math.floor(total);
  }
}
```
