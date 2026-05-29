# 生存张力重构 — 详细设计文档

> 版本：MVP-Phase0-R2 | 更新日期：2026-05-28

---

## 1. 四季系统

### 1.1 四季参数表

| 季节 | 天气事件频率 | 体力消耗倍率 | 素材品质加成 | 食物消耗倍率 | 住宿消耗倍率 | 定位 |
|------|-------------|-------------|-------------|-------------|-------------|------|
| **春季** | 20% | ×1.0 | ×1.0 | ×1.0 | ×1.0 | 最稳，新手友好 |
| **夏季** | 40% | ×1.3 | ×1.5（暴雨/彩虹） | ×1.0 | ×1.0 | 高频事件，素材爆炸 |
| **秋季** | 10% | ×0.9 | ×1.5（金秋风景） | ×1.0 | ×2.0（黄金周） | 表面简单，人设暴露风险 |
| **冬季** | 30% | ×1.5 | ×2.0（雪景/极寒） | ×1.5 | ×1.0（野外无住宿） | 地狱模式，存活即封神 |

### 1.2 季节专属天气事件池

```javascript
const SEASON_WEATHER = {
  spring: ['light_rain', 'fog', 'tailwind', 'mild'],
  summer: ['heavy_rain', 'landslide_warning', 'heatwave', 'thunderstorm', 'rainbow'],
  autumn: ['golden', 'crisp', 'golden_week_crowd', 'early_snow'],
  winter: ['blizzard', 'black_ice', 'extreme_cold', 'avalanche_risk'],
};
```

### 1.3 四季对角色策略的影响

- **春季 + 程序员**：体力消耗×1.0，日常净消耗约 -2，可以通过谨慎规划和资金买命稳定推进。推荐走精品视频路线。
- **夏季 + 老铁**：暴雨事件频发，但"暴雨中直播"是抖音流量密码。推荐走直播+黑红路线。
- **秋季 + 程序员**：黄金周期间"路人偶遇"事件暴露率 +20%，伪装骑行容易露馅。但风景素材×1.5，适合摄影图文。
- **冬季 + 程序员**：体力消耗×1.5，正常骑行上午+下午体力 -15，午饭+5，夜间恢复约+6，**净消耗约 -4/天**。不补给出 9 天必死。必须在 outpost 精准续命。活着到拉萨直接封神。

---

## 2. 天气系统

### 2.1 每日天气生成

每天早晨 09:00（`phaseMorning`）生成当日天气：

```javascript
function rollDailyWeather(season) {
  const pool = SEASON_WEATHER[season];
  // 20% 概率触发天气事件，80% 概率为 mild/normal
  if (Math.random() < SEASON_PARAMS[season].weatherFreq) {
    return randomPick(pool);
  }
  return 'mild';
}
```

### 2.2 天气效果表

| 天气 | 体力消耗 | 素材加成 | 事件危险度 | 叙事关键词 |
|------|---------|---------|-----------|-----------|
| mild | 无 | 无 | 无 | "天气宜人" |
| light_rain | +10% | +10% | +10% | "春雨绵绵" |
| fog | +15% | +20% | +20% | "浓雾弥漫" |
| tailwind | -10% | 无 | 无 | "顺风骑行" |
| heavy_rain | +30% | +50% | +30% | "暴雨如注" |
| landslide_warning | +20% | +30% | +50% | "塌方预警" |
| heatwave | +20% | 无 | +10% | "烈日灼人" |
| thunderstorm | +40% | +60% | +40% | "电闪雷鸣" |
| rainbow | 无 | +80% | 无 | "雨后彩虹" |
| golden | -10% | +50% | 无 | "秋高气爽" |
| crisp | 无 | +30% | 无 | "空气清冽" |
| golden_week_crowd | 无 | +20% | +20% | "黄金周人流如织" |
| early_snow | +20% | +40% | +20% | "初雪降临" |
| blizzard | +50% | +100% | +50% | "暴雪封山" |
| black_ice | +30% | +50% | +40% | "暗冰潜伏" |
| extreme_cold | +50% | +80% | +30% | "极寒刺骨" |
| avalanche_risk | +40% | +70% | +60% | "雪崩预警" |

