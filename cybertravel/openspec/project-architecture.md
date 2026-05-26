# CyberTravelGame 项目架构文档

## 1. 系统概述

CyberTravelGame (骑行网红模拟器) 采用**配置驱动**的架构设计，核心逻辑与表现层完全解耦。游戏数据（事件、道具、路线、角色）全部通过 JSON/JS 对象配置定义，引擎负责解析配置并驱动游戏流程。

## 2. 架构分层

```
┌─────────────────────────────────────────┐
│  Presentation Layer (UI/UX)             │
│  - 状态面板、场景文本、选项按钮、动画    │
├─────────────────────────────────────────┤
│  Game Engine Layer                      │
│  - 时间驱动器、状态机、事件调度器        │
│  - 精力系统、素材系统、内容产出          │
│  - 平台算法、判定系统、结算器            │
├─────────────────────────────────────────┤
│  Configuration Layer                    │
│  - 角色配置、事件库、路线节点、消耗品表  │
│  - 平台算法参数、结局条件                │
├─────────────────────────────────────────┤
│  Persistence Layer                      │
│  - localStorage (MVP) / wx.storage     │
│  - 存档/读档、游戏设置                   │
└─────────────────────────────────────────┘
```

## 3. 核心模块

### 3.1 GameState (游戏状态机)

全局唯一状态对象，包含：

```javascript
{
  // 元数据
  day: number,           // 当前天数
  time: number,          // 当前时间 (0-24，单位小时)
  km: number,            // 已骑行公里数
  nodeIndex: number,     // 当前路线节点索引

  // 玩家属性
  stats: {
    con: number,         // 体力 Constitution (0-100)
    int: number,         // 智力 Intelligence (0-100)
    art: number,         // 审美 Art (0-100)
    hrt: number,         // 情商 Heart (0-100)
    luk: number,         // 运气 Luck (0-100, 隐藏)
  },

  // 动态指标
  energy: number,        // 精力 (0-100)
  san: number,           // 精神值 Sanity (0-100)
  cny: number,           // 资金 (人民币)
  sin: number,           // 原罪度 Sin (0-100, 隐藏)

  // 粉丝库
  fans: {
    bilibili: number,    // 弹幕网粉丝
    douyin: number,      // 短视频网粉丝
    xiaohongshu: number, // 种草网粉丝
  },

  // 素材库
  materials: number,     // MVP: 统一数值池
  // materials: {        // 正式版: 分类型
  //   scenery: number,
  //   conflict: number,
  //  困境: number,
  //   human: number,
 // },

  // 背包与负重
  inventory: Item[],
  weight: number,        // 当前负重 (kg)
  maxWeight: number,     // 负重上限 (kg)

  // 运行时状态
  phase: Phase,          // 当前阶段 (MORNING/DAY/EVENING/NIGHT)
  flags: Set<string>,    // 剧情标记
  trend: Trend | null,   // 当前全网风向
}
```

### 3.2 TimeEngine (时间驱动器)

驱动游戏时间推进：

```javascript
class TimeEngine {
  constructor(gameState) {
    this.state = gameState;
  }

  // 推进时间（小时）
  advance(hours) {
    this.state.time += hours;
    // 检查是否跨越阶段边界
    if (this.state.time >= 18 && this.state.phase === 'DAY') {
      this.state.phase = 'EVENING';
    }
    // ... 其他边界
  }

  // 获取当前阶段
  getCurrentPhase() {
    const t = this.state.time;
    if (t < 9) return 'MORNING_PREP';
    if (t < 18) return 'DAY_TRAVEL';
    if (t < 19) return 'EVENING';
    return 'NIGHT_CONTENT';
  }
}
```

### 3.3 EnergySystem (精力系统)

```javascript
class EnergySystem {
  // 计算睡眠恢复量
  calculateRecovery(state, sleepQuality) {
    const baseRecovery = 20;
    const conBonus = state.stats.con * 0.3;
    return Math.floor((baseRecovery + conBonus) * sleepQuality);
  }

  // 获取睡眠质量系数
  getSleepQuality(state) {
    const node = ROUTE[state.nodeIndex];
    let quality = node.type === 'city' ? 1.0 : 0.6;
    // MVP 简化，正式版加装备/海拔
    return quality;
  }

  // 检查超载惩罚
  checkOverload(state) {
    if (state.weight > state.maxWeight) {
      const overload = state.weight - state.maxWeight;
      state.stats.con -= overload * 2; // 每天额外扣 CON
    }
  }
}
```

### 3.4 MaterialSystem (素材系统)

