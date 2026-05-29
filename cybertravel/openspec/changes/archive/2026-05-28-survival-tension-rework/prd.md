# PRD: CyberTravel 生存张力重构

## Problem Statement

当前 MVP 的核心循环无法传达设计文档中设想的"生存线与流量线的反复撕扯"。具体表现为：

1. **生存压力不足**：程序员角色（CON=35）正常骑行一天体力净变化约为 +1，只要不触发极端事件就能无限苟活。生存线没有形成"每天都在为活着焦虑"的张力。
2. **流量压力缺失**：玩家选择"稳妥骑行+随便发内容"可以平安抵达终点，但不会有任何负面后果。没有"不进则退"的被动压力，也没有"冒险爆红"的主动诱惑。
3. **事件选择缺乏张力**：当前事件选项收益与风险不对等，冒险选项的收益不够诱人，玩家缺乏主动选择危险操作的动力。
4. **空间感知弱**：路线只有 8 个抽象节点，玩家无法感知自己在川藏线上的真实位置，也缺乏中间补给的策略深度。

## Solution

通过重构事件系统、引入四季天气系统、扩展路线节点密度、建立内容质量衰减机制，将核心矛盾从"事件抽奖暴毙"转变为**"苟活能保命但流量会死，冒险能爆红但肉体可能会死"的持续博弈**。

关键改动包括：
- 每个事件提供"安全稳过 / 冒险搏命 / 黑红整活"三种明确分叉
- 开局选择季节，四季有完全不同的生存节奏和数值环境
- 每日天气晨间播报，全天施加全局 Buff/Debuff
- 路线从 8 节点扩展到 22 节点，引入 town（简化城市）和 outpost（路边驿站）提供中间补给
- 夜间内容产出引入 60 分硬门槛，低于及格线掉粉+掉 SAN，连续不及格触发"过气"Debuff
- 素材保质期 3 天，过期清零，逼迫玩家规划"攒素材→爆发产出"的节奏

## User Stories

1. As a player, I want to choose a starting season, so that each playthrough feels fundamentally different in pacing and survival pressure.
2. As a player, I want to see a daily weather briefing each morning, so that I can make informed decisions about whether to play safe or push hard today.
3. As a player, I want every random event to offer a "safe but boring" option and a "risky but rewarding" option, so that I feel the tension between survival and virality.
4. As a player, I want some events to offer a "black-red" (morally dubious) option, so that I can choose short-term viral success at the cost of hidden Sin.
5. As a player, I want to know exactly how much my content scored each night, so that I understand why my fans are growing or leaving.
6. As a player, I want my accumulated materials to expire after a few days, so that I am pressured to keep adventuring for fresh content instead of hoarding.
7. As a player, I want to encounter small towns and roadside outposts between major cities, so that I have a chance to survive long wilderness stretches (especially in winter).
8. As a player choosing the Programmer identity, I want my fragility in the wilderness to be mechanically meaningful, so that my high starting funds feel like they have a purpose (buying safety).
9. As a player choosing the Laotie identity, I want my physical toughness to matter and my poverty to force hard choices, so that my "black-red" trait feels like a genuine lifeline.
10. As a player playing in winter, I want the game to feel like a genuine struggle where every outpost is a lifeline, so that reaching Lhasa feels like a real achievement.
11. As a player, I want weather effects to stack multiplicatively with season effects, so that a winter blizzard feels truly terrifying.
12. As a player, I want to see weather information in the top status bar and in the morning narrative log, so that I never miss the day's conditions.
13. As a player, I want "black-red" options to be clearly marked with a skull icon, so that I understand I am making a morally compromised choice.
14. As a player, I want "adventure" options to be marked with a lightning bolt, so that I can quickly identify the high-risk path.
15. As a player, I want to see material freshness indicators (green/yellow/red) during the night content phase, so that I know how urgent it is to use them.
16. As a player, I want the game to warn me when my old save is incompatible with the new version, so that I can choose to start fresh or attempt migration.
17. As a player, I want the Programmer's wilderness SAN penalty to be narratively framed ("脆皮现充" trait), so that it feels like character flavor rather than arbitrary difficulty.
18. As a player, I want outposts to charge premium prices for emergency supplies, so that the choice between "pay more now" and "gamble on reaching the next city" is meaningful.
19. As a player, I want wild POIs like mountain passes to offer huge material rewards if I stop to film, so that I am tempted to spend time and energy even when I am low on resources.
20. As a player, I want the "hype decay" debuff to be clearly communicated when it triggers, so that I know I need to change my strategy.

