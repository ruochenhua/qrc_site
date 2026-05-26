# MVP HTML 实现 — 任务分解

## 任务概览

| ID | 任务 | 模块 | 预估 | 依赖 |
|----|------|------|------|------|
| T01 | 游戏状态机与数据结构 | engine/state | 1h | - |
| T02 | 配置数据定义 | data/config | 1h | - |
| T03 | 阶段管理器 | engine/phase | 1.5h | T01, T02 |
| T04 | 事件引擎 | engine/event | 1.5h | T01, T02 |
| T05 | 平台算法 | engine/platform | 1h | T01 |
| T06 | 判定与结算系统 | engine/judge | 1h | T01 |
| T07 | 结局系统 | engine/ending | 1h | T01, T06 |
| T08 | UI 渲染器 | ui/renderer | 2h | - |
| T09 | 存档系统 | engine/save | 0.5h | T01 |
| T10 | 主游戏循环整合 | index.html | 2h | T01-T09 |
| T11 | 测试与调优 | qa/test | 2h | T10 |

## 依赖图

```
T01 (状态机) ──┬── T03 (阶段管理) ──┐
               ├── T04 (事件引擎) ──┤
               ├── T05 (平台算法) ──┤
               ├── T06 (判定结算) ──┤── T07 (结局系统)
               └── T09 (存档系统) ──┘
T02 (配置数据) ──┬── T03
                └── T04
T08 (UI渲染) ─────────────────────── T10 (整合)
T01-T09 ─────────────────────────── T10
T10 ─────────────────────────────── T11 (测试)
```

---

## 详细任务

### T01: 游戏状态机与数据结构
**模块**: `index.html` (script 顶部)
**描述**: 定义 GameState 类和初始状态

```javascript
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.day = 1;
    this.km = 0;
    this.nodeIndex = 0;
    this.stats = { con: 35, int: 85, art: 40, hrt: 30, luk: 50 };
    this.san = 100;
    this.cny = 25000;
    this.sin = 0;
    this.exposure = 0;
    this.fans = { bilibili: 500, douyin: 0, xiaohongshu: 0 };
    this.inventory = [];
    this.packages = [];
    this.phase = 'MORNING_PREP';
    this.flags = new Set();
    this.trend = null;
    this.gameOver = false;
    this.ending = null;
  }

  // 便捷方法
  get totalFans() {
    return this.fans.bilibili + this.fans.douyin + this.fans.xiaohongshu;
  }

  modifyStat(key, delta) {
    if (key in this.stats) {
      this.stats[key] = Math.max(0, Math.min(100, this.stats[key] + delta));
    } else if (key === 'san') {
      this.san = Math.max(0, Math.min(100, this.san + delta));
    } else if (key === 'cny') {
      this.cny = Math.max(0, this.cny + delta);
    } else if (key === 'sin') {
      this.sin = Math.max(0, Math.min(100, this.sin + delta));
    }
  }
}
```

**验收标准**:
- [ ] GameState 可以正确初始化
- [ ] modifyStat 方法边界值正确 (0-100)
- [ ] totalFans 计算正确
- [ ] reset 方法可以重置所有状态

---

### T02: 配置数据定义
**模块**: `index.html` (script 顶部，状态机下方)
**描述**: 定义路线、事件、角色等配置数据

```javascript
const ROUTE = [
  { id: 'chengdu', name: '成都', type: 'city', km: 0, desc: '天府之国，西行起点。' },
  { id: 'yaan', name: '雅安', type: 'city', km: 140, desc: '雨城，川藏线的门户。' },
  { id: 'luding', name: '泸定', type: 'city', km: 220, desc: '大渡河畔，红军飞夺泸定桥之地。' },
  { id: 'kangding', name: '康定', type: 'city', km: 325, desc: '跑马溜溜的山上，海拔2560米。' },
  { id: 'xinduqiao', name: '新都桥', type: 'wild', km: 420, desc: '摄影天堂，光与影的世界。' },
  { id: 'litang', name: '理塘', type: 'city', km: 550, desc: '世界高城，海拔4014米。' },
  { id: 'batang', name: '巴塘', type: 'city', km: 680, desc: '弦子之乡，进入西藏前的最后一站。' },
  { id: 'lhasa', name: '拉萨', type: 'city', km: 2100, desc: '圣城拉萨，布达拉宫在阳光下闪耀。' },
];

const EVENTS = [
  // 至少 10 个事件...
];

const CONTENT_TYPES = {
  photo: { name: '📷 摄影', costCon: 5, costSan: 0, time: 1 },
  video: { name: '🎬 剪视频', costCon: 15, costSan: 10, time: 3 },
  live: { name: '🔴 做直播', costCon: 20, costSan: 15, time: 2 },
};
```

