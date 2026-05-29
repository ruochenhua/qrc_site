# 兴趣点系统（POI System）- 设计文档

## 1. 概述

将现有抽象的路线节点升级为**可分类、可交互的兴趣点（POI）**，引入城市补给/住宿/景点、野外景点拍摄、野外扎营惩罚、全程地图可视化，增强空间感知和策略深度。

## 2. 数据模型

### 2.1 节点类型扩展

```javascript
// ROUTE 节点数据结构扩展
{
  id: 'yaan',
  name: '雅安',
  type: 'city',           // city | wild_poi | road
  km: 140,
  desc: '雨城，川藏线的门户。',
  
  // === 城市特有 ===
  shop: {
    items: [
      { id: 'food', name: '压缩口粮', price: 20, weight: 1, desc: '恢复体力+5' },
      { id: 'oxygen', name: '便携氧气瓶', price: 80, weight: 2, desc: '高海拔体力恢复+50%' },
      { id: 'repairKit', name: '高级修车工具', price: 120, weight: 2, desc: '爆胎100%修复' },
    ]
  },
  accommodations: [
    { id: 'budget', name: '青年旅舍', price: 50, energyRecovery: 1.2, conRecovery: 1.0, sanRecovery: 0.8 },
    { id: 'standard', name: '商务宾馆', price: 120, energyRecovery: 1.5, conRecovery: 1.3, sanRecovery: 1.0 },
    { id: 'luxury', name: '温泉度假酒店', price: 280, energyRecovery: 2.0, conRecovery: 1.8, sanRecovery: 1.5 },
  ],
  attractions: [
    { name: '青衣江漫步', time: 0.5, effects: [{ key: 'materials', delta: 5 }, { key: 'san', delta: 3 }], desc: '江边晨雾缭绕，如同水墨画。' },
    { name: '碧峰峡熊猫基地', time: 1.5, effects: [{ key: 'materials', delta: 12 }, { key: 'san', delta: 8 }], desc: '近距离拍摄大熊猫，萌翻了！' },
  ],
  
  // === 野外景点特有 ===
  // attractions 同上，但没有 shop 和 accommodations
}
```

### 2.2 节点类型说明

| 类型 | 标识 | 特征 | 示例 |
|------|------|------|------|
| **city** | 🏙️ | 有商店、住宿、景点 | 成都、雅安、康定、拉萨 |
| **wild_poi** | 🏔️ | 有景点，无商店住宿 | 四姑娘山观景台、海子山 |
| **road** | 🛣️ | 什么都没有，纯路过 | （大部分路段） |

### 2.3 路线重设计（长线）

```javascript
ROUTES.long = [
  // 起点
  { id: 'chengdu', name: '成都', type: 'city', km: 0, desc: '...', 
    shop: {...}, accommodations: [...], attractions: [...] },
  
  // 路段（纯路过）
  // 无独立节点，由城市间距自然形成
  
  { id: 'yaan', name: '雅安', type: 'city', km: 140, desc: '...',
    shop: {...}, accommodations: [...], attractions: [...] },
  
  // 野外景点（插入在路段中）
  { id: 'siguniang', name: '四姑娘山观景台', type: 'wild_poi', km: 220, desc: '...',
    attractions: [{ name: '雪山全景', time: 1, effects: [{ key: 'materials', delta: 18 }, { key: 'san', delta: 12 }] }] },
  
  { id: 'luding', name: '泸定', type: 'city', km: 240, desc: '...',
    shop: {...}, accommodations: [...], attractions: [...] },
  
  { id: 'kangding', name: '康定', type: 'city', km: 325, desc: '...',
    shop: {...}, accommodations: [...], attractions: [...] },
  
  { id: 'xinduqiao', name: '新都桥', type: 'wild_poi', km: 420, desc: '...',
    attractions: [{ name: '摄影天堂', time: 1.5, effects: [{ key: 'materials', delta: 20 }, { key: 'san', delta: 10 }] }] },
  
  { id: 'litang', name: '理塘', type: 'city', km: 550, desc: '...',
    shop: {...}, accommodations: [...], attractions: [...] },
  
  { id: 'batang', name: '巴塘', type: 'city', km: 680, desc: '...',
    shop: {...}, accommodations: [...], attractions: [...] },
  
  // 终点
  { id: 'lhasa', name: '拉萨', type: 'city', km: 2100, desc: '...',
    shop: {...}, accommodations: [...], attractions: [...] },
];
```

### 2.4 GameState 新增字段

```javascript
// 当前所在兴趣点
this.currentPoi = null;

// 已访问的兴趣点记录
this.visitedPois = new Set();

// 当前住宿选择（用于夜间结算）
this.accommodationChoice = null; // 'budget' | 'standard' | 'luxury' | 'camp'
```

## 3. 核心算法

