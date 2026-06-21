# 烟花大师 — 后续规划文档

> 用途：记录已完成工作、待做任务和优先级，作为后续开发/验收的参考。
> 最后更新：2026-06-18

---

## 1. 项目当前阶段

美术与交互一致性扫尾已完成；P0 核心体验项已完成；P1 高优先级项（赛事列表状态、Toast、数字动画）已完成；代码结构优化（三个切片）已完成。当前三个交互与核心循环重构切片已全部完成，版本测试与 lint 均通过（197 个用例）。

主要技术栈：HTML5 / ES Modules / Canvas 2D / vanilla JS；无外部美术资源，全部代码绘制。

---

## 2. 已完成的 P0 项

| # | 任务 | 状态 | 关键文件 |
|---|------|------|----------|
| 1 | Build 页预算进度条（≤70% 绿 / 70-100% 黄 / >100% 红） | ✅ | `index.html`, `js/views/build.js`, `css/views/build-page.css` |
| 2 | Build 页实时预计评分 | ✅ | `js/views/build.js`, `js/systems.js` |
| 3 | 全局顶部状态栏（Events / Build / Result / Lab） | ✅ | `index.html`, `js/ui-utils.js`, 各视图文件 |
| 4 | 配方实验室改为组件商店（已拥有 / 可购买 / 未解锁） | ✅ | `js/views/lab.js`, `js/config.js`, `js/state.js`, `js/systems.js`, `css/views/lab.css` |
| 5 | Hub 主线进度显示 | ✅ | `js/views/hub.js`, `index.html`, `css/views/hub.css` |
| 6 | 结算页偏好命中明细 | ✅ | `js/systems.js`, `js/views/perform.js` |
| — | 修复实验室研发按钮入口 | ✅ | `js/views/lab.js`, `js/config.js` |

### 2.1 已同步的设计文档
- `CONTEXT.md` 已补充：全局状态栏、预算进度条、实时预计评分、实验室分组、Hub 主线进度、结算偏好命中、赛事列表状态、全局 Toast、数字滚动动画、自动晋升、JSDoc 类型规范、CSS 架构拆分的设计说明。
- `mvp-design.md` 已确认 7.2 自动晋升规则。
- `ui-ux-design.md` 已移除 Hub 手动晋升按钮，改为自动晋升 + Toast 提示。

---

## 3. 已完成的 P1 项

| # | 任务 | 状态 | 关键文件 |
|---|------|------|----------|
| 7 | 赛事列表状态区分（已完成置灰 / 锁定+原因 / 可重复标记） | ✅ | `js/views/events.js`, `js/systems.js`, `css/views/events.css` |
| 9 | 通用 Toast 提示（替代全部 `alert()`） | ✅ | `js/ui-utils.js`, `css/components/toast.css`, 各视图文件 |
| 10 | 数字滚动动画（资金 / 名气 / 成本 / 得分） | ✅ | `js/ui-utils.js`, `js/views/hub.js`, `js/views/build.js`, `js/views/perform.js` |

---

## 4. 下一步：剩余 P1 建议项

> 完成后游戏体验会明显提升，建议按顺序推进。

| # | 任务 | 说明 | 预计涉及文件 |
|---|------|------|--------------|
| 8 | 表演进度提示 | 表演界面显示「第 X / Y 发」或进度条 | `js/views/perform.js`, `js/renderer.js`, `css/views/perform.css` |
| 11 | Build 页禁用原因提示 | 预算超支、弹数超限、未选择时，禁用按钮旁显示具体原因 | `js/views/build.js`, `css/views/build-page.css` |
| 12 | 清空节目单二次确认 | 防止误触清空按钮 | `js/views/build.js` |
| 13 | 组件 hover/focus tooltip | 显示组件完整描述、解锁条件、容量影响 | `js/views/build.js`, `css/views/build-assembly.css` |
| 14 | 结局页庆祝动画与「再玩一次」 | 到达 master 后显示结局页，提供重开按钮 | `js/views/result.js`（或新建 `js/views/ending.js`）, `index.html`, `css/views/ending.css` |
| 15 | 容量条颜色分级 | <70% 绿 / 70-95% 黄 / >95% 红，与预算条规则统一 | `css/views/build-page.css`, `js/views/build.js` |