### 2.3 天气叠加规则

天气倍率与季节倍率**乘算叠加**：
```
实际体力消耗倍率 = 季节倍率 × 天气体力倍率
实际素材加成 = 季节加成 × 天气素材加成
```

例如：冬季（×1.5）+ 暴雪（×1.5）= 体力消耗 ×2.25。
程序员正常骑行一次：-5 × 2.25 = **-11.25（取整 -11）**。

### 2.4 UI 呈现

**顶部状态栏（B）**：
```
🌧️ 暴雨 | 体力+30% | 素材×1.5
```
- 天气图标居中，文字颜色：正常白色，危险黄色（+30%~+49%），致命红色（+50%+）
- 鼠标悬停（或移动端长按）显示完整天气叙事文本

**晨间日志（C）**：
```
【天气预报】窗外暴雨如注，远处的山峦隐没在雨幕中。
今日影响：骑行体力消耗+30%，素材品质+50%，事件危险度+30%。
```

---

## 3. 路线扩展

### 3.1 节点类型定义

| 类型 | 标识 | 商店 | 住宿 | 景点 | 示例 |
|------|------|------|------|------|------|
| `city` | 🏙️ | 完整 | 三档 | 多 | 成都、雅安、康定、拉萨 |
| `town` | 🏘️ | 基础 | 一档（青旅/客栈） | 0-1 | 邛崃镇、天全镇、雅江 |
| `outpost` | 🛖 | 应急（口粮+水+泡面） | 无/工棚 | 无 | 二郎山隧道口、海子山驿站、通麦 |
| `wild_poi` | 🏔️ | 无 | 无 | 1-2 | 折多山垭口、怒江72拐、然乌湖 |
| `road` | 🛣️ | 无 | 无 | 无 | 纯路段，无节点 |

### 3.2 outpost 特殊规则

outpost 的住宿（如果有）是"工棚/藏民家"：
- 价格：¥30-50
- energyMult: 0.9
- conMult: 0.8
- sanBonus: 0
- 日志文本："你在藏民家的牛棚旁凑合了一晚，酥油茶的味道让你安心。"

outpost 的商店价格系数：×1.2~×1.5（应急溢价）。

### 3.3 完整路线节点表

#### 短线（成都→康定，约 430km，8 节点）

| 里程 | 节点 | 类型 | 关键设计 |
|------|------|------|---------|
| 0km | 成都 | city | 起点，装备齐全 |
| 60km | 邛崃镇 | town | 第一次小型补给 |
| 140km | 雅安 | city | 雨城， shop 有氧气瓶 |
| 190km | 天全镇 | town | 川藏线门户小站 |
| 260km | 二郎山隧道口 | outpost | 隧道口小卖部，高海拔前最后补给 |
| 340km | 泸定 | city | 大渡河，铁索桥 |
| 400km | 折多山垭口 | wild_poi | 海拔4298m，"康巴第一关" |
| 430km | 新都桥 | town/wild_poi | 摄影天堂，简易住宿 |

#### 长线（成都→拉萨，约 2100km，22 节点）