**验收标准**:
- [ ] ROUTE 数组完整定义 8 个节点
- [ ] EVENTS 包含至少 10 个不同事件
- [ ] 每个事件有 id, text, choices
- [ ] CONTENT_TYPES 定义三种内容形式

---

### T03: 阶段管理器
**模块**: `index.html` (script)
**描述**: 实现每日四阶段循环驱动

```javascript
class PhaseManager {
  constructor(state, renderer, eventEngine) {
    this.state = state;
    this.renderer = renderer;
    this.eventEngine = eventEngine;
  }

  startDay() {
    this.state.phase = 'MORNING_PREP';
    this.morningPrep();
  }

  morningPrep() {
    const node = ROUTE[this.state.nodeIndex];
    this.renderer.showScene(`第 ${this.state.day} 天。你在${node.name}醒来。${node.desc}`);

    const choices = [{ text: '出发前进', action: () => this.toDayTravel() }];
    if (node.type === 'city') {
      choices.push(
        { text: '在城镇补给 (消耗¥200)', action: () => this.shop() },
        { text: '休整一天', action: () => this.rest() }
      );
    }
    this.renderer.showChoices(choices);
  }

  toDayTravel() {
    this.state.phase = 'DAY_TRAVEL';
    const event = this.eventEngine.rollEvent('DAY_TRAVEL');
    if (event) {
      this.renderer.showEvent(event, (choice) => {
        this.eventEngine.executeChoice(choice, this.state);
        this.toNightContent();
      });
    } else {
      this.state.km += 60;
      this.state.modifyStat('con', -10);
      this.renderer.showScene('一路顺风，你平稳推进了60公里。');
      this.renderer.showChoices([{ text: '继续', action: () => this.toNightContent() }]);
    }
  }

  toNightContent() {
    this.state.phase = 'NIGHT_CONTENT';
    this.renderer.showScene('夜幕降临，是时候考虑内容产出了。');
    this.renderer.showContentChoices();
  }

  doContent(type) {
    const config = CONTENT_TYPES[type];
    this.state.modifyStat('con', -config.costCon);
    this.state.modifyStat('san', -config.costSan);

    const gains = PlatformAlgorithm.calculate(type, this.state);
    this.state.fans.bilibili += gains.bilibili;
    this.state.fans.douyin += gains.douyin;
    this.state.fans.xiaohongshu += gains.xiaohongshu;

    this.renderer.showMessage(`发布了${config.name}！粉丝增长：B站+${gains.bilibili} 抖音+${gains.douyin} 小红书+${gains.xiaohongshu}`);
    this.toNightSettle();
  }

  toNightSettle() {
    this.state.phase = 'NIGHT_SETTLE';
    // 扣除食宿
    const cost = ROUTE[this.state.nodeIndex].type === 'city' ? 150 : 0;
    this.state.cny -= cost;
    this.state.modifyStat('san', -5);

    // 检查 Game Over
    if (this.checkGameOver()) return;

    // 进入下一天
    this.state.day++;
    SaveSystem.save(this.state);
    this.renderer.updateStats(this.state);
    this.startDay();
  }

  checkGameOver() {
    // 检查各种失败条件...
    if (this.state.stats.con <= 0) { this.triggerEnding('dead'); return true; }
    if (this.state.san <= 0) { this.triggerEnding('insane'); return true; }
    if (this.state.cny <= 0 && this.state.totalFans < 100) { this.triggerEnding('broke'); return true; }
    if (this.state.nodeIndex >= ROUTE.length - 1) { this.triggerEnding('arrived'); return true; }
    return false;
  }

  triggerEnding(endingId) {
    this.state.gameOver = true;
    this.state.ending = endingId;
    this.renderer.showEnding(ENDING[endingId]);
  }
}
```

**验收标准**:
- [ ] 可以正确进入每日四阶段
- [ ] 城镇/荒野的晨间选项不同
- [ ] 日间行进触发事件或平稳推进
- [ ] 夜间内容产出后进入结算
- [ ] 结算后自动进入下一天

---

### T04: 事件引擎
**模块**: `index.html` (script)
**描述**: 实现事件触发、判定、执行