### 3.1 下一兴趣点距离计算

```javascript
function getNextPoi(state) {
  for (let i = state.nodeIndex + 1; i < ROUTE.length; i++) {
    if (ROUTE[i].type !== 'road') {
      return ROUTE[i];
    }
  }
  return null;
}

function getDistanceToNextPoi(state) {
  const next = getNextPoi(state);
  if (!next) return 0;
  return next.km - state.km;
}
```

### 3.2 夜间恢复公式（修改）

```javascript
// 原公式
const recovery = 20 + state.stats.con * 0.3;
state.energy = Math.min(state.maxEnergy, state.energy + recovery);

// 新公式：加入住宿/露营系数
function calculateNightRecovery(state) {
  const baseEnergy = 20 + state.stats.con * 0.3;
  const baseCon = Math.max(2, Math.floor((4 + state.stats.con * 0.05) * altitude));
  
  let energyMult = 1.0;
  let conMult = 1.0;
  let sanBonus = 0;
  
  if (state.accommodationChoice === 'camp') {
    // 野外扎营
    energyMult = 0.6;
    conMult = 0.6;
  } else if (state.accommodationChoice === 'budget') {
    energyMult = 1.2;
    conMult = 1.0;
    sanBonus = 2;
  } else if (state.accommodationChoice === 'standard') {
    energyMult = 1.5;
    conMult = 1.3;
    sanBonus = 5;
  } else if (state.accommodationChoice === 'luxury') {
    energyMult = 2.0;
    conMult = 1.8;
    sanBonus = 10;
  }
  
  return {
    energy: Math.floor(baseEnergy * energyMult),
    con: Math.floor(baseCon * conMult),
    san: sanBonus,
  };
}
```

### 3.3 野外夜间突发事件

```javascript
const CAMP_EVENTS = [
  { id: 'wolf_howl', text: '半夜听到狼嚎声，你一夜没睡好...', effects: [{ key: 'energy', delta: -15 }, { key: 'san', delta: -5 }], weight: 3 },
  { id: 'meteor', text: '流星雨！你爬起来拍到了绝美星空延时！', effects: [{ key: 'materials', delta: 15 }, { key: 'san', delta: 10 }], weight: 2 },
  { id: 'rain_camp', text: '帐篷漏雨了，你用身体护住设备...', effects: [{ key: 'energy', delta: -10 }, { key: 'san', delta: -3 }], weight: 4 },
  { id: 'bonfire_chat', text: '隔壁帐篷的驴友过来聊天，分享了一壶酥油茶。', effects: [{ key: 'san', delta: 8 }, { key: 'energy', delta: 5 }], weight: 3 },
  { id: 'peaceful_night', text: '星空璀璨，万籁俱寂，你睡了一个好觉。', effects: [{ key: 'san', delta: 5 }], weight: 5 },
];

// 触发概率：20%
function rollCampEvent() {
  if (Math.random() < 0.2) {
    return weightedRandom(CAMP_EVENTS);
  }
  return null;
}
```

## 4. UI 设计

### 4.1 常驻信息栏（header 下方新增）

```
┌─────────────────────────────────────────────────────┐
│ 🚴 第3天 14:30 | 当前：康定 🏙️                      │
│ 📍 距离下一个兴趣点：新都桥 95km 🏔️                  │
│ [点击展开全程地图]                                    │
└─────────────────────────────────────────────────────┘
```

样式：
- 背景：`#0d0d14`
- 边框：`1px solid var(--border)`
- 字号：12px
- 颜色：muted（#888），图标用 accent 色

### 4.2 城市交互菜单（到达 city 节点时）

```
┌──────────────────────────────────────────┐
│          🏙️ 康定 · 城市菜单               │
├──────────────────────────────────────────┤
│ [商店] [住宿] [景点] [离开]               │
├──────────────────────────────────────────┤
│                                          │
│  商店：                                   │
│  ○ 压缩口粮 ¥20 (1kg)                    │
│  ○ 便携氧气瓶 ¥80 (2kg)                  │
│  ○ 高级修车工具 ¥120 (2kg)               │
│                                          │
│  住宿：                                   │
│  ○ 青年旅舍 ¥50  恢复一般                 │
│  ○ 商务宾馆 ¥120 恢复较好                │
│  ● 温泉度假酒店 ¥280 恢复极佳            │
│                                          │
│  景点：                                   │
│  ○ 跑马山观景台 (0.5h, 素材+5)          │
│  ○ 康定情歌广场 (1h, 素材+8, 精神+5)     │
│                                          │
└──────────────────────────────────────────┘
```

### 4.3 全程地图弹窗