| 里程 | 节点 | 类型 | 关键设计 |
|------|------|------|---------|
| 0km | 成都 | city | 起点 |
| 60km | 邛崃镇 | town | |
| 140km | 雅安 | city | |
| 190km | 天全镇 | town | |
| 260km | 二郎山隧道口 | outpost | 高海拔前哨站 |
| 340km | 泸定 | city | |
| 400km | 折多山垭口 | wild_poi | 高反触发点 |
| 430km | 新都桥 | town | 摄影天堂 |
| 500km | 雅江 | town | 悬崖上的县城 |
| 540km | 卡子拉山垭口 | wild_poi | 海拔4718m |
| 580km | 理塘 | city | 世界高城，海拔4014m |
| 630km | 海子山/禾尼乡 | outpost | **荒原死亡路段**，冬季关键 |
| 680km | 巴塘 | city | 入藏前最后一站 |
| 720km | 金沙江大桥/竹巴龙 | outpost | 川藏界碑 |
| 790km | 芒康 | town | 进藏第一镇 |
| 860km | 如美镇 | outpost | 澜沧江边 |
| 920km | 觉巴山 | wild_poi | 318最险路段 |
| 980km | 东达山垭口 | wild_poi | **海拔5130m，全程最高** |
| 1040km | 左贡 | town | 山谷小城 |
| 1100km | 邦达 | outpost | 三江并流，兵站 |
| 1160km | 怒江72拐 | wild_poi | 史诗下坡 |
| 1230km | 八宿 | town | 怒江峡谷 |
| 1300km | 安久拉山 | wild_poi | 逆风区 |
| 1370km | 然乌 | town | 然乌湖，风景绝美 |
| 1470km | 波密 | town | 西藏小瑞士 |
| 1560km | 通麦 | outpost | **原"通麦天险"**，价格×1.5 |
| 1630km | 鲁朗 | town | 石锅鸡小镇 |
| 1700km | 色季拉山垭口 | wild_poi | 南迦巴瓦观景台 |
| 1770km | 林芝 | city | 西藏江南 |
| 1900km | 工布江达 | town | 尼洋河畔 |
| 2020km | 墨竹工卡 | town | 松赞干布故乡 |
| 2100km | 拉萨 | city | 终点，布达拉宫 |

### 3.4 冬季死亡路段标记

以下路段冬季生存压力极大，需在 outpost 精准补给：
- **理塘→巴塘**（海子山荒原，630km outpost 是中间唯一补给）
- **邦达→八宿**（东达山+怒江72拐，1100km→1230km 之间无 town）

---

## 4. 事件系统三分法重构

### 4.1 选项结构规范

每个事件遵循以下选项命名和结构规范：

| 选项类型 | 命名前缀 | 体力风险 | 精力风险 | 资金风险 | Sin | 素材 | 粉丝 | 设计意图 |
|---------|---------|---------|---------|---------|-----|------|------|---------|
| **安全** | 🛡️ | 无/低 | 无/低 | 低 | 0 | 0~低 | 0~低 | 保命稳过，无收益或微收益 |
| **冒险** | ⚡ | 中~高 | 中 | 无 | 0 | 中~高 | 中 | 搏命换素材和流量，无道德污点 |
| **黑红** | 💀 | 低~中 | 低 | 无 | 高 | 中 | 高~暴击 | 道德污点换爆发流量 |

### 4.2 事件重构示例

#### 爆胎事件（flat_tire）

```javascript
{
  id: 'flat_tire',
  phase: 'DAY',
  weight: 10,
  text: '爆胎了！轮胎被路上的碎石扎破，你被迫停在路边。{weather_text}',
  // weather_text 根据天气动态插入：
  // mild: ""
  // heavy_rain: "暴雨中换胎简直是噩梦。"
  // blizzard: "暴雪几乎遮蔽了视线，手指冻得僵硬。"
  choices: [
    {
      type: 'safe',
      text: '🛡️ 慢慢推车到前方避险区（安全，体力-5，时间+2h）',
      effects: [{ key: 'con', delta: -5 }, { key: 'time', delta: 2 }]
    },
    {
      type: 'adventure',
      text: '⚡ 暴雨中抢修轮胎拍延时（体力-15，素材+8，时间+1h）',
      condition: 'weather_has_rain',
      effects: [{ key: 'con', delta: -15 }, { key: 'materials', delta: 8 }, { key: 'time', delta: 1 }]
    },
    {
      type: 'safe',
      text: '🛡️ 自己修理（需修车工具，智力判定）',
      effects: [{ key: 'int_check', delta: 0.7 }, { key: 'materials', delta: 2 }, { key: 'time', delta: 2 }]
    },
    {
      type: 'adventure',
      text: '⚡ 咬牙推车前进，拍"爆胎独推30km"Vlog（体力-25，素材+15，B站粉丝+100）',
      effects: [{ key: 'con', delta: -25 }, { key: 'materials', delta: 15 }, { key: 'fans_bilibili', delta: 100 }, { key: 'time', delta: 3 }]
    },
    {
      type: 'blackred',
      text: '💀 假装轮胎被藏民"敲诈"换胎费，拍冲突视频（体力-5，Sin+10，抖音粉丝+300）',
      effects: [{ key: 'con', delta: -5 }, { key: 'sin', delta: 10 }, { key: 'fans_douyin', delta: 300 }, { key: 'msg', delta: 0, msg: '视频爆了！评论区有人质疑"这藏族大哥看起来不像坏人啊？"' }]
    },
    {
      type: 'safe',
      text: '🛡️ 打电话叫拖车（资金-500，时间+1h）',
      effects: [{ key: 'cny', delta: -500 }, { key: 'time', delta: 1 }]
    }
  ]
}
```

