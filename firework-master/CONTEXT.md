# 烟花大师 领域词汇表

## 舞台后台隐喻（Stage & Backstage Metaphor）

把游戏的各个界面统一在同一个叙事空间下：玩家扮演的是一位正在成长中的烟花师，所有菜单都不是抽象的管理面板，而是烟花师实际身处的场所。

- **开始画面**：剧场/舞台入口，烟花师尚未登场。
- **Hub（主界面）**：后台准备间 / 工坊工作台，用于查看状态与决定下一步行动。视觉改进优先聚焦此界面。
- **赛事列表（Events）**：门外的赛事布告栏 / 镇中心告示板。
- **编队界面（Build）**：组装台与配方架，真正在制作今晚要放的烟花。
- **表演界面（Perform）**：正式登台，玩家作品在真实天空下绽放。表演场景采用分层空间：远景（天空/星星/事件光晕）、中景（云层 + 事件专属远景元素）、近景（地面剪影）。事件差异化优先于大气透视，但远景元素先用 3-5 个简单场景原型（乡村/城市/公园/体育场/湖畔）的几何剪影实现，不过度追求细节。

## 表演镜头（Performance Camera）

表演采用“按整场最高高度静态取景”的策略，爆炸中心对齐屏幕焦点，地面始终作为底部参照带：

- **低整场**（最高为 `low`）：地面占比约 33%，爆炸焦点在屏幕上方约 36%，烟花不会贴地。
- **中整场**（最高为 `mid`）：地面占比约 30%，爆炸焦点约 30%。
- **高整场**（包含 `high`/`ultra`）：地面占比约 28%，爆炸焦点约 22%，天空占比明显增大。
- **混合高度**：按最高 shell 决定统一取景框，低烟花在下、高烟花在上，保持空间纵深感。
- 镜头切换使用平滑过渡，避免硬切。

所有视觉改进都应围绕这一隐喻展开，避免不同界面出现风格断裂。

## 开始画面（Start Screen）

开始画面是玩家进入游戏的“舞台入口”。这里的烟花是“远处正在进行的彩排/上一场演出的余韵”，用柔和的随机烟花点缀暗色夜空，营造氛围而不抢主标题和按钮的视觉焦点。

- 烟花在背景层循环播放，标题和按钮位于前景层。
- 标题与按钮区域可通过重新排版（如上下分布、加大间距）减少与烟花视觉重叠。
- 烟花变化频率要低、规模要小，避免干扰文字可读性。


## 视觉设计系统（Visual Design System）

所有界面统一使用以下设计系统，保持“后台工坊 / 舞台”叙事空间的一致性。

### 色彩

| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` | `#0b0d14` | 页面背景 |
| `--surface-1` | `#131625` | 深面板背景 |
| `--surface-2` | `#1a1e30` | 面板/卡片背景 |
| `--surface-3` | `#1f2438` | 组件、列表项背景 |
| `--border` | `#2a3048` | 边框、分隔线 |
| `--text` | `#ffffff` | 标题、重要数字 |
| `--text-body` | `#c4cadd` | 正文 |
| `--muted` | `#a0a8c0` | 次要说明 |
| `--accent` | `#ffaa33` | 主强调色（金币/行动按钮/重要提示） |
| `--accent-light` | `#ffeebb` | 标题、高亮文字 |
| `--accent2` | `#66ccff` | 副强调色（信息、链接、科技） |
| `--success` | `#55cc88` | 成功、已掌握、正向反馈 |
| `--danger` | `#ff5555` | 危险、超额、删除 |

### 分类色（Build / Lab）

| 分类 | 色值 | 用途 |
|------|------|------|
| 火药 | `#ffaa33` | tab、组件卡片顶边、选中发光 |
| 壳体 | `#8a9bb8` | tab、组件卡片顶边 |
| 颜色剂 | `#ff5555` | tab、组件卡片顶边 |
| 引线 | `#ffcc33` | tab、组件卡片顶边 |
| 特效剂 | `#cc77ff` | tab、组件卡片顶边 |

### 赛事类型色（Events）

