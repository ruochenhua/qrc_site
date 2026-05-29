# CyberTravelGame 项目架构文档

> 版本：MVP-Phase0-R2 | 更新日期：2026-05-29
> 本文档描述 `index.html` 中单文件架构的实际模块划分。

---

## 1. 系统概述

单文件 HTML 架构（ADR-001）。所有逻辑、样式、配置、数据集中在 `index.html` 中，浏览器直接打开即可运行。模块间通过全局变量和类静态方法交互。

## 2. 架构分层

```
┌─────────────────────────────────────────┐
│  Presentation Layer (UI/UX)             │
│  - Renderer: DOM 更新、日志输出、选项按钮 │
│  - CSS: 赛博朋克主题样式                 │
├─────────────────────────────────────────┤
│  Game Engine Layer                      │
│  - Game: 阶段管理器（phaseMorning ~ phaseSettle）
│  - GameState: 全局状态对象               │
│  - TimeEngine: 时间格式化                │
│  - EventEngine: 事件抽取与执行           │
│  - ContentSystem: 内容质量评分与产出     │
│  - PlatformAlgorithm: 三平台收益计算     │
│  - SinSystem: Sin 弱信号提示             │
├─────────────────────────────────────────┤
│  Configuration Layer                    │
│  - SEASONS / WEATHER_TYPES / SEASON_WEATHER
│  - ROUTES (短线8节点 / 长线22节点)       │
│  - EVENTS (18个事件，三分法)             │
│  - CONTENT_TYPES / PLATFORM_MULTIPLIERS  │
│  - ENDINGS / CAMP_EVENTS / NODE_EVENTS   │
├─────────────────────────────────────────┤
│  Persistence Layer                      │
│  - SaveSystem: localStorage, schemaVersion 4
└─────────────────────────────────────────┘
```

## 3. 核心模块

### 3.1 GameState

```javascript
{
  // 时间/空间
  day, time, km, nodeIndex,

  // 五维属性
  stats: { con, int, art, hrt, luk },

  // 动态指标
  energy, maxEnergy, san, cny, sin,

  // 粉丝库
  fans: { bilibili, douyin, xiaohongshu },

  // 素材与保质期
  materials, materialsDay,

  // 负重
  inventory, weight, maxWeight,

  // 运行时
  phase, flags, gameOver, ending,
  visitedPois, accommodationChoice,

  // 生存张力系统
  identity, season, weather, weatherText,
  lowQualityStreak, hypeDecayDays,
}
```

### 3.2 Game（阶段管理器）

核心方法链：
```javascript
showStartScreen()
  → showIdentitySelect() → selectIdentity()
  → showSeasonSelect() → selectSeason()
  → phaseMorning()       // 生成天气
    → phaseDay() → doTravel()
      → phaseNoon() → phaseAfternoon() → doAfternoonTravel()
        → phaseEvening()
          → phaseNight() → doContentCombo()
            → phaseSettle()  // 结算、存档、进入下一天
```

### 3.3 EventEngine

```javascript
rollEvent(phase, state)   // 天气影响事件权重
formatEventText(event, state)  // {weather_text} 模板注入
executeChoice(choice, state)   // 执行效果，支持 type 元数据
```

### 3.4 ContentSystem

```javascript
calculateQuality(state, type)       // 单个内容质量分
calculateComboQuality(state, types) // 组合平均质量分
checkMaterialExpiry(state)          // 3天保质期检查
produceCombo(state, types)          // 执行产出，返回 gains + quality + grade
```

### 3.5 PlatformAlgorithm

```javascript
calculate(type, state, fanMultiplier = 1.0)
// 支持：变现解锁加成、程序员视频+30%、老铁直播抖音翻倍
```

### 3.6 SinSystem

```javascript
static addSin(state, amount, sourceId)  // 自动处理老铁 Sin 减半
static checkSinEnding(state)            // Sin >= 80
static getSinDescription(sin)           // 弱信号文本
```

### 3.7 SaveSystem

```javascript
static KEY = 'cybertravel_save_v1'
static save(state)      // schemaVersion = 4
static load()           // v1→v2→v3→v4 迁移
static exists()
static clear()
```

## 4. 数据流

```
玩家点击选项
    ↓
Game.phaseXxx() 调用
    ↓
状态变更（GameState.modifyStat）
    ↓
天气倍率计算（SEASONS × WEATHER_TYPES）
    ↓
事件触发（EventEngine.rollEvent）
    ↓
内容产出（ContentSystem.produceCombo）
    ↓
平台收益（PlatformAlgorithm.calculate）
    ↓
质量判定 + 过气检查
    ↓
夜间结算（phaseSettle）
    ↓
Renderer.updateStats() + SaveSystem.save()
```

## 5. 配置数据

所有配置以全局 `const` 对象形式存在：

| 配置对象 | 说明 |
|---------|------|
| `SEASONS` | 四季参数（体力/素材/食物/住宿倍率） |
| `WEATHER_TYPES` | 17 种天气效果（体力/素材/危险度/叙事文本） |
| `SEASON_WEATHER` | 季节专属天气事件池 |
| `ROUTES` | 短线 8 节点 / 长线 22 节点 |
| `EVENTS` | 18 个事件（大事件 8 + 小事件 10），三分法 |
| `CONTENT_TYPES` | 3 种内容产出形式 |
| `PLATFORM_MULTIPLIERS` | 三平台差异化倍率 |
| `ENDINGS` | 6 个结局 |
| `CAMP_EVENTS` | 6 个野外露营事件 |
| `NODE_EVENTS` | 节点到达事件 |

## 6. 约束

- **单文件**（ADR-001）：`index.html` ~2900 行
- **无构建**（ADR-003）：原生 JS/CSS，浏览器直接打开
- **无外部依赖**：无 npm 包、无 CDN
- **localStorage 存档**（ADR-005）：单槽位，自动保存

## 7. 演进方向

- 微信小程序框架迁移（WXML/WXSS/JS 分离）
- 服务器端存档同步
- 模块化拆分（webpack/vite）
- 独立素材池（分类型）
- 载具改造与物流系统