```
┌──────────────────────────────────────────────────────┐
│  🗺️ 全程路线地图                         [X关闭]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ✅ 成都 0km 🏙️ ────────                         │
│            140km                                     │
│  ✅ 雅安 140km 🏙️ ──────                          │
│            80km                                      │
│  🏔️ 四姑娘山观景台 220km ───                      │
│            20km                                      │
│  ✅ 泸定 240km 🏙️ ──────                          │
│            85km                                      │
│  ✅ 康定 325km 🏙️ ←── 📍 你在这里                 │
│            95km                                      │
│  🏔️ 新都桥 420km ──────                           │
│            130km                                     │
│  ⬜ 理塘 550km 🏙️ ──────                          │
│            ...                                       │
│  ⬜ 拉萨 2100km 🏙️ ───── 🏁                       │
│                                                      │
│  图例：🏙️ 城市  🏔️ 野外景点  ✅ 已到达  ⬜ 未到达   │
└──────────────────────────────────────────────────────┘
```

实现方式：
- 用垂直列表展示所有 POI 节点
- 当前节点高亮（accent 色边框）
- 节点之间显示距离差
- 点击节点展开详情面板（右侧滑出）

### 4.4 景点到达弹窗

```
┌──────────────────────────────────────────┐
│      🏔️ 四姑娘山观景台                   │
├──────────────────────────────────────────┤
│  四座雪峰一字排开，云雾在峰间流转，       │
│  美得令人窒息。                           │
│                                          │
│  你可以选择：                             │
│  [📷 停留拍摄]  1h | 素材+18 精神+12     │
│  [🚴 路过]      不消耗时间               │
└──────────────────────────────────────────┘
```

## 5. 流程修改

### 5.1 到达节点时的流程变化

```
原流程：到达节点 → 触发节点事件 → 显示描述 → [出发前进]

新流程：
到达节点 → 判断节点类型
  ├── city → 触发节点事件 → [进入城市] → 城市菜单
  ├── wild_poi → 显示景点描述 → [停留拍摄] / [路过]
  └── road → 无特殊事件，继续
```

### 5.2 夜间流程变化

```
原流程：傍晚 → [扎营休息] → 夜间内容产出 → 结算

新流程：
傍晚 → 判断当前是否在 city 节点
  ├── 是 → [进入城市过夜] → 选择住宿档次 → 夜间内容产出 → 结算（住宿加成）
  └── 否 → [野外扎营] → 夜间内容产出 → 结算（露营缩减）→ 20%触发露营事件
```

### 5.3 phaseEvening 修改

```javascript
phaseEvening() {
  const currentPoi = this.state.currentNode;
  const isCity = currentPoi && currentPoi.type === 'city';
  
  if (isCity) {
    this.renderer.showChoices([
      { text: '🏨 进入城市（住宿/补给/观光）', className: 'primary', onClick: () => this.enterCity(currentPoi) },
      { text: '⛺ 在城市边缘露营（省钱但恢复差）', onClick: () => {
        this.state.accommodationChoice = 'camp';
        this.phaseNight();
      }},
    ]);
  } else {
    this.renderer.showChoices([
      { text: '⛺ 野外扎营（恢复-40%，可能有突发事件）', onClick: () => {
        this.state.accommodationChoice = 'camp';
        this.phaseNight();
      }},
    ]);
  }
}
```

## 6. ADR 引用

- **ADR-001**: 单文件 MVP 架构 — 所有新增代码保持在 index.html 内
- **ADR-002**: 配置驱动 — POI 数据全部配置化，避免硬编码逻辑
- **ADR-003**: Vanilla JS — 不使用外部 UI 框架，纯 DOM 操作实现地图弹窗

## 7. 风险与回滚

| 风险 | 缓解措施 |
|------|---------|
| 路线数据结构扩展导致存档不兼容 | SaveSystem 增加版本迁移逻辑（schemaVersion 3） |
| UI 改动导致移动端显示问题 | 弹窗使用 max-width + overflow-y:auto，列表使用 flex 布局 |
| 城市菜单交互过于复杂 | 使用标签页切换（商店/住宿/景点），避免一屏信息过载 |

## 8. 验收测试用例

### TC1: 查看全程地图
1. 进入游戏，推进到第一个节点
2. 点击顶部"距离下一个兴趣点"
3. 期望：弹出地图弹窗，显示所有节点，当前节点高亮

### TC2: 城市住宿选择
1. 到达雅安（city 节点）
2. 选择"进入城市"→"住宿"→"商务宾馆"
3. 完成夜间内容产出，进入结算
4. 期望：精力恢复值高于野外扎营

### TC3: 野外扎营事件
1. 在推进过程中未到达城市即进入傍晚
2. 选择"野外扎营"
3. 进入夜间内容产出并完成
4. 结算时有 20% 概率触发露营事件

### TC4: 商店购买
1. 到达城市，进入商店
2. 点击购买口粮（检查资金和负重）
3. 资金不足或超载时按钮禁用
4. 购买成功后背包更新
