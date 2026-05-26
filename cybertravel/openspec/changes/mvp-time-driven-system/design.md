# MVP 时间驱动系统深化 — 设计文档

## 精力系统

```javascript
class EnergySystem {
  // 每天起床恢复（不会补满）
  static morningRecovery(state) {
    const recovery = 20 + state.stats.con * 0.3;
    state.energy = Math.min(100, state.energy + recovery);
  }

  // 检查超载
  static checkOverload(state) {
    if (state.weight > state.maxWeight) {
      const overload = state.weight - state.maxWeight;
      state.stats.con -= overload * 2;
    }
  }
}
```

## 赶路选择

```javascript
const TRAVEL_MODES = {
  normal: { name: '正常骑行', speed: 15, energyCost: 5, conCost: 2 },
  rush: { name: '拼命赶路', speed: 25, energyCost: 15, conCost: 8 },
};
```

## 休息选项

```javascript
const REST_OPTIONS = {
  eat: { name: '吃饭休息', time: 1, energyRecovery: 10, cnyCost: 30 },
  skip: { name: '继续赶路', time: 0, energyRecovery: 0 },
};
```

## 负重系统

```javascript
// 背包物品
const ITEMS = {
  repairKit: { name: '修车工具', weight: 2 },
  food: { name: '口粮', weight: 1 },
};

// 角色开局自带
const STARTING_ITEMS = {
  programmer: [
    { item: 'repairKit', count: 1 },
    { item: 'food', count: 5 },
  ],
};
```
