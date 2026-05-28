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
│   ├── index.html      # 游戏主文件
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
