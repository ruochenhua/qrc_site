# CyberTravelGame OpenSpec

骑行网红模拟器的项目规范与决策文档库。

## 快速导航

### 📋 当前设计（唯一真源）

| 文档 | 内容 |
|------|------|
| [`project-design.md`](project-design.md) | 产品设计文档：四季/天气/路线/事件/质量系统/结局 |
| [`project-architecture.md`](project-architecture.md) | 架构文档：模块划分、数据流、配置层 |
| [`project-roadmap.md`](project-roadmap.md) | 路线图：已完成阶段 + 未来规划 |

### 📜 架构决策（ADRs）

| 文档 | 决策 |
|------|------|
| [ADR-001](decisions/ADR-001-single-file-mvp.md) | 单文件 MVP 架构 |
| [ADR-002](decisions/ADR-002-configuration-driven.md) | 配置驱动设计 |
| [ADR-003](decisions/ADR-003-vanilla-js.md) | 纯原生 JS 无框架 |
| [ADR-004](decisions/ADR-004-platform-algorithms.md) | 三平台差异化算法 |
| [ADR-005](decisions/ADR-005-localstorage-persistence.md) | localStorage 持久化 |
| [adr-index.md](decisions/adr-index.md) | ADR 索引与影响矩阵 |

### 📁 变更历史（已归档）

```
changes/archive/
├── 2026-05-25-mvp-html-implementation/     # Phase 0-R1: MVP 基础循环
├── 2026-05-27-mvp-content-platform-system/ # 内容产出与平台算法
├── 2026-05-27-mvp-core-loop-verification/  # 核心循环验证
├── 2026-05-27-mvp-event-ending-system/     # 事件与结局系统
├── 2026-05-27-mvp-time-driven-system/      # 时间驱动系统
├── 2026-05-28-poi-system/                  # 兴趣点系统（城市/住宿/景点）
└── 2026-05-28-survival-tension-rework/     # Phase 0-R2: 生存张力重构
    ├── proposal.md
    ├── design.md       ← 最详细的变更设计（22 任务 + 9 验收用例）
    ├── tasks.md
    └── prd.md          ← GitHub Issue #X
```

### 🗂️ 变更目录结构约定

```
changes/
├── archive/              # 已完成的变更提案（按日期归档）
│   └── YYYY-MM-DD-change-name/
│       ├── proposal.md   # 动机、范围、用户故事
│       ├── design.md     # 详细设计：数值、算法、UI
│       ├── tasks.md      # 任务清单与验收用例
│       └── prd.md        # 如发布到 GitHub Issues
└── (无活跃目录 = 当前无进行中变更)
```

## 项目上下文

- **代码位置**: `cybertravel/index.html`（单文件 ~2900 行）
- **运行方式**: 浏览器直接打开 `index.html`
- **存档**: localStorage, `cybertravel_save_v1`, schemaVersion 4
- **当前版本**: MVP Phase 0-R2