---

## 5. 代码结构优化（已完成）

> 基于代码结构诊断，将样式与 UI 逻辑拆分为可维护的模块，采用垂直切片 + TDD。

| 切片 | 内容 | 状态 | 关键文件 |
|---|------|------|----------|
| 1 | 为 `js/systems.js` 等核心模块补充 JSDoc `@typedef` 与函数签名；新增类型回归测试 | ✅ | `js/systems.js`, `js/state.js`, `js/app-state.js`, `test/type-shapes.test.js` |
| 2 | 将 `style.css` 按视图/组件拆分为 `css/base.css`、`css/views/*.css`、`css/components/*.css`，保留选择器级联顺序并新增 CSS 回归测试 | ✅ | `css/**`, `index.html`, `test/css-selectors.test.js`；原 `style.css` 已删除 |
| 3 | 提取通用 UI 组件工厂函数：`createCard`、`createButton`、`createBadge`、`createPill`；重构 `events.js` / `lab.js` 重复 DOM 构造 | ✅ | `js/ui/components/*.js`, `js/views/events.js`, `js/views/lab.js`, `test/ui-components.test.js` |

### 交互与核心循环重构（进行中）

> 基于玩法需求，将配方实验室从「出售完整蓝图」改为「出售材料」，并强化活动/赛事差异。

| 切片 | 内容 | 状态 | 关键文件 |
|---|------|------|----------|
| 1 | 开始 & Build 页全屏适配，减少空白与滚动 | ✅ | `css/views/start.css`, `css/views/build-page.css`, `index.html`, `test/start-build-layout.test.js` |
| 2 | 组件解锁商店：数据（`researchCost`）、状态（`ownedComponents`）、系统（`researchComponent`）、实验室/BUILD UI 锁定 | ✅ | `js/config.js`, `js/state.js`, `js/systems.js`, `js/views/lab.js`, `js/views/build.js`, `test/component-unlock.test.js`, `test/build-ui-ownership.test.js` |
| 3 | 活动与赛事差异化：活动重资金、可大量发射；赛事多轮淘汰赛，按名次给名气 | ✅ | `js/systems.js`, `js/views/perform.js`, `js/config.js`, `css/views/result.css`, `test/competition-elimination.test.js` |

---

## 6. 可选：P2  polish 项

> 锦上添花，可放在功能完整后再做。

| # | 任务 | 说明 |
|---|------|------|
| 16 | 蓝图默认命名 | 自动生成如「牡丹改 #1」 |
| 17 | 每类材料快速清空 | 数量输入面板一键归零 |
| 18 | 蓝图槽位上限校验 | 当前上限 20，需显式提示 |
| 20 | 同步 `mvp-design.md` | 当前实际数值（资金、等级阈值、配方作为示例蓝图等）与设计稿不一致，需择一更新 |
| 21 | Build 页 720px 底部裁剪 | 垂直空间布局微调 |

---

## 7. 已确认的决策

1. **晋升方式**：自动晋升。满足条件后系统自动晋升，并以 Toast 提示玩家。
2. **配方定位**：配方实验室不再出售完整蓝图，改为出售烟花材料；系统配方退化为「示例蓝图」，仅作为快速加载参考。
3. **下一批优先级**：推进 **切片 3（活动与赛事差异化）**，实现活动重资金、赛事多轮淘汰赛按名次给名气，并形成「活动赚钱 → 赛事赚名 → 解锁材料 → 更强节目单」的循环。

---

## 8. 技术约束与注意点

- 浏览器需通过 `npx serve` 或 `python -m http.server` 打开，不能直接 `file://` 访问（ES Modules 限制）。
- 静态截图无法展示动画，需在浏览器中交互验证动效。
- 所有新 UI 应继续沿用现有设计系统：`--surface-*`、`--text-body`、`--accent-light`、`.pill`、`.card-list` 等。
- 新增动画必须同步提供 `prefers-reduced-motion` 降级。

---

## 9. 验收标准

每项任务完成后应满足：

1. `npm run lint` 无错误。
2. `npm test` 全部通过。
3. 相关设计文档（`CONTEXT.md`、`docs/roadmap.md`）已同步。
4. 在本地服务环境下通过浏览器目视检查。