| 类型 | 色值 |
|------|------|
| 比赛 competition | `#aa77ff` |
| 活动 activity | `#66ccff` |
| 重复 repeatable | `#aaaaaa` |
| 兜底 fallback | `#55cc88` |

### 卡片通用样式

所有卡片使用统一的底层样式，再通过色条/顶边/图标来区分类型：

```css
.card-base {
  background: linear-gradient(145deg, #1c2034 0%, #131625 100%);
  border: 1px solid #2a3048;
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04);
  transition: transform 0.12s, box-shadow 0.12s;
}
.card-base:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 26px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
}
```

- **赛事卡片**：左侧 8px 色条 + 发光；左侧大图标徽章；右侧票根操作区用虚线分隔。
- **示例配方卡片**：左侧圆形发光色板；右上角状态徽章（可用绿 / 未拥有橙）。
- **组件卡片**：顶部 3px 分类色边；未拥有时显示 🔒；选中时同色系发光边框 + 右上角 ✓。
- **奖励卡片**：竖向图标/标签/数值三段式，圆角 14px。

### 图标使用原则

- 同一卡片只保留**一个**大图标，避免重复。
- 小图标仅用于语义补充（如 chip 中），不与卡片主图标重复。
- 优先使用 CSS `::before` 或 Unicode 符号，不引入外部图片资源。

### 排版

- 标题：18–22px，白色，`#ffeebb` 用于木质/奖牌标题。
- 正文：13–14px，`#c4cadd`。
- 说明/次要：12px，`#a0a8c0`。
- 标签/chip：11px，圆角 10–12px。

### 按钮

- Primary：`#ffaa33` 背景，`#0b0d14` 文字，圆角 8–10px，hover 加亮。
- Secondary：透明/深色背景，`#c4cadd` 文字，hover 变亮。

### 全局顶部状态栏

- Events / Build / Result / Lab 共享同一样式的顶部状态栏（`.global-bar`）。
- 左侧显示品牌名，右侧显示等级、资金、名气、下级所需名气。
- 状态栏随玩家资金/名气变化实时刷新。

### 预算进度条

- Build 页「当前节目单」面板内显示预算进度条（`.budget-row`）。
- 已用预算含节目单总成本 + 报名费；与赛事 `budget` 对比。
- 颜色规则：
  - ≤70%：绿色（`--success`）
  - 70%–100%：黄色（`--warn`）
  - >100%：红色（`--danger`）
- 无预算赛事显示「已用 …（无限制）」。

### 实时预计评分

- Build 页在节目单变化时实时调用 `calculateScore`，显示「预计得分：X 分（等级）」。
- 空节目单时显示 `--`，给玩家编队提供即时目标反馈。

### 配方实验室（现为组件商店）

- 实验室不再出售完整配方蓝图，改为按分类出售烟花材料（火药、壳体、颜色剂、引线、特效剂）。
- 每个组件按状态分三组：**已拥有 / 可购买 / 未解锁**。
- 组件先通过 `unlockFame` 阈值获得「可见性」，再用 `researchCost` 资金购买；购买后获得所有权。
- 可购买组件显示购买价格，资金不足时按钮禁用。
- 未解锁组件显示「需要名气 X」，增强目标感。
- 购买成功后卡片从「可购买」移动到「已拥有」并触发绿色闪光动画。
- 组装台与示例列表中的未拥有材料会显示 🔒，提示玩家去实验室购买。

### Hub 主线进度

- Hub 状态栏下方显示「主线进度：已完成 / 当前等级主线总数」。
- 完成当前等级所有主线赛事且名气达标后，系统自动晋升，并以 Toast 提示玩家。

### 结算偏好命中

- 结算页评分明细增加「偏好命中 X / Y」。
- `calculateScore()` 计算每个事件激活的偏好维度（height/scale/density/duration/complexity/color/effects）。
- 当节目单在该维度上的平均值与事件目标接近（相似度 ≥ 0.5）时计为命中。

### 赛事列表状态