#### 高原反应事件（high_altitude_sickness）

```javascript
{
  id: 'high_altitude_sickness',
  phase: 'DAY',
  weight: 7,
  text: '海拔超过3500米，你开始感到头痛、恶心——高原反应来了。',
  choices: [
    {
      type: 'safe',
      text: '🛡️ 吸氧休息（体力-5，精力-10，时间+2h，精神+3）',
      effects: [{ key: 'con', delta: -5 }, { key: 'energy', delta: -10 }, { key: 'time', delta: 2 }, { key: 'san', delta: 3 }]
    },
    {
      type: 'adventure',
      text: '⚡ 边高反边直播濒死状态（体力-25，精力-20，抖音粉丝+800，素材+10）',
      effects: [{ key: 'con', delta: -25 }, { key: 'energy', delta: -20 }, { key: 'fans_douyin', delta: 800 }, { key: 'materials', delta: 10 }]
    },
    {
      type: 'blackred',
      text: '💀 假装高反濒死骗打赏，发求救视频（体力-5，Sin+15，全平台粉丝+200，打赏+¥200）',
      effects: [{ key: 'con', delta: -5 }, { key: 'sin', delta: 15 }, { key: 'fans_bilibili', delta: 100 }, { key: 'fans_douyin', delta: 150 }, { key: 'fans_xiaohongshu', delta: 50 }, { key: 'cny', delta: 200 }]
    },
    {
      type: 'safe',
      text: '🛡️ 掉头返回低海拔（放弃当前节点，精神+5）',
      effects: [{ key: 'node', delta: -1 }, { key: 'km', delta: -30 }, { key: 'san', delta: 5 }]
    }
  ]
}
```

#### 塌方事件（landslide）

```javascript
{
  id: 'landslide',
  phase: 'DAY',
  weight: 5,
  text: '前方路段发生塌方，碎石堵住了去路。',
  choices: [
    {
      type: 'safe',
      text: '🛡️ 等待清理（时间+3h）',
      effects: [{ key: 'time', delta: 3 }]
    },
    {
      type: 'adventure',
      text: '⚡ 冒险绕行塌方边缘（体力-15，推进20km，素材+8）',
      effects: [{ key: 'con', delta: -15 }, { key: 'km', delta: 20 }, { key: 'time', delta: 2 }, { key: 'materials', delta: 8 }]
    },
    {
      type: 'blackred',
      text: '💀 拍摄"我被塌方埋了"假视频（Sin+15，抖音粉丝+500，素材+5）',
      effects: [{ key: 'sin', delta: 15 }, { key: 'fans_douyin', delta: 500 }, { key: 'materials', delta: 5 }]
    }
  ]
}
```

### 4.3 事件文本天气动态插入

每个事件的 `text` 字段支持模板变量 `{weather_text}`，根据当前天气自动拼接叙事：

```javascript
const WEATHER_EVENT_TEXT = {
  mild: '',
  light_rain: '细雨中，视线有些模糊。',
  heavy_rain: '暴雨如注，泥水溅了满身。',
  blizzard: '暴雪几乎遮蔽了视线，手指冻得僵硬。',
  black_ice: '路面覆盖着一层薄冰，车轮直打滑。',
  // ...
};
```

