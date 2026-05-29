# QrcSite — 领域上下文

## 项目定位

个人网站主页 + CyberTravel 游戏部署入口。静态站点，GitHub Pages 托管。

## 核心领域语言

| 术语 | 含义 |
|------|------|
| **CyberTravel** | 骑行网红模拟器 HTML5 游戏，部署在 `/cybertravel/` |
| **OpenSpec** | 配置驱动的变更管理流程 |
| **MVP** | 单文件 HTML5 游戏，最小可玩版本 |

## 项目结构

```
qrcsite/
├── index.html          # 主页
├── cybertravel/        # 游戏目录
│   ├── index.html      # 游戏 DOM 容器
│   ├── style.css       # 游戏样式
│   ├── js/             # 游戏逻辑（ES Module）
│   │   ├── config.js   # 配置数据（路线/事件/物品/天气等）
│   │   ├── systems.js  # 逻辑系统（时间/事件/内容/平台/黑红）
│   │   ├── state.js    # 状态机 + 存档系统
│   │   ├── renderer.js # UI 渲染器
│   │   └── game.js     # 游戏主控 + 入口
│   ├── openspec/       # 变更管理
│   └── doc/            # 设计文档
├── js/                 # 网站 JS
└── dev-blog/           # 开发博客
```

## 架构约束

- 纯静态站点，无后端
- GitHub Pages 自动部署
- 游戏数据通过 Git 版本管理

## 决策记录

见 `docs/adr/` 目录（待创建）。
