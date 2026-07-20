# QRC-Eye 实验笔记（Blog）系统设计

日期：2026-07-19
状态：已获用户批准

## 背景与目标

站点已有 `dev-blog/` 栏目（列表页空状态 + 文章模板，已完成 Y2K 换皮），但没有写作/发布工作流——发文章需要手写 HTML。本设计建立一套「Markdown 写作 + 本地脚本生成静态页」的 blog 系统，并给 blog 在主页加入口。

## 已对齐的决策

| 维度 | 决策 |
|------|------|
| 写作工作流 | Markdown 源文件 + 本地 Python 生成脚本，仓库产物保持纯静态 |
| 主页入口 | 导航栏加「笔记」链接 + 主页「最新笔记」区块（最近 3 篇） |
| 功能范围 | RSS 订阅、代码高亮、标签/分类、文章目录 TOC（全选） |
| URL 结构 | 栏目录保留 `dev-blog/`，文章页 `dev-blog/posts/<slug>.html` |
| 视觉 | 沿用现有 Y2K 主题，零新视觉设计，仅补充必要组件样式 |

## 目录结构

```
dev-blog/
├── index.html            # 列表页（生成器维护，不再手写）
├── posts/                # 生成的文章 HTML（<slug>.html）
├── feed.xml              # RSS 2.0（生成器产出）
└── src/                  # Markdown 源文件（front matter + 正文）
tools/
└── build-blog.py         # 本地生成脚本（Python 3 标准库 + markdown + pygments）
```

## 工作流

1. 在 `dev-blog/src/` 新建 `<slug>.md`（slug 为英文小写连字符）
2. 本地运行 `python3 tools/build-blog.py`（使用项目 `.venv/`，见「依赖」）
3. 脚本重新生成：所有文章页、列表页、`feed.xml`、主页「最新笔记」区块
4. `git add -A && git commit` 提交产物，GitHub Pages 直接部署静态文件

## Front matter 约定

```markdown
---
title: 文章标题（必填）
date: 2026-07-19（必填，ISO 日期）
tags: [game-design, firework-master]（可选，英文小写连字符）
description: 一句话摘要（必填，列表页/RSS/og 用）
---
```

缺必填字段、日期格式错误、slug 重复时脚本报错并非零退出，不产出半成品。

## 生成器实现要点

- **依赖**：`markdown`、`pygments` 两个 pip 包，装入项目本地 `.venv/`（隔离环境）；`.venv/` 加入 `.gitignore`；`tools/requirements.txt` 钉版本
- **Markdown 渲染**：Python-Markdown，启用 `extra`、`toc`、`codehilite` 扩展
- **代码高亮**：生成时完成（codehilite + pygments），产出静态 `<span>` 标记，不引入运行时 CDN；theme.css 增加一套 Y2K 配色的 pygments 样式（`.codehilite` 相关类）
- **TOC**：`toc` 扩展自动生成；文章 `<h2>` 数量 ≥ 3 时文章页显示侧边目录，否则不渲染 TOC 区块
- **文章页模板**：基于现有 `dev-blog/post-template.html` 的结构生成，保留 `.prose-y2k`；新增标签徽章（复用 `.badge-led` 风格）与 TOC 区块样式到 theme.css
- **标签**：文章页显示标签徽章；列表页支持按标签筛选（纯 CSS/少量 JS，fx.js 或内联小脚本实现，点击标签过滤卡片）
- **列表页**：按日期倒序生成卡片（标题、日期、标签、摘要）；无文章时保留现有空状态（`.note-empty`）
- **RSS**：`feed.xml`，RSS 2.0，含 title/link/pubDate/description；站点 URL `https://www.qrc-eye.com`
- **主页集成**：导航（桌面 + 移动菜单）加「笔记」链接指向 `dev-blog/`；「项目」与「关于」之间插入「最新笔记」区块，区块内容位于 `<!-- BLOG-LATEST:START -->` / `<!-- BLOG-LATEST:END -->` 注释标记之间，生成器只重写标记区间，主页其余部分保持手写不动；无文章时区块显示一句「笔记还在酝酿」之类的占位文案

## 约束

- 仓库产物保持纯静态：GitHub Pages 零构建；`tools/` 与 `.venv/` 仅为本地工具
- 不引入 npm/node 依赖、不引入运行时高亮库
- 沿用 Y2K 主题与降级逻辑（`prefers-reduced-motion` 等）；中文文案规范与全站一致
- 验证手段不变：`node --check`（JS）、`http.server` + `curl | grep`、生成器自带校验、`python3 tools/build-blog.py` 的幂等性检查（连续跑两次产物一致）

## 验证方式

- 用一篇测试文章完整走一遍「写 md → 生成 → curl 检查文章页/列表页/RSS/主页区块」流程
- 生成器幂等性：连续运行两次，git diff 为空
- 缺字段的坏 md 文件：脚本报错退出
- 浏览器人工目检：文章页排版、代码高亮、TOC、标签筛选、RSS 可订阅