### 4.4 小事件重构

小事件也引入三分法，但选项数量限制为 2（安全 + 冒险）：

| 事件 | 安全选项 | 冒险选项 |
|------|---------|---------|
| good_weather | 正常骑行（稳） | 边骑边航拍（精力-10，素材+5） |
| rain | 避雨（时间+1h） | 雨骑拍摄（体力-12，素材+8） |
| tailwind | 正常骑行 | 加速冲刺（体力-5，推进+15km） |
| headwind | 下车休息（时间+0.5h） | 咬牙硬骑（体力-15，推进正常） |
| steep_climb | 推车（体力-12） | 咬牙骑上去拍爬坡视频（体力-25，素材+10，B站+50） |
| downhill | 控制速度（稳） | 放坡速降拍第一视角（体力-5，素材+8，有概率摔车） |

---

## 5. 内容质量衰减机制

### 5.1 质量分公式（修订版）

```javascript
function calculateContentQuality(state, type) {
  const config = CONTENT_TYPES[type];
  const baseQuality = 50 + state.stats[config.stat];
  const materialBonus = Math.min(state.materials * 2, 50);
  
  // 天气加成
  const weatherMult = WEATHER_QUALITY_MULT[state.weather] || 1.0;
  
  // 季节加成
  const seasonMult = SEASON_PARAMS[state.season].materialBonus || 1.0;
  
  // 过气 Debuff
  const hasHypeDecay = state.lowQualityStreak >= 2;
  const hypeMult = hasHypeDecay ? 0.7 : 1.0;
  
  // 素材新鲜度加成（当天采集的素材额外+20%）
  const freshBonus = state.materialsDay === state.day ? 1.2 : 1.0;
  
  let quality = (baseQuality + materialBonus) * weatherMult * seasonMult * hypeMult * freshBonus;
  return Math.floor(quality);
}
```

### 5.2 及格线与惩罚

| 质量分区间 | 结果 | 惩罚 |
|-----------|------|------|
| ≥80 | 爆款 | 粉丝增长 ×1.3，日志："内容爆了！" |
| 60~79 | 合格 | 正常涨粉 |
| 40~59 | 低效 | 粉丝增长 ×0.3，日志："内容平平，粉丝反响冷淡。" |
| <40 | 翻车 | **全平台掉粉**（B站-15，抖音-10，小红书-5），SAN -3，日志："内容太水，粉丝纷纷取关..." |

### 5.3 连续低质量惩罚（"过气" Debuff）

```javascript
if (quality < 60) {
  state.lowQualityStreak++;
  if (state.lowQualityStreak >= 2) {
    // 触发过气
    renderer.log('⚠️ 连续低质量内容！你的账号进入了"过气"状态，接下来3天内容质量-30%。', 'warn');
    state.hypeDecayDays = 3;
  }
} else {
  state.lowQualityStreak = 0;
  if (state.hypeDecayDays > 0) {
    state.hypeDecayDays--;
  }
}
```

### 5.4 粉丝流失的软下限

每个平台粉丝不会掉到 0 以下，且当粉丝 < 100 时停止流失，避免"死循环无法翻身"。

---

## 6. 素材保质期机制

### 6.1 数据模型

```javascript
// GameState 变更
this.materials = 0;          // 当前可用素材数
this.materialsDay = 0;       // 这批素材的采集日期（day）
```

注意：MVP 仍使用统一数值池，不区分素材类型。

### 6.2 采集规则

- 白天事件获得素材：更新 `materialsDay = state.day`
- 如果 `materialsDay === state.day`：当天素材标记为"新鲜"
- 如果已有素材但新采集的日期更晚：旧素材是否保留？
  - **决策**：直接覆盖。因为 `materials` 是统一数值池，新采集的素材意味着"更新了素材库"。
  - 日志提示："你获得了新的拍摄素材，旧的素材被覆盖/丢弃。"

