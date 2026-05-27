# MVP 核心循环验证 — 任务分解

## 任务概览

| ID | 任务 | 模块 | 预估 | 依赖 |
|----|------|------|------|------|
| T01 | 游戏状态机 | engine/state | 0.5h | - |
| T02 | 配置数据 | data/config | 0.5h | - |
| T03 | 时间驱动器 | engine/time | 1h | T01 |
| T04 | 事件引擎 | engine/event | 1h | T01, T02 |
| T05 | 内容产出系统 | engine/content | 0.5h | T01 |
| T06 | 平台算法 | engine/platform | 0.5h | T01 |
| T07 | UI 渲染器 | ui/renderer | 1h | - |
| T08 | 存档系统 | engine/save | 0.5h | T01 |
| T09 | 整合与测试 | index.html | 1h | T01-T08 |

## 详细任务

### T01: 游戏状态机
**模块**: `index.html` (script)
**描述**: 定义简化版 GameState

```javascript
class GameState {
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
    this.san = 100;
    this.cny = 25000;
    this.fans = { bilibili: 500, douyin: 0, xiaohongshu: 0 };
    this.phase = 'MORNING';
    this.flags = new Set();
  }
}
```

**验收标准**:
- [ ] GameState 正确初始化
- [ ] 包含时间、精力、粉丝等核心字段

### T02: 配置数据
**模块**: `index.html` (script)
**描述**: 定义路线和事件配置

```javascript
const ROUTE = [
  { id: 'chengdu', name: '成都', type: 'city', km: 0 },
  { id: 'yaan', name: '雅安', type: 'city', km: 140 },
];

const EVENTS = [
  {
    id: 'flat_tire',
    phase: 'DAY',
    weight: 10,
    text: '爆胎了！轮胎被路上的碎石扎破。',
    choices: [
      { text: '推车前进', effects: [{ type: 'stat', key: 'con', value: -15 }, { type: 'km', value: 20 }] },
      { text: '打电话叫拖车', effects: [{ type: 'cny', value: -500 }] },
    ],
  },
  // ... 其他事件
];
```

**验收标准**:
- [ ] 路线配置完整
- [ ] 至少3个事件配置

### T03: 时间驱动器
**模块**: `index.html` (script)
**描述**: 实现时间推进和阶段切换

**验收标准**:
- [ ] 时间可以推进
- [ ] 18:00自动切换到晚间
- [ ] 19:00自动切换到夜间产出
- [ ] 24:00自动结束一天

### T04: 事件引擎
**模块**: `index.html` (script)
**描述**: 实现事件触发和执行

**验收标准**:
- [ ] 按权重随机触发事件
- [ ] 选项效果正确应用到状态

### T05: 内容产出系统
**模块**: `index.html` (script)
**描述**: 实现三种内容产出

**验收标准**:
- [ ] 三种内容形式可选
- [ ] 消耗时间和精力
- [ ] 产出后粉丝增长

### T06: 平台算法
**模块**: `index.html` (script)
**描述**: 实现三平台差异化收益

**验收标准**:
- [ ] 三种内容形式收益分布不同
- [ ] 属性影响收益

### T07: UI 渲染器
**模块**: `index.html` (style + DOM)
**描述**: 实现赛博朋克风格 UI

**验收标准**:
- [ ] 状态面板显示时间、体力、精力、资金、粉丝
- [ ] 场景文本区域
- [ ] 选项按钮可点击

### T08: 存档系统
**模块**: `index.html` (script)
**描述**: 实现 localStorage 存档

**验收标准**:
- [ ] 可以保存和加载
- [ ] 自动存档功能

### T09: 整合与测试
**模块**: `index.html`
**描述**: 整合所有模块，测试完整循环

**验收标准**:
- [ ] 可以完成一天完整循环
- [ ] 可以到达雅安节点
- [ ] 无阻塞性 Bug