## Implementation Decisions

### Modules

1. **SeasonEngine** (deep module)
   - Encapsulates all season-related parameter lookup and effect application.
   - Interface: `getSeasonParams(season)`, `applySeasonEffect(baseValue, effectType, season)`
   - Pure data mapping — no DOM, no randomness, no side effects.

2. **WeatherEngine** (deep module)
   - Encapsulates daily weather roll, effect lookup, and narrative text generation.
   - Interface: `rollDailyWeather(season)`, `getWeatherEffects(weather)`, `getWeatherNarrative(weather)`
   - Season drives the probability pool; weather drives the daily multipliers.

3. **ContentQualitySystem** (deep module)
   - Encapsulates content quality scoring, pass/fail thresholds, hype decay tracking, and material expiry.
   - Interface:
     - `calculateQuality(state, contentType) → { score, grade, fanMultipliers }`
     - `checkMaterialExpiry(state) → { expired, remaining }`
     - `recordQualityResult(state, quality) → void` (updates streaks and debuffs)
   - All scoring logic lives here so it can be unit tested against arbitrary state snapshots.

4. **EventEngine** (extended)
   - Existing module gains support for:
     - Choice `type` metadata (`safe` | `adventure` | `blackred`)
     - Conditional choices (e.g. `weather_has_rain` gates)
     - Dynamic `{weather_text}` template injection into event narrative
   - No change to core choice execution flow; only the event *configuration* becomes richer.

5. **GameState** (extended)
   - New fields: `season`, `weather`, `weatherText`, `materialsDay`, `lowQualityStreak`, `hypeDecayDays`, `identity`
   - Save/load migration path: schemaVersion 3 → 4. Old saves are re-located by `km` to the new 22-node route.

6. **RouteData** (configuration)
   - 22-node route definition with four node types: `city`, `town`, `outpost`, `wild_poi`
   - `town`: basic shop + one-tier accommodation
   - `outpost`: emergency shop (prices ×1.2–×1.5), optional shed lodging (recovery penalties)
   - `wild_poi`: no services, but large material rewards for stopping to film

7. **UI/Renderer layer**
   - Weather bar inserted between header and stats panel
   - Season selection cards added to the opening flow (after route + identity)
   - Quality score overlay after nightly publish
   - Material freshness indicators (🟢🟡🔴) during night content selection
   - Choice button prefixes: 🛡️ safe / ⚡ adventure / 💀 black-red
   - Old-save incompatibility prompt on load

### Key Design Ratios

- **Adventure vs. safe reward ratio**: adventure options yield roughly 3× the material/fan gain of safe options, at a cost of 2–3× the physical resource drain.
- **Black-red vs. adventure reward ratio**: black-red options yield roughly 5× the fan gain, at the cost of Sin +10–15 and potential weak-signal backlash.
- **Winter Programmer daily CON drain**: approximately −7/day if camping without lodging, giving ~5 days of survival without intervention. This forces cash spending on accommodation or outpost resupply.
- **Content quality passing threshold**: 60 points. Programmer video baseline (INT=85) = 135, so even with zero materials they pass comfortably. Laotie video baseline (INT=30) = 80, still passes but enters "hype decay" danger zone quickly.

### Weather Stacking Formula