```javascript
class EventEngine {
  rollEvent(phase) {
    const candidates = EVENTS.filter(e => e.phase === phase);
    if (candidates.length === 0) return null;
    const totalWeight = candidates.reduce((sum, e) => sum + (e.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    for (const event of candidates) {
      roll -= (event.weight || 1);
      if (roll <= 0) return event;
    }
    return null;
  }

  executeChoice(choice, state) {
    if (!choice) return;

    if (choice.check) {
      const passed = this.doCheck(choice.check, state);
      const effects = passed ? choice.success : choice.failure;
      this.applyEffects(effects, state);
    } else if (choice.effects) {
      this.applyEffects(choice.effects, state);
    }
  }

  doCheck(check, state) {
    const stat = state.stats[check.stat] || 0;
    const roll = Math.random() * 100;
    return roll <= stat * check.difficulty;
  }

  applyEffects(effects, state) {
    if (!effects) return;
    for (const effect of effects) {
      switch (effect.type) {
        case 'stat': state.modifyStat(effect.key, effect.value); break;
        case 'cny': state.cny += effect.value; break;
        case 'fans': state.fans[effect.platform] += effect.value; break;
        case 'msg': /* 消息已在 UI 层处理 */ break;
      }
    }
  }
}
```

**验收标准**:
- [ ] 事件按权重随机触发
- [ ] 属性判定逻辑正确
- [ ] 效果正确应用到 GameState
- [ ] 成功/失败分支正确执行

---

### T05: 平台算法
**模块**: `index.html` (script)
**描述**: 实现三平台差异化收益计算

```javascript
class PlatformAlgorithm {
  static calculate(contentType, state) {
    const baseQuality = 50;
    const statMap = { photo: 'art', video: 'int', live: 'hrt' };
    const quality = baseQuality + state.stats[statMap[contentType]];

    const multipliers = {
      photo: { bilibili: 0.5, douyin: 0.3, xiaohongshu: 2.0 },
      video: { bilibili: 2.0, douyin: 1.0, xiaohongshu: 0.5 },
      live: { bilibili: 0.8, douyin: 2.5, xiaohongshu: 0.2 },
    };

    const result = {};
    for (const platform of ['bilibili', 'douyin', 'xiaohongshu']) {
      const mult = multipliers[contentType][platform];
      const statBonus = state.stats[statMap[contentType]] * 0.5;
      result[platform] = Math.floor((quality + statBonus) * mult * 0.1);
    }
    return result;
  }
}
```

**验收标准**:
- [ ] 三种内容形式收益分布不同
- [ ] 属性影响收益计算
- [ ] 收益为非负整数

---

### T06: 判定与结算系统
**模块**: `index.html` (script)
**描述**: 实现属性判定、原罪检测、日常结算

```javascript
class JudgeSystem {
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

  static dailySettle(state) {
    // 食宿消耗
    const node = ROUTE[state.nodeIndex];
    const cost = node.type === 'city' ? 150 : 0;
    state.cny -= cost;

    // 精神消耗
    state.modifyStat('san', node.type === 'city' ? -2 : -8);

    // 正义打击
    if (this.sinCheck(state)) {
      state.san -= 30;
      state.fans.bilibili = Math.floor(state.fans.bilibili * 0.5);
      return { sinTriggered: true };
    }

    return { sinTriggered: false };
  }
}
```

**验收标准**:
- [ ] 属性判定概率正确
- [ ] 原罪打击概率随 Sin 和粉丝增长
- [ ] 日常结算扣除正确

---

### T07: 结局系统
**模块**: `index.html` (script)
**描述**: 定义结局条件和结局内容

```javascript
const ENDINGS = {
  dead: {
    title: '《横死路边》',
    desc: '你的体力在荒野中耗尽，倒在了通往拉萨的路上。你的账号永远停更，粉丝们只记得那个"断更的骑行博主"。',
    type: 'bad',
  },
  insane: {
    title: '《精神崩溃》',
    desc: '长期的数据焦虑和网暴彻底击垮了你。你删除了所有视频，注销了账号，消失在赛博世界。',
    type: 'bad',
  },
  broke: {
    title: '《破产流浪》',
    desc: '资金耗尽，粉丝寥寥。你被迫在街头卖艺维生，曾经的骑行梦想化为泡影。',
    type: 'bad',
  },
  arrived: {
    title: '《抵达圣城》',
    desc: '经过漫长的跋涉，你终于看到了布达拉宫的轮廓。无论过程如何，你完成了这场西行之旅。',
    type: 'good',
  },
  famous: {
    title: '《中国骑行第一人》',
    desc: '硬核的内容、真实的记录让你收获了千万粉丝。你成为了骑行圈的传奇，赞助商踏破了门槛。',
    type: 'good',
  },
  banned: {
    title: '《全网封杀》',
    desc: '你的造假行为被技术流网友扒皮，官方平台下达全网封杀令。账号冻结，粉丝清零，赛博死亡。',
    type: 'bad',
  },
};
```

