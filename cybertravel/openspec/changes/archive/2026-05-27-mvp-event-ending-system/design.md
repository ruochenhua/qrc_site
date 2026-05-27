# MVP 事件库与结局系统 — 设计文档

## 事件库

### 大事件（5-8个）

```javascript
const MAJOR_EVENTS = [
  {
    id: 'flat_tire',
    phase: 'DAY',
    weight: 10,
    text: '爆胎了！轮胎被路上的碎石扎破，你被迫停在路边。',
    choices: [
      {
        text: '自己修理（需修车工具）',
        condition: { hasItem: 'repairKit' },
        check: { stat: 'int', difficulty: 0.8 },
        success: {
          effects: [
            { type: 'consume', item: 'repairKit' },
            { type: 'msg', text: '你熟练地补好了胎，继续前进。' }
          ]
        },
        failure: {
          effects: [
            { type: 'consume', item: 'repairKit' },
            { type: 'stat', key: 'con', value: -15 },
            { type: 'msg', text: '修坏了...工具也没了，只能推车。' }
          ]
        }
      },
      {
        text: '推车前进',
        effects: [
          { type: 'stat', key: 'con', value: -25 },
          { type: 'km', value: 20 }
        ]
      },
      {
        text: '打电话叫拖车（¥500）',
        effects: [
          { type: 'cny', value: -500 },
          { type: 'time', value: 2 }
        ]
      }
    ]
  },
  {
    id: 'stranger_meet',
    phase: 'DAY',
    weight: 8,
    text: '路上遇到一位骑行老手，他看起来经验丰富。',
    choices: [
      {
        text: '请教经验',
        effects: [
          { type: 'stat', key: 'int', value: 5 },
          { type: 'msg', text: '老手分享了很多实用技巧！' }
        ]
      },
      {
        text: '一起拍照发视频',
        effects: [
          { type: 'material', value: 10 },
          { type: 'fans', platform: 'bilibili', value: 50 }
        ]
      }
    ]
  },
  {
    id: 'fake_script_choice',
    phase: 'NIGHT',
    weight: 5,
    text: '今晚的内容没什么爆点。一个MCN朋友私信你："编个剧本吧，假装在无人区遇到狼群，流量直接起飞。"',
    choices: [
      {
        text: '拒绝，坚持真实',
        effects: [
          { type: 'msg', text: '你拒绝了。虽然流量一般，但心安理得。' }
        ]
      },
      {
        text: '接受，编造剧本',
        effects: [
          { type: 'sin', value: 15 },
          { type: 'fans', platform: 'douyin', value: 200 },
          { type: 'msg', text: '视频爆了！但评论区开始有人质疑...' }
        ]
      }
    ]
  },
  // ... 更多大事件
];
```

### 小事件（10-15个）

```javascript
const MINOR_EVENTS = [
  {
    id: 'good_weather',
    phase: 'DAY',
    weight: 15,
    text: '天气晴朗，风景绝佳。',
    effects: [
      { type: 'material', value: 5 },
      { type: 'stat', key: 'san', value: 5 }
    ]
  },
  {
    id: 'rain',
    phase: 'DAY',
    weight: 12,
    text: '突然下起大雨，路面湿滑。',
    effects: [
      { type: 'stat', key: 'con', value: -10 },
      { type: 'stat', key: 'san', value: -5 }
    ]
  },
  // ... 更多小事件
];
```

### 节点事件（8个）

```javascript
const NODE_EVENTS = {
  chengdu: {
    text: '你从成都出发，踏上了西行之路。背包里装着简单的装备和满腔热血。',
    effects: [{ type: 'msg', text: '旅程开始！' }]
  },
  yaan: {
    text: '到达雅安，雨城的气息扑面而来。你可以在这里休整补给。',
    effects: [{ type: 'stat', key: 'san', value: 10 }]
  },
  // ... 其他节点
};
```

## Sin系统

```javascript
class SinSystem {
  // Sin来源
  static SOURCES = {
    fakeScript: { name: '编造剧本', sin: 15, signal: '评论区出现质疑' },
    fakeAd: { name: '虚假宣传', sin: 10, signal: '粉丝增长放缓' },
    destroyEnv: { name: '破坏环境', sin: 5, signal: '有人私信批评' },
  };

  // 添加Sin并发送弱信号
  static addSin(state, sourceId) {
    const source = this.SOURCES[sourceId];
    state.sin += source.sin;

    // 弱信号：随机概率显示
    if (Math.random() < 0.3) {
      return { signal: source.signal };
    }
    return null;
  }
}
```

## 结局系统

```javascript
const ENDINGS = {
  dead: {
    title: '《横死路边》',
    desc: '你的体力在荒野中耗尽，倒在了通往拉萨的路上。',
    type: 'bad',
    conditions: [{ stat: 'con', op: '<=', value: 0 }],
    priority: 100,
  },
  insane: {
    title: '《精神崩溃》',
    desc: '长期的数据焦虑和网暴彻底击垮了你。',
    type: 'bad',
    conditions: [{ stat: 'san', op: '<=', value: 0 }],
    priority: 90,
  },
  broke: {
    title: '《破产流浪》',
    desc: '资金耗尽，粉丝寥寥。你被迫在街头卖艺维生。',
    type: 'bad',
    conditions: [
      { stat: 'cny', op: '<=', value: 0 },
      { custom: (s) => s.fans.bilibili + s.fans.douyin + s.fans.xiaohongshu < 1000 }
    ],
    priority: 80,
  },
  arrived: {
    title: '《抵达圣城》',
    desc: '经过漫长的跋涉，你终于看到了布达拉宫的轮廓。',
    type: 'neutral',
    conditions: [{ custom: (s) => s.nodeIndex >= ROUTE.length - 1 }],
    priority: 50,
  },
  famous: {
    title: '《中国骑行第一人》',
    desc: '硬核的内容、真实的记录让你收获了千万粉丝。',
    type: 'good',
    conditions: [
      { custom: (s) => s.nodeIndex >= ROUTE.length - 1 },
      { custom: (s) => s.fans.bilibili + s.fans.douyin + s.fans.xiaohongshu > 100000 },
      { stat: 'sin', op: '<', value: 20 },
    ],
    priority: 60,
  },
};

class EndingSystem {
  static check(state) {
    const matched = [];
    for (const [id, ending] of Object.entries(ENDINGS)) {
      if (this.checkConditions(state, ending.conditions)) {
        matched.push({ id, ...ending });
      }
    }
    if (matched.length === 0) return null;
    return matched.sort((a, b) => b.priority - a.priority)[0];
  }

  static checkConditions(state, conditions) {
    return conditions.every(c => {
      if (c.stat) {
        const value = state.stats[c.stat] ?? state[c.stat];
        switch (c.op) {
          case '<=': return value <= c.value;
          case '<': return value < c.value;
          case '>=': return value >= c.value;
          case '>': return value > c.value;
          case '==': return value === c.value;
        }
      }
      if (c.custom) return c.custom(state);
      return true;
    });
  }
}
```