### 6.3 夜间结算过期检查

```javascript
// phaseSettle 中
if (state.materials > 0 && state.day - state.materialsDay >= 3) {
  const expired = state.materials;
  state.materials = 0;
  renderer.log(`📦 ${expired} 份素材已过期失效（超过3天），粉丝喜欢新鲜内容。`, 'warn');
}
```

### 6.4 保质期 UI 提示

在夜间内容产出阶段，素材数量旁显示新鲜度：
- 🟢 当天采集："素材（新鲜）"
- 🟡 1-2天前："素材（尚可）"
- 🔴 第3天："素材（即将过期！）"

---

## 7. 程序员专属惩罚落地

文档中设定程序员特质"脆皮现充"：荒野扎营时精神值每日额外多扣 10%。

实现方式：

```javascript
// phaseSettle 中，野外露营时
if (isCamp && state.identity === 'programmer') {
  const sanPenalty = Math.floor(10 * (state.san / 100)); // 按比例，避免早期直接崩溃
  state.san -= sanPenalty;
  renderer.log('💻 【脆皮现充】荒野独处让你焦虑不安，精神额外下降。', 'warn');
}
```

更狠一点的版本（推荐）：

```javascript
if (isCamp && state.identity === 'programmer') {
  // 荒野露营时，SAN 恢复为 0（其他角色露营也不恢复 SAN，但程序员额外扣）
  const sanPenalty = 8;
  state.san -= sanPenalty;
  renderer.log('💻 【脆皮现充】你在荒野扎营，孤独感如潮水般涌来。SAN -8', 'warn');
}
```

这样程序员的焦虑循环更完整：体力低不敢赶路 → 被迫露营 → SAN 掉 → 更焦虑 → 必须花钱住店。

---

## 8. 存档兼容性

### 8.1 schemaVersion 3 → 4 迁移

```javascript
const SAVE_VERSION = 4;

function migrateSave(data) {
  if (data.version < 3) {
    // 无法从 POI 前版本迁移，直接废弃
    return null;
  }
  if (data.version === 3) {
    // POI 版本 → 生存张力版本
    data.season = data.season || 'spring';
    data.weather = data.weather || 'mild';
    data.materialsDay = data.materialsDay || data.day;
    data.lowQualityStreak = data.lowQualityStreak || 0;
    data.hypeDecayDays = data.hypeDecayDays || 0;
    data.identity = data.identity || 'programmer'; // 旧存档默认程序员
    
    // 路线结构变更：旧存档的 nodeIndex 可能对应新 ROUTE 的不同节点
    // 处理：根据 km 值重新定位到最近的节点
    if (data.km !== undefined) {
      let closestIndex = 0;
      let closestDist = Infinity;
      for (let i = 0; i < ROUTE.length; i++) {
        const dist = Math.abs(ROUTE[i].km - data.km);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      }
      data.nodeIndex = closestIndex;
    }
    
    data.version = 4;
  }
  return data;
}
```

### 8.2 旧存档处理建议

由于本变更涉及事件系统全面重写和路线结构变更，**强烈建议在首次加载时检测到旧版本存档时弹出提示**：

> "游戏内容已大幅更新，旧存档可能体验不完整。建议开始新游戏以体验完整内容。"

提供按钮：【开始新游戏】/【尝试继续旧存档】

---

## 9. UI 设计变更

### 9.1 顶部天气状态栏

在现有 header 和 stats 之间插入一行天气信息：

```html
<div id="weather-bar">
  🌧️ 暴雨 <span class="weather-sep">|</span>
  <span class="weather-buff danger">体力+30%</span>
  <span class="weather-sep">|</span>
  <span class="weather-buff success">素材×1.5</span>
</div>
```

样式：
- 背景：`#0d0d14`
- 字体：12px，muted 色
- Buff 正常：accent 色
- Buff 危险（+30%~+49%）：warn 色（#ffaa00）
- Buff 致命（+50%+）：danger 色（#ff3333）

### 9.2 开局季节选择界面

