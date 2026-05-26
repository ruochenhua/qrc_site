# MVP 核心循环验证 — 设计文档

## 设计目标

验证 CyberTravelGame 最核心的体验路径：一天完整循环 + 节点到达。

## 架构概述

遵循 ADR-001 (单文件 MVP) 和 ADR-003 (纯原生 JS)：

```
index.html
├── <style>       /* 赛博朋克主题 CSS */
├── <body>        /* UI 结构 */
│   ├── #game
│   │   ├── header      /* 标题 + 时间 */
│   │   ├── #stats      /* 状态面板 */
│   │   ├── #scene      /* 场景/事件显示区 */
│   │   └── #controls   /* 操作按钮区 */
│   └── #modal    /* 弹窗层 */
└── <script>
    ├── 配置数据
    ├── GameState
    ├── TimeEngine
    ├── EventEngine
    ├── ContentSystem
    ├── PlatformAlgorithm
    ├── Renderer
    └── SaveSystem
```

## 数据模型

### GameState

```javascript
{
  day: 1,
  time: 9,               // 当前时间 (小时)
  km: 0,
  nodeIndex: 0,

  stats: { con: 35, int: 85, art: 40, hrt: 30, luk: 50 },
  energy: 80,            // 精力
  san: 100,
  cny: 25000,

  fans: { bilibili: 500, douyin: 0, xiaohongshu: 0 },

  phase: 'MORNING',
  flags: new Set(),
}
```

### 路线配置

```javascript
const ROUTE = [
  { id: 'chengdu', name: '成都', type: 'city', km: 0 },
  { id: 'yaan', name: '雅安', type: 'city', km: 140 },
];
```

## 核心模块设计

### TimeEngine

```javascript
class TimeEngine {
  constructor(state) {
    this.state = state;
  }

  advance(hours) {
    this.state.time += hours;
    this.checkPhaseTransition();
  }

  checkPhaseTransition() {
    const t = this.state.time;
    if (t >= 18 && this.state.phase === 'DAY') {
      this.state.phase = 'EVENING';
      // 触发晚间事件
    }
    if (t >= 19 && this.state.phase === 'EVENING') {
      this.state.phase = 'NIGHT';
      // 进入内容产出阶段
    }
    if (t >= 24) {
      this.endDay();
    }
  }

  endDay() {
    this.state.day++;
    this.state.time = 9;
    this.state.phase = 'MORNING';
    // 精力恢复
    this.state.energy = Math.min(100, this.state.energy + 30);
  }
}
```

### ContentSystem (简化版)

```javascript
class ContentSystem {
  static TYPES = {
    photo: { name: '📷 摄影', time: 1, energy: 10 },
    video: { name: '🎬 剪视频', time: 4, energy: 30 },
    live: { name: '🔴 做直播', time: 2, energy: 25 },
  };

  static produce(state, type) {
    const config = this.TYPES[type];
    state.time += config.time;
    state.energy -= config.energy;

    const gains = PlatformAlgorithm.calculate(type, state);
    state.fans.bilibili += gains.bilibili;
    state.fans.douyin += gains.douyin;
    state.fans.xiaohongshu += gains.xiaohongshu;

    return gains;
  }
}
```

### PlatformAlgorithm (简化版)

```javascript
class PlatformAlgorithm {
  static calculate(type, state) {
    const statMap = { photo: 'art', video: 'int', live: 'hrt' };
    const quality = 50 + state.stats[statMap[type]];

    const multipliers = {
      photo: { bilibili: 0.5, douyin: 0.3, xiaohongshu: 2.0 },
      video: { bilibili: 2.0, douyin: 1.0, xiaohongshu: 0.5 },
      live: { bilibili: 0.8, douyin: 2.5, xiaohongshu: 0.2 },
    };

    const result = {};
    for (const p of ['bilibili', 'douyin', 'xiaohongshu']) {
      result[p] = Math.floor(quality * multipliers[type][p] * 0.1);
    }
    return result;
  }
}
```

## 数据流

```
玩家点击选项 → TimeEngine 推进时间 → 检查阶段切换
                                   ↓
                             EventEngine 触发事件
                                   ↓
                             玩家做出选择
                                   ↓
                             GameState 更新
                                   ↓
                             ContentSystem / PlatformAlgorithm
                                   ↓
                             Renderer 更新 UI
                             SaveSystem 自动存档
```

## 界面设计

### 主界面

```
┌─────────────────────────────┐
│ 骑行网红模拟器      14:30    │
├─────────────────────────────┤
│ 体力 ████████░░  精力 ██████░░│
│ 资金 ¥25,000     粉丝 500   │
│ 公里 60km → 雅安(80km)      │
├─────────────────────────────┤
│                             │
│     [场景描述文本...]        │
│                             │
├─────────────────────────────┤
│  [选项 A]  [选项 B]          │
└─────────────────────────────┘
```

## 关键决策

1. **单选内容产出**: MVP 先简化，正式版再做自由组合
2. **2节点路线**: 足够验证核心循环，不增加复杂度
3. **精力恢复固定**: 每天+30，正式版再加睡眠质量系数

## 接口定义

### Renderer

```javascript
class Renderer {
  showScene(text)
  showChoices(choices)
  updateStats(state)
  showMessage(text)
}
```

### SaveSystem

```javascript
class SaveSystem {
  static save(state)
  static load()
  static exists()
}
```