```
actualStaminaCost = baseCost × season.staminaMult × weather.staminaMult
actualMaterialBonus = baseBonus × season.materialMult × weather.materialMult
```

Example: Winter (×1.5) + Blizzard (×1.5) = stamina cost ×2.25.

### Material Expiry

- `materialsDay` records the in-game day when the current material pool was last refreshed.
- During nightly settlement: if `day - materialsDay >= 3`, the entire pool expires.
- New material acquisition *overwrites* the pool and resets the day stamp (MVP uses a unified pool; no material types).

### Save Migration

- Old saves (v3) are detected on load.
- A modal prompts the player: "Game content has been significantly updated. Old saves may be incomplete. We recommend starting a new game."
- Two buttons: [Start New Game] / [Attempt to Continue]
- If continuing: `km` is used to find the closest new node by distance; new fields receive sensible defaults.

## Testing Decisions

### What Makes a Good Test

- Tests should verify *external behavior* (given a state and inputs, what outputs/fan changes/decisions occur), not internal implementation details like DOM manipulation or CSS class names.
- Pure calculation modules (SeasonEngine, WeatherEngine, ContentQualitySystem) are the highest-value test targets because they contain the most complex conditional logic and are easiest to isolate.

### Modules to Test

1. **SeasonEngine**
   - Verify each season returns the correct parameter set.
   - Verify stamina/material multipliers apply correctly.

2. **WeatherEngine**
   - Verify weather generation respects season-specific frequency (e.g. summer should trigger weather more often than autumn).
   - Verify each weather type returns correct effect values.

3. **ContentQualitySystem**
   - Verify quality score calculation with various state combinations (high INT + many materials, low INT + zero materials, hype decay active, fresh material bonus).
   - Verify pass/fail/inefficient/bust thresholds at boundaries (79→80, 59→60, 39→40).
   - Verify material expiry triggers exactly at 3-day boundary.
   - Verify hype decay debuff applies for exactly 3 days after triggering.

4. **EventEngine (configuration validation)**
   - Verify every major event has at least one `safe` and one `adventure` choice.
   - Verify black-red choices are present only on appropriate events.
   - Verify conditional choices (weather-gated) reference valid weather flags.

### Prior Art

- The existing codebase has no unit tests (single-file HTML MVP).
- Tests for the new deep modules can be written as isolated JavaScript files using a lightweight assertion helper (e.g. `console.assert` or a minimal `test()` runner), kept separate from the HTML game file.

## Out of Scope

- Multiplayer or social features
- Vehicle degradation and breakdown decision trees (full tree, not the current simple flat-tire event)
- Logistics / online shopping system with delivery lag
- Full Sin justice-strike mechanic (weak signals only, no enforcement endings beyond the existing Sin≥80 check)
- Typed material pools (photo vs. video vs. live). MVP keeps a unified numeric material pool.
- Dynamic platform algorithm trends (e.g. "打击虚假摆拍风波" 3-day trends)
- NPC dialogue system
- WeChat Mini Program migration
- Shareable ending poster generation

## Further Notes

- The 22-node route expansion increases expected long-route playtime from 30–60 minutes to 60–90 minutes. The short route remains at 10–15 minutes.
- The Programmer's "脆皮现充" trait is finally mechanized: wilderness camping inflicts an extra SAN −8 per night. This creates a cash-to-SAN conversion loop: low CON → must rest more → must camp or pay for lodging → camping hurts SAN → paying for lodging drains cash. The Programmer's ¥25,000 starting fund is now a genuine survival resource rather than a convenience.
- The Laotie's Sin-halving trait becomes more valuable because the new black-red options are significantly more tempting (larger fan rewards). The trait is no longer marginal; it is a core enabler of a high-risk playstyle.
- Weather narrative text should be flavor-rich but brief. The top bar conveys mechanics; the log conveys mood.
- The "hype decay" debuff is intentionally visible and narratively framed (e.g. "评论区开始刷'江郎才尽'..."). Players should never wonder why their numbers dropped.