**验收标准**:
- [ ] 至少 5 个不同结局
- [ ] 结局触发条件正确
- [ ] 结局画面正确显示

---

### T08: UI 渲染器
**模块**: `index.html` (style + DOM)
**描述**: 实现赛博朋克风格 UI 渲染

**CSS 变量**:
```css
:root {
  --bg: #0a0a0f;
  --panel: #12121a;
  --accent: #00f0ff;
  --accent2: #ff0055;
  --text: #e0e0e0;
  --muted: #888;
  --border: #222;
  --danger: #ff3333;
  --success: #00ff88;
  --warn: #ffaa00;
}
```

**DOM 结构**:
```html
<div id="game">
  <header>...</header>
  <div id="stats">...</div>
  <div id="scene">...</div>
  <div id="controls">...</div>
</div>
<div id="modal" class="hidden">...</div>
```

**Renderer 类**:
```javascript
class Renderer {
  constructor() {
    this.sceneEl = document.getElementById('scene');
    this.controlsEl = document.getElementById('controls');
    this.statsEl = document.getElementById('stats');
    this.modalEl = document.getElementById('modal');
  }

  showScene(text) {
    this.sceneEl.innerHTML = `<p>${text}</p>`;
  }

  showChoices(choices) {
    this.controlsEl.innerHTML = choices.map(c =>
      `<button class="choice-btn" data-action="${c.action}">${c.text}</button>`
    ).join('');
    // 绑定点击事件...
  }

  updateStats(state) {
    // 更新状态面板...
  }

  showEnding(ending) {
    this.modalEl.classList.remove('hidden');
    this.modalEl.innerHTML = `
      <div class="ending ${ending.type}">
        <h2>${ending.title}</h2>
        <p>${ending.desc}</p>
        <button onclick="location.reload()">再来一局</button>
      </div>
    `;
  }
}
```

**验收标准**:
- [ ] 赛博朋克风格正确渲染
- [ ] 状态面板实时更新
- [ ] 场景文本正确显示
- [ ] 选项按钮可点击
- [ ] 结局弹窗全屏显示

---

### T09: 存档系统
**模块**: `index.html` (script)
**描述**: 实现 localStorage 存档

```javascript
class SaveSystem {
  static KEY = 'cybertravel_save';

  static save(state) {
    const data = {
      ...state,
      flags: Array.from(state.flags),
    };
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  static load() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    data.flags = new Set(data.flags);
    return data;
  }

  static exists() {
    return localStorage.getItem(this.KEY) !== null;
  }

  static clear() {
    localStorage.removeItem(this.KEY);
  }
}
```

**验收标准**:
- [ ] 可以保存游戏状态
- [ ] 可以加载游戏状态
- [ ] flags Set 正确序列化/反序列化
- [ ] 存档存在性检查正确

---

### T10: 主游戏循环整合
**模块**: `index.html`
**描述**: 将所有模块整合为完整游戏

```javascript
// 初始化
const state = new GameState();
const renderer = new Renderer();
const eventEngine = new EventEngine();
const phaseManager = new PhaseManager(state, renderer, eventEngine);

// 启动画面
function showStartScreen() {
  renderer.showScene('欢迎来到骑行网红模拟器。你是一名前互联网大厂程序员，决定辞职骑行川藏线，同时经营自媒体账号。');
  renderer.showChoices([
    { text: '开始新游戏', action: () => phaseManager.startDay() },
    ...(SaveSystem.exists() ? [{ text: '继续游戏', action: () => loadGame() }] : []),
  ]);
}

function loadGame() {
  const data = SaveSystem.load();
  if (data) {
    Object.assign(state, data);
    phaseManager.startDay();
  }
}

showStartScreen();
```

**验收标准**:
- [ ] 所有模块正确初始化
- [ ] 启动画面正确显示
- [ ] 新游戏/继续游戏选项正确
- [ ] 游戏可以完整运行一局

---

### T11: 测试与调优
**模块**: `index.html`
**描述**: 测试游戏流程，调整数值平衡

**测试用例**:
1. **完整流程测试**: 从开局到结局，验证每个阶段正常
2. **事件测试**: 触发每个事件，验证选项和后果
3. **边界测试**: 体力/精神/资金归零时的处理
4. **存档测试**: 保存、刷新、加载、继续
5. **数值平衡**: 调整事件概率、收益、消耗

**验收标准**:
- [ ] 可以完成一局游戏无阻塞 Bug
- [ ] 至少 3 种不同结局可触发
- [ ] 存档/读档功能正常
- [ ] 数值基本平衡（不会太快死亡或太容易通关）