- 赛事卡片按状态区分：可用 / 已完成 / 锁定 / 可重复。
- 已完成主线赛事显示「已完成」徽章并置灰，不可再次选择。
- 锁定赛事显示 🔒 与具体原因（如「需先完成：村口庙会」或「需要等级：熟手」）。
- 可重复赛事在可用状态下额外显示「可重复」提示。
- 高等级赛事仍隐藏，避免提前剧透。

### 代码规范

- 核心数据结构使用 JSDoc `@typedef` 定义，便于 AI 与编辑器推断形状。
- 关键函数（`assembleShell`、`calculateScore`、`validateShow`、`settleEvent` 等）标注参数与返回类型。
- `GameState` 与 `app-state.js` 导出项标注类型，减少全局状态误用。
- 新增结构回归测试：`test/type-shapes.test.js` 检查关键函数返回值字段，`test/css-selectors.test.js` 检查拆分后的 CSS 仍包含核心选择器与变量，`test/ui-components.test.js` 检查 UI 工厂生成正确 DOM。
- 通用 UI 组件通过 `js/ui/components/` 工厂生成，避免各视图重复 `document.createElement` + `className` 代码。

### CSS 架构

样式已按视图/组件拆分为多个文件，按原 `style.css` 的级联顺序在 `index.html` 中加载，保证优先级不变：

- `css/base.css`：变量、重置、布局骨架、通用工具类（`.view`、`.btn`、`.pill` 等）。
- `css/views/*.css`：各视图专有样式（`start`、`hub`、`events`、`build`、`build-assembly`、`build-page`、`perform`、`result`、`ending`、`lab`）。
- `css/components/*.css`：跨视图组件（`modal`、`preview`、`library`、`shared-headers`、`back-buttons`、`toast`）。

新增或调整样式时，优先放到对应视图/组件文件；跨视图复用的类放到 `css/base.css` 或 `css/components/`。修改后需运行 `npm test` 确保 `css-selectors.test.js` 通过。

### UI 组件工厂

通用 DOM 组件统一从 `js/ui/components/index.js` 创建，当前提供四个工厂：

- `createButton({ text, variant='primary', disabled, className, onClick })`：生成 `.btn` 按钮，自动处理禁用与点击事件。
- `createPill({ text, className, dataset })`：生成 `.pill` 标签，用于顶部状态栏、chip 等。
- `createBadge({ text, className, icon })`：生成状态徽章，支持图标前缀。
- `createCard({ className, children, dataset })`：生成卡片容器，支持字符串（转为文本节点）或 Node 子元素。

`js/views/events.js` 与 `js/views/lab.js` 已改用上述工厂生成卡片外壳、状态徽章与操作按钮，后续新增视图应优先复用而非手写 `createElement`/`className`。

### 光效与动效

- 过渡时长统一 0.12–0.15s，由 CSS 变量 `--transition-fast` / `--transition-base` / `--transition-slow` 管理。
- 发光使用 `box-shadow` 或 `filter: drop-shadow()`，颜色取自主色，透明度 20–45%。
- 数字强调（分数、奖励）使用渐变文字 + drop-shadow。
- 卡片悬浮统一上移 3px；列表项悬浮统一上移 2px。
- 视图切换使用淡入 + 轻微下滑（`.view-enter`）。
- Modal 打开/关闭使用淡入 + 缩放（`.modal.open`）。
- 全局 Toast 从屏幕底部居中滑入，支持 `info/success/warning/error` 四种类别，最多同时显示 3 条。
- 预览区专用 Toast 保留为 `.preview-toast`，用于组装台即时反馈。
- 数字变化使用 `animateNumber()` 滚动到目标值，资金/名气变化时附加颜色闪烁强调。
- 节目单增删、结算数字、晋升/首通 banner 均有入场/计数动画。
- 所有动画尊重 `prefers-reduced-motion: reduce`。

### 表演场景（已有规则补充）

- 地面/山体统一使用 `_drawMountainLayer`，通过 cos 波形 + overhang 保证左右自然出屏。
- 远景山脊 `base > 0`，近景山坡 `base < 0`，用多层叠加增加景深。
- 地平线不得出现明显直线或陡崖，优先用远山盖住地平线。