在角色选择之后，增加季节选择卡片：

```
┌─────────────────────────────────────┐
│  选择出发季节                        │
├─────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐            │
│ │  🌸 春季 │ │  ☀️ 夏季 │            │
│ │ 最稳妥   │ │ 高风险   │            │
│ │ 体力×1.0 │ │ 体力×1.3 │            │
│ │ 素材×1.0 │ │ 素材×1.5 │            │
│ └─────────┘ └─────────┘            │
│ ┌─────────┐ ┌─────────┐            │
│ │  🍂 秋季 │ │  ❄️ 冬季 │            │
│ │ 黄金周   │ │ 地狱模式 │            │
│ │ 体力×0.9 │ │ 体力×1.5 │            │
│ │ 住宿×2  │ │ 食物×1.5 │            │
│ └─────────┘ └─────────┘            │
└─────────────────────────────────────┘
```

### 9.3 内容质量分显示

夜间内容产出发布后，在粉丝增长日志之前插入质量分显示：

```
🎬 内容质量评分：72/100 （合格）
```

颜色：
- ≥80：success 色
- 60~79：正常白色
- 40~59：warn 色
- <40：danger 色

---

## 10. 数值平衡验证

### 10.1 程序员春季日常账（无事件）

| 行动 | 体力变化 | 精力变化 | 资金变化 |
|------|---------|---------|---------|
| 上午正常骑行 | -5 | -10 | |
| 下午正常骑行 | -5 | -10 | |
| 午饭休息 | +5 | +10 | -30 |
| 夜间食宿 | | +20+CON×0.3≈+30 | -50 |
| 夜间睡眠恢复 | +(4+35×0.05)×1.0≈+6 | | |
| **日净变化** | **+1** | **+20** | **-80** |

→ 春季程序员日常是**微盈利**，主要靠事件制造危机。日常净消耗资金 ¥80/天，资金压力在长线后期才会显现。

### 10.2 程序员冬季日常账（无事件）

| 行动 | 体力变化 |
|------|---------|
| 上午正常骑行（×1.5） | -8 |
| 下午正常骑行（×1.5） | -8 |
| 午饭休息 | +5 |
| 夜间恢复（×0.6 露营） | +4 |
| 程序员露营 SAN 惩罚 | - |
| **日净变化** | **-7** |

→ 冬季程序员如果全程露营、无补给，**约 5 天死亡**。必须在 town/outpost 花钱住宿恢复。

### 10.3 狠活老铁春季日常账

| 行动 | 体力变化 |
|------|---------|
| 上午拼命赶路 | -10 |
| 下午拼命赶路 | -10 |
| 午饭（可能不吃省钱） | 0 |
| 夜间恢复 | +9 |
| **日净变化** | **-11** |

→ 老铁拼命赶路也很伤，但因为 CON=90，有 8 天缓冲期。而且老铁适合走直播路线，晚上能回血变现。

### 10.4 内容质量验证

**程序员剪视频**：
- 基础分 = 50 + 85 = 135
- 素材=0 时：135 > 60，**即使没素材也不会翻车**
- 素材=5 时：135 + 10 = 145，远超及格线
- 这符合"程序员走精品视频路线"的人设

**老铁剪视频**：
- 基础分 = 50 + 30 = 80
- 素材=0 时：80 > 60，刚好及格
- 素材<0 时不可能（没有负素材）
- 但老铁不会走视频路线，走直播：基础分 = 50 + 80 = 130，天然适合

**过气 Debuff 验证**：
- 程序员连续 2 天素材=0 且选了视频：135 × 0.7 = 94.5，仍 > 60
- 这意味着程序员很难触发过气，符合"精品路线容错高"
- 老铁连续 2 天素材=0 且硬剪视频：80 × 0.7 = 56，触发低效
- 老铁连续 2 天素材=0 且硬发图文：基础分 = 50 + 10 = 60，×0.7 = 42，触发翻车
- 这倒逼老铁必须去冒险攒素材或走直播

数值基本自洽。