```javascript
class MaterialSystem {
  // MVP: 统一数值池
  static addMaterials(state, amount, type = 'generic') {
    state.materials += amount;
  }

  // 计算视频质量
  static calculateVideoQuality(state) {
    const baseQuality = state.stats.int * 0.5 + state.stats.art * 0.3;
    const materialBonus = Math.min(state.materials * 2, 50); // 素材加成上限50
    return Math.floor(baseQuality + materialBonus);
  }
}
```

### 3.5 ContentSystem (内容产出系统)

```javascript
class ContentSystem {
  // 内容配置
  static CONTENT_TYPES = {
    photo: { name: '📷 摄影', timeCost: 1, energyCost: 10 },
    video: { name: '🎬 剪视频', timeCost: 4, energyCost: 30 },
    live: { name: '🔴 做直播', timeCost: 2, energyCost: 25 },
  };

  // 执行内容产出
  static produce(state, types) {
    // types: ['photo'] 或 ['live', 'photo']
    let totalTime = 0;
    let totalEnergy = 0;

    for (const type of types) {
      const config = this.CONTENT_TYPES[type];
      totalTime += config.timeCost;
      totalEnergy += config.energyCost;
    }

    // 检查时间和精力是否足够
    if (state.time + totalTime > 24) return { error: '时间不够' };
    if (state.energy < totalEnergy) return { error: '精力不足' };

    // 消耗资源
    state.time += totalTime;
    state.energy -= totalEnergy;

    // 计算收益
    const gains = PlatformAlgorithm.calculate(types, state);
    return { success: true, gains };
  }
}
```

### 3.6 PlatformAlgorithm (平台算法)

三平台差异化收益计算：

```javascript
class PlatformAlgorithm {
  static calculate(contentTypes, state) {
    const result = { bilibili: 0, douyin: 0, xiaohongshu: 0 };

    for (const type of contentTypes) {
      const typeGains = this.calculateType(type, state);
      for (const platform of Object.keys(result)) {
        result[platform] += typeGains[platform];
      }
    }

    return result;
  }

  static calculateType(type, state) {
    const statMap = { photo: 'art', video: 'int', live: 'hrt' };
    const quality = 50 + state.stats[statMap[type]];

    const multipliers = {
      photo: { bilibili: 0.5, douyin: 0.3, xiaohongshu: 2.0 },
      video: { bilibili: 2.0, douyin: 1.0, xiaohongshu: 0.5 },
      live: { bilibili: 0.8, douyin: 2.5, xiaohongshu: 0.2 },
    };

    const result = {};
    for (const platform of ['bilibili', 'douyin', 'xiaohongshu']) {
      const mult = multipliers[type][platform];
      const statBonus = state.stats[statMap[type]] * 0.5;
      result[platform] = Math.floor((quality + statBonus) * mult * 0.1);
    }
    return result;
  }
}
```

### 3.7 EventEngine (事件引擎)

基于配置的事件系统：

```javascript
// 事件配置结构
{
  id: string,
  trigger: {
    phase: Phase,
    condition: Condition[],
    weight: number,
  },
  text: string,
  choices: Choice[],
  effects: Effect[],
}
```

### 3.8 JudgementSystem (判定系统)

```javascript
class JudgementSystem {
  static checkStat(state, stat, difficulty) {
    const value = state.stats[stat] || 0;
    const roll = Math.random() * 100;
    return roll <= value * difficulty;
  }

  static sinCheck(state) {
    if (state.sin <= 0) return false;
    const probability = state.sin * state.totalFans * 0.00001;
    return Math.random() < Math.min(probability, 0.5);
  }
}
```

## 4. 数据流

```
玩家输入 → TimeEngine 推进时间 → 检查阶段边界
                              ↓
                        EventEngine 触发事件
                              ↓
                        玩家做出选择
                              ↓
                        GameState 更新
                              ↓
                        EnergySystem 计算消耗/恢复
                        MaterialSystem 积累素材
                        ContentSystem 产出内容
                        PlatformAlgorithm 计算收益
                              ↓
                        JudgementSystem 判定结局
                              ↓
                        Renderer 更新 UI
                        SaveSystem 自动存档
```

## 5. MVP 架构约束

- **单文件**: 所有代码在 index.html 中
- **无构建**: 直接浏览器打开即可运行
- **无外部依赖**: 纯原生 JS/CSS
- **localStorage 存档**: 自动保存/手动保存

## 6. 正式版演进方向

- 微信小程序框架迁移
- 模块化拆分 (WXML/WXSS/JS 分离)
- 服务器端存档同步
- 社交裂变 (分享、群赞助)
- 广告变现接入
- 独立素材池（分类型）
- 载具改造系统
- 物流/网购系统
