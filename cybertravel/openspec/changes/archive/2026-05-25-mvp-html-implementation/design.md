# MVP HTML 实现 — 设计文档

## 设计目标

在单文件 HTML 中实现完整的 CyberTravelGame MVP，验证核心玩法循环。

## 架构概述

遵循 ADR-001 (单文件 MVP) 和 ADR-003 (纯原生 JS)：

```
index.html
├── <style>       /* 赛博朋克主题 CSS */
├── <body>        /* UI 结构 */
│   ├── #game     /* 游戏主容器 */
│   │   ├── header      /* 标题 + 天数 */
│   │   ├── #stats      /* 状态面板 */
│   │   ├── #scene      /* 场景/事件显示区 */
│   │   └── #controls   /* 操作按钮区 */
│   └── #modal    /* 弹窗层 */
└── <script>      /* 游戏引擎 */
    ├── 配置数据   /* 路线、事件、角色 */
    ├── GameState  /* 状态机 */
    ├── PhaseManager /* 阶段驱动 */
    ├── EventEngine /* 事件系统 */
    ├── PlatformAlgo /* 平台算法 */
    ├── Renderer   /* UI 渲染 */
    └── SaveSystem /* 存档系统 */
```

## 数据模型

### GameState

```javascript
{
  // 元数据
  day: 1,
  km: 0,
  nodeIndex: 0,

  // 玩家属性
  stats: { con: 35, int: 85, art: 40, hrt: 30, luk: 50 },

  // 动态指标
  san: 100,
  cny: 25000,
  sin: 0,
  exposure: 0,

  // 粉丝
  fans: { bilibili: 500, douyin: 0, xiaohongshu: 0 },

  // 背包 (简化)
  inventory: [],

  // 物流 (MVP 简化)
  packages: [],

  // 运行时
  phase: 'MORNING_PREP',
  flags: new Set(),
  trend: null,
  gameOver: false,
  ending: null,
}
```

### 路线节点

```javascript
[
  { id: 'chengdu', name: '成都', type: 'city', km: 0 },
  { id: 'yaan', name: '雅安', type: 'city', km: 140 },
  { id: 'luding', name: '泸定', type: 'city', km: 220 },
  { id: 'kangding', name: '康定', type: 'city', km: 325 },
  { id: 'xinduqiao', name: '新都桥', type: 'wild', km: 420 },
  { id: 'litang', name: '理塘', type: 'city', km: 550 },
  { id: 'batang', name: '巴塘', type: 'city', km: 680 },
  { id: 'lhasa', name: '拉萨', type: 'city', km: 2100 },
]
```

### 事件配置

```javascript
{
  id: 'flat_tire',
  phase: 'DAY_TRAVEL',
  weight: 10,
  text: '爆胎了！轮胎被路上的碎石扎破。',
  choices: [
    {
      text: '自己修理 (消耗工具)',
      condition: { hasItem: 'repair_kit' },
      check: { stat: 'int', difficulty: 0.8 },
      success: { effects: [{ type: 'consume', item: 'repair_kit' }, { type: 'msg', text: '修好了！' }] },
      failure: { effects: [{ type: 'consume', item: 'repair_kit' }, { type: 'stat', stat: 'con', value: -15 }, { type: 'msg', text: '修坏了，工具也没了...' }] },
    },
    {
      text: '推车前进',
      effects: [{ type: 'stat', stat: 'con', value: -25 }, { type: 'stat', stat: 'km', value: 10 }],
    },
  ],
}
```

## 核心模块设计

### PhaseManager

```javascript
class PhaseManager {
  constructor(gameState, renderer) {
    this.state = gameState;
    this.renderer = renderer;
  }

  async runPhase(phase) {
    this.state.phase = phase;
    switch (phase) {
      case 'MORNING_PREP': return this.morningPrep();
      case 'DAY_TRAVEL': return this.dayTravel();
      case 'NIGHT_CONTENT': return this.nightContent();
      case 'NIGHT_SETTLE': return this.nightSettle();
    }
  }

  morningPrep() {
    const node = ROUTE[this.state.nodeIndex];
    this.renderer.showScene(`第 ${this.state.day} 天早晨，你在${node.name}醒来。`);
    if (node.type === 'city') {
      this.renderer.showChoices([
        { text: '出发前进', action: () => this.nextPhase('DAY_TRAVEL') },
        { text: '在城镇补给', action: () => this.showShop() },
        { text: '休整一天', action: () => this.rest() },
      ]);
    } else {
      this.renderer.showChoices([
        { text: '收拾营地出发', action: () => this.nextPhase('DAY_TRAVEL') },
      ]);
    }
  }

  // ... 其他阶段
}
```

