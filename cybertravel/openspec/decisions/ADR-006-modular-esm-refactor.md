# ADR-006: 模块化 ESM 重构

## 状态
accepted

## 背景
ADR-001 决定 MVP 采用单 HTML 文件架构。经过多个迭代（POI 系统、生存张力系统、内容平台系统），`cybertravel/index.html` 增长至近 2900 行，包含完整的 CSS、DOM 结构、配置数据、游戏逻辑。这带来以下问题：

- AI 修改时代码定位困难，diff 面积大，容易误改无关模块
- 单一文件承载过多职责（配置、渲染、状态、算法、主控），认知负荷高
- 无法利用 ES Module 的显式依赖管理，全局命名空间污染风险

## 决策
将 `cybertravel/index.html` 拆分为按功能模组组织的 ES Module 文件：

```
cybertravel/
├── index.html          # 纯 DOM 容器
├── style.css           # 所有样式
└── js/
    ├── config.js       # 配置数据（路线/事件/物品/结局/天气等）
    ├── systems.js      # 纯逻辑系统（时间/事件/内容/平台/黑红）
    ├── state.js        # 状态机 + 存档系统
    ├── renderer.js     # UI 渲染器（回调注入解耦）
    └── game.js         # 游戏主控 + 入口
```

约束：
- **零构建工具**：浏览器原生 `type="module"`，`import/export` 直接运行
- **单向依赖**：`game.js → renderer.js → state.js → config.js`，无循环依赖
- **回调注入**：Renderer 通过构造函数/方法参数接收回调，不直接引用 Game 实例

## 后果

### 正面影响
- 每个文件职责单一，AI 定位修改范围更精确
- ES Module 显式依赖关系，改动时边界清晰
- 为未来迁移到打包工具（Vite 等）铺平道路
- 零构建成本，浏览器直接打开即可运行

### 负面影响
- 首次加载增加 5 个 HTTP 请求（本地/离线不影响，GitHub Pages 有影响但可接受）
- ES Module 的 `import` 路径在本地文件协议（`file://`）下可能遇到 CORS 限制，建议通过本地服务器访问
- 增加了约 400 行 import/export 样板代码

### 缓解措施
- 保持零外部依赖，所有模块内联在项目中
- 若未来部署到生产环境，可无缝迁移到 Vite/Rollup 打包为单文件，无需改动源码结构