### EventEngine

```javascript
class EventEngine {
  constructor(gameState) {
    this.state = gameState;
  }

  rollEvent(phase) {
    const candidates = EVENTS.filter(e => e.phase === phase && this.checkCondition(e.condition));
    if (candidates.length === 0) return null;
    const totalWeight = candidates.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const event of candidates) {
      roll -= event.weight;
      if (roll <= 0) return event;
    }
    return candidates[0];
  }

  checkCondition(condition) {
    if (!condition) return true;
    // 检查各种条件...
    return true;
  }

  executeChoice(choice) {
    if (choice.check) {
      const passed = this.doCheck(choice.check);
      return passed ? choice.success : choice.failure;
    }
    return choice.effects;
  }

  doCheck(check) {
    const stat = this.state.stats[check.stat];
    const roll = Math.random() * 100;
    return roll <= stat * check.difficulty;
  }
}
```

### PlatformAlgorithm

```javascript
class PlatformAlgorithm {
  static calculate(contentType, quality, stats) {
    const platforms = {
      bilibili: { base: 1.0, bonus: stats.int * 0.02, penalty: 0 },
      douyin: { base: 1.5, bonus: stats.hrt * 0.02, penalty: 0 },
      xiaohongshu: { base: 0.8, bonus: stats.art * 0.02, penalty: 0 },
    };

    const multipliers = {
      photo: { bilibili: 0.5, douyin: 0.3, xiaohongshu: 2.0 },
      video: { bilibili: 2.0, douyin: 1.0, xiaohongshu: 0.5 },
      live: { bilibili: 0.8, douyin: 2.5, xiaohongshu: 0.2 },
    };

    const result = {};
    for (const [platform, config] of Object.entries(platforms)) {
      const mult = multipliers[contentType][platform];
      const gain = Math.floor(quality * mult * (config.base + config.bonus));
      result[platform] = gain;
    }
    return result;
  }
}
```

## 数据流

```
玩家点击 → PhaseManager 处理 → GameState 更新
                              ↓
                        EventEngine 触发事件
                              ↓
                        判定系统执行
                              ↓
                        PlatformAlgorithm 计算收益
                              ↓
                        Renderer 更新 UI
                              ↓
                        SaveSystem 自动存档
```

## 界面交互设计

### 主界面布局

```
┌─────────────────────────────┐
│ 骑行网红模拟器      第 7 天  │  ← header
├─────────────────────────────┤
│ 体力 ████████░░  资金 ¥21K  │  ← stats (3x2 grid)
│ 精神 ██████░░░░  粉丝 1.2K  │
│ 公里 420 km      新都桥     │
├─────────────────────────────┤
│                             │
│     [场景描述文本区域]        │  ← scene (scrollable)
│                             │
│     爆胎了！轮胎被路上的      │
│     碎石扎破...              │
│                             │
├─────────────────────────────┤
│  [自己修理]  [推车前进]      │  ← controls
│  [打电话叫拖车]              │
└─────────────────────────────┘
```

### 弹窗设计

- 结局弹窗: 全屏覆盖，显示结局标题和描述
- 确认弹窗: 居中，用于重要决策确认
- 提示弹窗: 顶部滑入，用于临时消息

## 关键决策

1. **单文件架构** (ADR-001): 接受维护成本，换取开发速度和可移植性
2. **内联配置** (ADR-002): MVP 阶段配置内联在 JS 中，正式版分离
3. **简化判定** (ADR-004): MVP 使用简单属性判定，正式版扩展为复杂系统
4. **单存档槽** (ADR-005): MVP 仅支持单存档，降低复杂度

## 接口定义

### Renderer

```javascript
class Renderer {
  showScene(text)           // 显示场景描述
  showChoices(choices)      // 显示选项按钮
  showEvent(event)          // 显示事件弹窗
  showEnding(ending)        // 显示结局
  updateStats(state)        // 更新状态面板
  showMessage(text, type)   // 显示临时消息
}
```

### SaveSystem

```javascript
class SaveSystem {
  static save(state)        // 保存到 localStorage
  static load()             // 从 localStorage 加载
  static exists()           // 检查是否有存档
  static clear()            // 清除存档
}
```
