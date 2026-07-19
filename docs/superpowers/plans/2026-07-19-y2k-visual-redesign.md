# Y2K Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变页面内容、信息结构与文案（含中文）的前提下，把 QRC-Eye 全站视觉升级为 Y2K / 复古未来 · 控制台方案：共享主题包 `assets/y2k/`（手写 CSS 设计令牌 + 组件、动效套件、WebAudio 音效、Three.js 主视觉），主页与 dev-blog 完整换皮，游戏页面仅注入 Y2K 外壳（顶栏 + INSERT COIN 启动画面）。

**Architecture:**

```
assets/y2k/
├── theme.css      # 设计令牌（配色/字体）+ 通用组件 + 主页/dev-blog 布局
├── fx.js          # 动效套件：定制光标+拖尾、故障微交互、滚动动画、视差、启动画面、降级判定
├── sfx.js         # WebAudio 振荡器合成音效（默认静音，右下角开关）
├── hero3d.js      # Three.js Hero 主视觉（仅主页加载，动态 import + 降级）
├── shell.css      # 游戏页面外壳样式（顶栏 + INSERT COIN 启动画面）
└── shell.js       # 游戏页面外壳注入（纯 DOM 创建，零 HTML 侵入）
```

- 主页 `index.html` 弃用 Tailwind CDN 与内联 `<style>`，全部样式来自 `theme.css`；`js/main.js` 被 `fx.js` 吸收后删除。
- Three.js 通过 CDN import map 引入（`three@0.160.0`，jsdelivr），仅主页 Hero 使用；失败时降级为 CSS 铬渐变静态标题。
- 降级判定集中在 `fx.js` 的 `QRC.fx.flags`（`pointer: fine` / `max-width: 768px` / `prefers-reduced-motion`），`hero3d.js` 复用该 flags。
- 游戏页面内部代码一行不动：每个游戏 `index.html` 只加两行（一个 `<link>` + 一个 `<script defer>`），外壳 DOM 全部由 `shell.js` 运行时创建。

**Tech Stack:** 纯静态 HTML/CSS/JS（无构建工具）；Google Fonts（Silkscreen + Space Mono）；Three.js 0.160.0（jsdelivr import map）；WebAudio API；Canvas 2D（星星拖尾）；GitHub Pages 托管。

**已钉死的选型决策**（规格中留「二选一」的项，本计划定案）：

| 项 | 决策 |
|---|---|
| 英文标题像素体 | **Silkscreen**（400/700） |
| 界面等宽体 | **Space Mono**（400/700） |
| Three.js 版本与 CDN | **three@0.160.0**，`https://cdn.jsdelivr.net/npm/three@0.160.0/` |
| 3D 字体 | `helvetiker_bold.typeface.json`（同 CDN examples/fonts） |
| 网格地面实现 | `THREE.GridHelper` + `THREE.Fog`（视觉上等同规格的「线框网格消失于地平线」，比手写 shader 更稳；规格允许的实现细节） |

## Global Constraints

（以下来自已批准规格 `docs/superpowers/specs/2026-07-19-y2k-visual-redesign-design.md`，逐条约束所有任务）

1. **纯静态站点，GitHub Pages 托管**：不得引入构建工具、`package.json`、测试框架或任何 npm 依赖到仓库根目录。
2. **CDN 可用但必须降级**：Google Fonts / Three.js CDN 失败时 try/catch 兜底为静态样式，不白屏、不抛未捕获异常，仅 `console` 警告/错误。
3. **游戏内部代码不改**：`cybertravel/`、`firework-master/`、`kings-field/` 内部的 JS/CSS/DOM 逻辑一行不动，只允许在各游戏 `index.html` 中注入一行 `<link>` 和一行 `<script defer>`。
4. **结构与文案不变**：所有页面信息结构、中文文案、SEO meta 标签保持不变，只换皮。允许的例外：为效果增加的纯装饰容器（如空的 `#hero-3d-stage`、跑马灯条）和为无障碍保留的 visually-hidden 处理。
5. **降级三判定集中在 `fx.js`**：`matchMedia('(pointer: fine)')`（定制光标）、`matchMedia('(max-width: 768px)')`（移动端关 3D/拖尾）、`matchMedia('(prefers-reduced-motion: reduce)')`（关非必要动画）。
6. **错误处理沿用 `handleError` 模式**：`QRC.handleError(error, functionName)` → `console.error`，所有功能模块的入口和异步调用外包 try/catch。
7. **音效默认静音**：右下角开关，用户主动开启；状态持久化到 `localStorage`；满足浏览器自动播放策略（首次开启动作即用户手势，可启动 AudioContext）。
8. **无测试框架**：验证手段为 `node --check`（JS 语法）、`python3 -m http.server` + `curl -s ... | grep`（关键标记存在）、人工目检检查点（每步写明看什么）。
9. **配色 / 字体令牌**：基底 `#0a0c10`、铬渐变 `#e8e8ec → #9a9aa5 → #d5d5dd`、霓虹绿 `#39ff6a`、信号黄 `#ffe14d`、冷蓝 `#7da2ff`，全部以 CSS 变量定义在 `theme.css`，禁止散落硬编码（`shell.css` 为独立文件，允许重复定义同值变量）。

## 命名总表（所有任务必须一致引用）

**JS 全局接口：**

| 名称 | 定义处 | 说明 |
|---|---|---|
| `window.QRC` | `fx.js` / `sfx.js` / `hero3d.js` 各自 defensive 初始化 | 命名空间 |
| `QRC.handleError(error, functionName)` | `fx.js`（`sfx.js`/`hero3d.js` 有相同的 defensive fallback 定义） | 统一错误处理 |
| `QRC.fx.flags` = `{ finePointer, isMobile, reducedMotion }` | `fx.js` | 降级判定唯一来源 |
| `QRC.fx.init()` | `fx.js` | 动效总入口（DOMContentLoaded 自动调用） |
| `QRC.sfx.init()` / `QRC.sfx.play(name)` / `QRC.sfx.setEnabled(bool)` / `QRC.sfx.enabled` | `sfx.js` | 音效；`name` 为 `'hover'` 或 `'click'` |
| `QRC.hero3d.init()` | `hero3d.js` | 3D 主视觉入口（返回 Promise） |
| `toggleMobileMenu()`（全局函数） | `fx.js` | 移动菜单，供 `index.html` 内联 `onclick` 调用（沿用 `js/main.js` 契约） |

**CSS 类名 / ID（定义处在括号内）：**

- 令牌：`--y2k-bg`、`--y2k-panel`、`--y2k-chrome-1/2/3`、`--y2k-neon`、`--y2k-yellow`、`--y2k-blue`、`--y2k-text`、`--y2k-muted`、`--y2k-font-display`、`--y2k-font-mono`、`--y2k-font-zh`（theme.css）
- 通用组件：`.chrome-text`、`.rgb-split`、`[data-glitch]`、`.badge-led`、`.btn-metal`、`.btn-ghost`、`.card-y2k`、`.card-top`、`.card-emoji`、`.card-title`、`.card-desc`、`.card-link`、`.card-arrow`、`.marquee`、`.marquee-track`、`.section-title`、`.section-sub`、`.section-divider`、`.animate-on-scroll` / `.animated`（theme.css）
- 主页布局：`.container`、`.nav-y2k`、`.nav-inner`、`.nav-logo`（内嵌 `.neon`）、`.nav-links`、`.menu-button`、`#mobile-menu`（`.hidden`）、`.hero`、`.hero-inner`、`.hero-badge`、`.hero-title`、`#hero-title-text`（`.hero-title-hidden`）、`.hero-title-zh`、`.hero-tagline`、`.hero-actions`、`#hero-3d-stage`（`.hero-3d-on`）、`#hero-3d-canvas`、`.section`、`.section-head`、`.cards-grid`、`.more-note`、`.about-grid`、`.about-text`、`.site-footer`、`.footer-logo`、`.footer-beian`（theme.css）
- 特效元素（JS 创建）：`#y2k-cursor`（`.y2k-cursor-hover`）、`#y2k-trail`、`body.y2k-cursor-on`（theme.css）
- 音效开关：`#sfx-toggle`（class `.sfx-toggle`、`.sfx-on`）（theme.css）
- 启动画面：`#boot-screen`（`.boot-done`）、`.boot-box`、`.boot-line`、`.boot-bar`、`#boot-fill`、`#boot-status`、`.boot-hint`（theme.css）
- dev-blog：`.notes-main`、`.notes-nav`、`.notes-back`、`.notes-title`、`.notes-sub`、`.note-empty`、`.post-header`、`.post-title`、`.post-date`、`.post-body`、`.prose-y2k`（theme.css）
- 游戏外壳（独立命名空间，shell.css）：`#y2k-topbar`、`.y2k-topbar-back`、`.y2k-topbar-title`、`body.y2k-shell`、`#y2k-boot`（`.y2k-boot-off`）、`.y2k-boot-inner`、`.y2k-boot-coin`、`.y2k-boot-start`

**存储键：** `sessionStorage['qrc-booted']`（主页启动画面）、`localStorage['qrc-sfx-enabled']`（音效开关）。

---

## Task 1: `assets/y2k/theme.css` — 设计令牌、基础样式与通用组件

建立全站唯一的样式来源。本任务只创建 CSS 文件，不改任何 HTML，页面外观暂时不变（Task 2 才接入）。

**Files:**
- Create: `assets/y2k/theme.css`

**Interfaces:**
- Consumes: 无（全新文件）
- Produces: 命名总表中「令牌 / 通用组件 / 主页布局 / 特效元素 / 音效开关 / 启动画面」全部 CSS 定义（dev-blog 专用类在 Task 7 追加）；Google Fonts 引入方式（Task 2 的 HTML `<link>` 与 `@font-face` 二选一，本计划用 HTML `<link>`，见 Task 2）

**Steps:**

- [ ] **Step 1: 创建 `assets/y2k/theme.css`，写入完整主题。** 文件分六段：tokens、base+scanlines、typography/effects、layout（导航/hero/section/footer）、components（按钮/徽章/卡片/跑马灯）、FX 元素（光标/音效开关/启动画面/reduced-motion）。完整内容如下：

```css
/* ==========================================================================
   QRC-Eye Y2K theme — 设计令牌 + 通用组件 + 主页布局
   全站唯一样式来源。配色/字体只通过 :root 变量引用。
   ========================================================================== */

/* ---------- 1. Design tokens ---------- */
:root {
    --y2k-bg: #0a0c10;
    --y2k-panel: #10131a;
    --y2k-chrome-1: #e8e8ec;
    --y2k-chrome-2: #9a9aa5;
    --y2k-chrome-3: #d5d5dd;
    --y2k-neon: #39ff6a;
    --y2k-yellow: #ffe14d;
    --y2k-blue: #7da2ff;
    --y2k-text: #d7dae0;
    --y2k-muted: #8b8f9a;
    --y2k-font-display: 'Silkscreen', monospace;
    --y2k-font-mono: 'Space Mono', monospace;
    --y2k-font-zh: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

/* ---------- 2. Base + CRT scanlines ---------- */
*,
*::before,
*::after {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;
    background-color: var(--y2k-bg);
    color: var(--y2k-text);
    font-family: var(--y2k-font-mono), var(--y2k-font-zh);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
}

/* CRT 扫描线：纯装饰全屏纹理，不拦截任何交互 */
body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 9000;
    pointer-events: none;
    background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.14) 0px,
        rgba(0, 0, 0, 0.14) 1px,
        transparent 1px,
        transparent 3px
    );
}

h1, h2, h3, h4 {
    font-family: var(--y2k-font-display), var(--y2k-font-zh);
}

a {
    color: var(--y2k-blue);
}

/* ---------- 3. Typography effects ---------- */

/* 铬渐变填充文字（英文大标题、3D 降级标题） */
.chrome-text {
    background: linear-gradient(
        180deg,
        #ffffff 0%,
        var(--y2k-chrome-1) 30%,
        var(--y2k-chrome-2) 52%,
        var(--y2k-chrome-3) 72%,
        #ffffff 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
}

/* 中文标题：铬色 + 1px 错位描边阴影（故障感） */
.hero-title-zh {
    display: block;
    font-size: clamp(1.6rem, 4.5vw, 3.2rem);
    font-weight: 700;
    color: var(--y2k-chrome-1);
    text-shadow: 1px 1px 0 var(--y2k-neon), -1px -1px 0 rgba(125, 162, 255, 0.6);
}

/* JS 随机触发的 RGB 分离闪烁（fx.js 给 [data-glitch] 元素加/移 .rgb-split） */
.rgb-split {
    text-shadow: 2px 0 var(--y2k-neon), -2px 0 var(--y2k-blue) !important;
}

/* hover 标题 glitch 抖动（卡片标题用） */
@keyframes glitch-shift {
    0%   { transform: translate(0); }
    25%  { transform: translate(-2px, 1px); text-shadow: 2px 0 var(--y2k-neon), -2px 0 var(--y2k-blue); }
    50%  { transform: translate(2px, -1px); }
    75%  { transform: translate(-1px, 0); text-shadow: -2px 0 var(--y2k-neon), 2px 0 var(--y2k-blue); }
    100% { transform: translate(0); }
}

/* hover 按钮 glitch（不带文字阴影，避免污染铬渐变按钮） */
@keyframes glitch-jitter {
    0%   { transform: translate(0); }
    25%  { transform: translate(-2px, 1px); }
    50%  { transform: translate(2px, -1px); }
    75%  { transform: translate(-1px, 1px); }
    100% { transform: translate(0); }
}

/* ---------- 4. Layout（主页） ---------- */
.container {
    max-width: 64rem;
    margin: 0 auto;
    padding: 0 1.5rem;
}

/* 导航 */
.nav-y2k {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(10, 12, 16, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(57, 255, 106, 0.25);
}

.nav-inner {
    max-width: 64rem;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
}

.nav-logo {
    font-family: var(--y2k-font-display);
    font-size: 1.1rem;
    color: var(--y2k-chrome-1);
    text-decoration: none;
    letter-spacing: 0.05em;
}

.nav-logo .neon {
    color: var(--y2k-neon);
}

.nav-links {
    display: flex;
    gap: 2rem;
}

.nav-links a {
    font-family: var(--y2k-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.8rem;
    color: var(--y2k-muted);
    text-decoration: none;
    transition: color 0.2s;
}

.nav-links a:hover {
    color: var(--y2k-neon);
}

.menu-button {
    display: none;
    background: none;
    border: 1px solid rgba(154, 154, 165, 0.4);
    color: var(--y2k-chrome-1);
    font-size: 1.2rem;
    line-height: 1;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
}

#mobile-menu {
    padding: 0 1.5rem 1rem;
}

#mobile-menu.hidden {
    display: none;
}

#mobile-menu a {
    display: block;
    padding: 0.6rem 0;
    font-family: var(--y2k-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.85rem;
    color: var(--y2k-muted);
    text-decoration: none;
}

#mobile-menu a:hover {
    color: var(--y2k-neon);
}

@media (max-width: 768px) {
    .nav-links { display: none; }
    .menu-button { display: block; }
}

@media (min-width: 769px) {
    #mobile-menu { display: none; }
}

/* Hero */
.hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 7rem 1.5rem 4rem;
    text-align: center;
    position: relative;
}

.hero-inner {
    max-width: 56rem;
    margin: 0 auto;
    width: 100%;
}

.hero-badge {
    margin-bottom: 2rem;
}

.hero-title {
    margin: 0 0 1.5rem;
    line-height: 1.05;
}

#hero-title-text {
    display: block;
    font-size: clamp(2.5rem, 8vw, 6rem);
}

/* 3D 激活后隐藏 CSS 标题（保留在 DOM 中供无障碍/SEO） */
.hero-title-hidden {
    position: absolute !important;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

.hero-tagline {
    color: var(--y2k-muted);
    font-size: 1.1rem;
    margin: 0 0 2.5rem;
}

.hero-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

/* 3D 舞台：默认隐藏，hero3d.js 初始化成功才加 .hero-3d-on */
#hero-3d-stage {
    display: none;
}

#hero-3d-stage.hero-3d-on {
    display: block;
    width: min(90vw, 900px);
    height: min(50vh, 420px);
    margin: 0 auto 1rem;
}

#hero-3d-canvas {
    width: 100%;
    height: 100%;
    display: block;
}

/* 区块 */
.section {
    padding: 6rem 1.5rem;
    position: relative;
}

.section-head {
    max-width: 64rem;
    margin: 0 auto 3.5rem;
}

.section-title {
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    color: var(--y2k-chrome-1);
    margin: 0 0 0.75rem;
}

.section-title::before {
    content: '// ';
    color: var(--y2k-neon);
}

.section-sub {
    color: var(--y2k-muted);
    margin: 0;
}

.section-divider {
    height: 1px;
    max-width: 64rem;
    margin: 0 auto;
    background: linear-gradient(90deg, transparent, rgba(57, 255, 106, 0.35), transparent);
}

/* About */
.about-grid {
    display: grid;
    gap: 3rem;
    max-width: 64rem;
    margin: 0 auto;
}

@media (min-width: 769px) {
    .about-grid {
        grid-template-columns: 1fr 1fr;
        gap: 5rem;
        align-items: start;
    }
}

.about-text {
    line-height: 1.9;
    font-size: 1.05rem;
}

.about-text p {
    margin: 0 0 1.25rem;
}

/* 页脚 */
.site-footer {
    padding: 4rem 1.5rem;
    text-align: center;
    border-top: 1px solid rgba(154, 154, 165, 0.2);
}

.footer-logo {
    font-family: var(--y2k-font-display);
    letter-spacing: 0.4em;
    color: var(--y2k-chrome-1);
    font-size: 0.8rem;
    margin: 0 0 1rem;
    text-transform: uppercase;
}

.footer-beian {
    color: var(--y2k-muted);
    font-size: 0.7rem;
    text-decoration: none;
    transition: color 0.2s;
}

.footer-beian:hover {
    color: var(--y2k-neon);
}

/* ---------- 5. Components ---------- */

/* 金属立体按钮（老式播放器按键） */
.btn-metal {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--y2k-font-display);
    font-size: 0.95rem;
    color: #0a0c10;
    text-decoration: none;
    padding: 0.9rem 1.8rem;
    background: linear-gradient(
        180deg,
        #ffffff 0%,
        var(--y2k-chrome-1) 20%,
        var(--y2k-chrome-2) 55%,
        var(--y2k-chrome-3) 100%
    );
    border: 1px solid #f0f0f4;
    box-shadow: inset 0 1px 0 #ffffff, inset 0 -2px 0 rgba(0, 0, 0, 0.2), 0 4px 0 #56575f;
    transition: filter 0.15s;
}

.btn-metal:hover {
    filter: brightness(1.06);
    animation: glitch-jitter 0.3s steps(2) both;
}

.btn-metal:active {
    transform: translateY(3px);
    box-shadow: inset 0 1px 0 #ffffff, inset 0 -2px 0 rgba(0, 0, 0, 0.2), 0 1px 0 #56575f;
}

/* 幽灵按钮 */
.btn-ghost {
    display: inline-flex;
    align-items: center;
    font-family: var(--y2k-font-mono);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-size: 0.85rem;
    color: var(--y2k-muted);
    text-decoration: none;
    padding: 0.9rem 1.8rem;
    border: 1px solid rgba(154, 154, 165, 0.35);
    transition: color 0.2s, border-color 0.2s;
}

.btn-ghost:hover {
    color: var(--y2k-neon);
    border-color: var(--y2k-neon);
}

/* LED 点阵徽章 */
.badge-led {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    font-family: var(--y2k-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 11px;
    color: var(--y2k-neon);
    border: 1px solid rgba(57, 255, 106, 0.4);
    background: rgba(57, 255, 106, 0.06);
    padding: 4px 10px;
}

.badge-led::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--y2k-neon);
    box-shadow: 0 0 6px var(--y2k-neon);
    animation: led-blink 2s infinite;
}

@keyframes led-blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.35; }
}

/* 项目卡片 */
.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    max-width: 64rem;
    margin: 0 auto;
}

.card-y2k {
    position: relative;
    display: block;
    background: var(--y2k-panel);
    border: 1px solid rgba(154, 154, 165, 0.35);
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    overflow: hidden;
    transform: translateY(calc(var(--parallax, 0px) + var(--hover-lift, 0px)));
    transition: border-color 0.3s, box-shadow 0.3s;
}

.card-y2k:hover {
    --hover-lift: -4px;
    border-color: var(--y2k-neon);
    box-shadow: 0 0 24px rgba(57, 255, 106, 0.15);
}

/* hover 时扫描线扫过卡片 */
.card-y2k::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -30%;
    height: 30%;
    background: linear-gradient(180deg, transparent, rgba(57, 255, 106, 0.08), transparent);
    opacity: 0;
    pointer-events: none;
}

.card-y2k:hover::after {
    opacity: 1;
    animation: card-scan 0.8s linear;
}

@keyframes card-scan {
    from { top: -30%; }
    to   { top: 100%; }
}

.card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
}

.card-emoji {
    font-size: 2.2rem;
    line-height: 1;
}

.card-title {
    font-size: 1.15rem;
    color: var(--y2k-chrome-1);
    margin: 0 0 0.75rem;
}

.card-y2k:hover .card-title {
    animation: glitch-shift 0.3s steps(2) both;
}

.card-desc {
    color: var(--y2k-muted);
    line-height: 1.7;
    margin: 0 0 1.5rem;
}

.card-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--y2k-neon);
    font-family: var(--y2k-font-mono);
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.card-arrow {
    display: inline-block;
    transition: transform 0.3s ease;
}

.card-y2k:hover .card-arrow {
    transform: translateX(4px);
}

.more-note {
    text-align: center;
    color: var(--y2k-muted);
    font-size: 0.85rem;
    margin: 4rem 0 0;
}

/* 跑马灯（黄底黑字横向滚动带） */
.marquee {
    background: var(--y2k-yellow);
    color: #0a0c10;
    overflow: hidden;
    border-top: 2px solid #0a0c10;
    border-bottom: 2px solid #0a0c10;
}

.marquee-track {
    display: inline-flex;
    white-space: nowrap;
    font-family: var(--y2k-font-display);
    font-weight: 700;
    font-size: 0.9rem;
    padding: 0.6rem 0;
    animation: marquee-scroll 22s linear infinite;
}

.marquee-track span {
    padding-right: 2rem;
}

@keyframes marquee-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
}

/* ---------- 6. FX 元素（JS 创建）与滚动动画 ---------- */

/* 滚动弹性淡入（fx.js 加 .animated；沿用旧 animate-on-scroll 契约） */
.animate-on-scroll {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3), transform 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3);
}

.animate-on-scroll.animated {
    opacity: 1;
    transform: translateY(0);
}

/* 定制十字光标（fx.js 只在 fine pointer + 桌面 + 非 reduced-motion 时启用） */
body.y2k-cursor-on,
body.y2k-cursor-on a,
body.y2k-cursor-on button {
    cursor: none;
}

#y2k-cursor {
    position: fixed;
    top: 0;
    left: 0;
    width: 24px;
    height: 24px;
    margin: -12px 0 0 -12px;
    border: 1px solid rgba(232, 232, 236, 0.6);
    z-index: 10001;
    pointer-events: none;
    transition: width 0.15s, height 0.15s, margin 0.15s, border-color 0.15s;
}

#y2k-cursor::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -6px;
    bottom: -6px;
    width: 1px;
    background: var(--y2k-chrome-1);
}

#y2k-cursor::after {
    content: '';
    position: absolute;
    top: 50%;
    left: -6px;
    right: -6px;
    height: 1px;
    background: var(--y2k-chrome-1);
}

#y2k-cursor.y2k-cursor-hover {
    width: 36px;
    height: 36px;
    margin: -18px 0 0 -18px;
    border-color: var(--y2k-neon);
}

#y2k-cursor.y2k-cursor-hover::before,
#y2k-cursor.y2k-cursor-hover::after {
    background: var(--y2k-neon);
}

#y2k-trail {
    position: fixed;
    inset: 0;
    z-index: 10000;
    pointer-events: none;
}

/* 音效开关（右下角复古开关，默认 OFF） */
.sfx-toggle {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 10002;
    font-family: var(--y2k-font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    padding: 0.5rem 0.9rem;
    background: var(--y2k-panel);
    color: var(--y2k-muted);
    border: 1px solid rgba(154, 154, 165, 0.4);
    cursor: pointer;
}

.sfx-toggle.sfx-on {
    color: var(--y2k-neon);
    border-color: var(--y2k-neon);
    box-shadow: 0 0 10px rgba(57, 255, 106, 0.25);
}

/* 主页启动画面（SYSTEM BOOT） */
#boot-screen {
    position: fixed;
    inset: 0;
    z-index: 10003;
    background: var(--y2k-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.4s;
}

#boot-screen.boot-done {
    opacity: 0;
    pointer-events: none;
}

.boot-box {
    width: min(80vw, 420px);
    font-family: var(--y2k-font-mono);
}

.boot-line {
    color: var(--y2k-neon);
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    margin: 0 0 1rem;
}

.boot-bar {
    height: 14px;
    border: 1px solid var(--y2k-neon);
    padding: 2px;
    margin-bottom: 0.75rem;
}

.boot-fill {
    height: 100%;
    width: 0;
    background: repeating-linear-gradient(90deg, var(--y2k-neon) 0 6px, transparent 6px 9px);
}

.boot-status {
    color: var(--y2k-muted);
}

.boot-hint {
    color: var(--y2k-muted);
    font-size: 0.65rem;
    letter-spacing: 0.2em;
    text-align: center;
    animation: led-blink 1.2s infinite;
    margin: 1rem 0 0;
}

/* reduced-motion：关闭一切非必要动画（fx.js 同时负责 JS 侧降级） */
@media (prefers-reduced-motion: reduce) {
    html {
        scroll-behavior: auto;
    }

    .marquee-track,
    .badge-led::before,
    .boot-hint {
        animation: none;
    }

    .animate-on-scroll {
        opacity: 1;
        transform: none;
        transition: none;
    }

    .card-y2k:hover::after {
        animation: none;
    }

    .card-y2k:hover .card-title,
    .btn-metal:hover {
        animation: none;
    }
}
```

- [ ] **Step 2: 验证文件可被服务且关键令牌存在。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
curl -s http://localhost:8000/assets/y2k/theme.css | grep -c -- '--y2k-neon: #39ff6a'
curl -s http://localhost:8000/assets/y2k/theme.css | grep -c '@keyframes glitch-shift'
kill $SERVER_PID
```

预期输出：两行都为 `1`（或更多），表示文件可访问且关键内容存在。

- [ ] **Step 3: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add assets/y2k/theme.css
git commit -m "feat(y2k): add theme.css design tokens and shared components"
```

---

## Task 2: 主页 `index.html` 换皮（去 Tailwind，接 theme.css）

重写主页标记：删除 Tailwind CDN 与内联 `<style>`，全部改用 Task 1 的类；在 Hero 与项目区之间插入跑马灯。文案、信息结构、SEO meta 全部保留。本任务暂保留 `<script src="js/main.js">`（`.animate-on-scroll` 契约未变，旧 JS 继续工作），后续任务替换。

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `theme.css` 全部类（Task 1）；`js/main.js` 的 `toggleMobileMenu()`、`handleScrollAnimations()`（沿用，Task 4 才替换）
- Produces: 供后续任务挂载的 DOM 钩子——`#hero-3d-stage`（Task 6）、`#hero-title-text`（Task 6）、`[data-glitch]`（Task 4 的 RGB 闪烁目标：hero 标题、区块标题）、`#mobile-menu` / `#menu-button`（`toggleMobileMenu` 契约）、`.animate-on-scroll` 元素

**Steps:**

- [ ] **Step 1: 用以下内容完整替换 `index.html`。** 注意：meta/title/og/twitter/备案文案与原文件逐字一致；卡片文案与 emoji 不变；`<script src="js/main.js">` 暂时保留。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>QRC-Eye | 想法的草稿本</title>
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="favicon.ico" type="image/x-icon">
    <meta name="description" content="QRC-Eye 是一个做实验性产品原型的个人空间。有些东西会长成作品，有些只是画着玩。">
    <meta name="keywords" content="QRC-Eye, 原型, 实验, 独立开发, 小游戏, 个人项目">
    <meta name="author" content="QRC-Eye">
    <meta name="robots" content="index, follow">
    <!-- Open Graph 标签 -->
    <meta property="og:title" content="QRC-Eye | 想法的草稿本">
    <meta property="og:description" content="QRC-Eye 是一个做实验性产品原型的个人空间。有些东西会长成作品，有些只是画着玩。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.qrc-eye.com">
    <!-- Twitter Card 标签 -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="QRC-Eye | 想法的草稿本">
    <meta name="twitter:description" content="QRC-Eye 是一个做实验性产品原型的个人空间。有些东西会长成作品，有些只是画着玩。">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/y2k/theme.css">
</head>
<body>

    <nav class="nav-y2k" aria-label="主导航">
        <div class="nav-inner">
            <a href="#" class="nav-logo" aria-label="返回顶部">
                QRC<span class="neon">.</span>EYE
            </a>
            <div class="nav-links">
                <a href="#projects">项目</a>
                <a href="#about">关于</a>
            </div>
            <button class="menu-button" onclick="toggleMobileMenu()" aria-label="打开菜单" aria-expanded="false" id="menu-button">
                ☰
            </button>
        </div>
        <div id="mobile-menu" class="hidden" aria-hidden="true" aria-labelledby="menu-button">
            <a href="#projects" onclick="toggleMobileMenu()">项目</a>
            <a href="#about" onclick="toggleMobileMenu()">关于</a>
        </div>
    </nav>

    <main>
        <!-- Hero -->
        <section class="hero">
            <div class="hero-inner">
                <div class="hero-badge animate-on-scroll">
                    <span class="badge-led">Idea Lab · 想法试验场</span>
                </div>
                <div id="hero-3d-stage" aria-hidden="true"></div>
                <h1 class="hero-title animate-on-scroll">
                    <span id="hero-title-text" class="chrome-text" data-glitch>QRC-Eye</span>
                    <span class="hero-title-zh">想法的草稿本</span>
                </h1>
                <p class="hero-tagline animate-on-scroll">
                    有些东西会长成作品，有些只是画着玩。
                </p>
                <div class="hero-actions animate-on-scroll">
                    <a href="#projects" class="btn-metal">
                        看看草稿
                        <span class="card-arrow" aria-hidden="true">-&gt;</span>
                    </a>
                    <a href="#about" class="btn-ghost">关于我</a>
                </div>
            </div>
        </section>

        <!-- Marquee -->
        <div class="marquee" aria-hidden="true">
            <div class="marquee-track">
                <span>★ NOW PLAYING ★ CYBERTRAVEL ★ 烟花大师 FIREWORK MASTER ★ 王土之下 KING'S FIELD ★ MORE SKETCHES LOADING ★&nbsp;</span>
                <span>★ NOW PLAYING ★ CYBERTRAVEL ★ 烟花大师 FIREWORK MASTER ★ 王土之下 KING'S FIELD ★ MORE SKETCHES LOADING ★&nbsp;</span>
            </div>
        </div>

        <!-- Projects -->
        <section id="projects" class="section">
            <div class="section-head animate-on-scroll">
                <h2 class="section-title" data-glitch>草稿</h2>
                <p class="section-sub">正在做或已经能玩的实验性原型。</p>
            </div>

            <div class="cards-grid">
                <!-- CyberTravel -->
                <a href="cybertravel/index.html" class="card-y2k animate-on-scroll">
                    <div class="card-top">
                        <span class="card-emoji">🚲</span>
                        <span class="badge-led">可玩原型</span>
                    </div>
                    <h3 class="card-title">CyberTravel</h3>
                    <p class="card-desc">
                        在川藏线上当骑行网红，看看能走多远。
                    </p>
                    <div class="card-link">
                        <span>试玩</span>
                        <span class="card-arrow" aria-hidden="true">&gt;</span>
                    </div>
                </a>

                <!-- Firework Master -->
                <a href="firework-master/index.html" class="card-y2k animate-on-scroll">
                    <div class="card-top">
                        <span class="card-emoji">🎆</span>
                        <span class="badge-led">可玩原型</span>
                    </div>
                    <h3 class="card-title">烟花大师</h3>
                    <p class="card-desc">
                        收集配方、编排节目单，在夜空中绽放属于你的烟花秀。
                    </p>
                    <div class="card-link">
                        <span>试玩</span>
                        <span class="card-arrow" aria-hidden="true">&gt;</span>
                    </div>
                </a>

                <!-- 王土之下 -->
                <a href="kings-field/index.html" class="card-y2k animate-on-scroll">
                    <div class="card-top">
                        <span class="card-emoji">🗡️</span>
                        <span class="badge-led">可玩原型</span>
                    </div>
                    <h3 class="card-title">王土之下</h3>
                    <p class="card-desc">
                        精神复刻 1994《国王密令》：黑暗无缝地牢、笨重近战，死亡是唯一的教师。
                    </p>
                    <div class="card-link">
                        <span>试玩</span>
                        <span class="card-arrow" aria-hidden="true">&gt;</span>
                    </div>
                </a>

                <!-- Future projects will be added here following the same card structure -->
            </div>

            <p class="more-note animate-on-scroll">
                更多想法正在画草稿 …
            </p>
        </section>

        <div class="section-divider"></div>

        <!-- About -->
        <section id="about" class="section">
            <div class="about-grid">
                <div class="animate-on-scroll">
                    <h2 class="section-title" data-glitch>关于</h2>
                    <p class="section-sub">为什么有这个站点。</p>
                </div>
                <div class="about-text animate-on-scroll">
                    <p>
                        我是 QRC-Eye，一个还在寻找自己表达方式的创作者。
                    </p>
                    <p>
                        这个站点是我的想法草稿本：把脑子里的东西快速做成可交互的原型，看看哪些会长成作品，哪些只是画着玩。
                    </p>
                    <p>
                        朋友偶尔会一起来玩。
                    </p>
                </div>
            </div>
        </section>
    </main>

    <footer class="site-footer">
        <p class="footer-logo">QRC-Eye</p>
        <a href="https://beian.miit.gov.cn/" target="_blank" class="footer-beian">
            粤ICP备2024189519号-1
        </a>
    </footer>

    <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: 起本地服务验证 Tailwind 已移除、theme.css 已接入、关键标记存在。**

```bash
cd /Users/ruochenhua/QrcSite
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "tailwind refs: $(curl -s http://localhost:8000/ | grep -c 'cdn.tailwindcss.com')"
echo "theme.css refs: $(curl -s http://localhost:8000/ | grep -c 'assets/y2k/theme.css')"
echo "marquee: $(curl -s http://localhost:8000/ | grep -c 'marquee-track')"
echo "Silkscreen font: $(curl -s http://localhost:8000/ | grep -c 'Silkscreen')"
echo "hero 3d stage: $(curl -s http://localhost:8000/ | grep -c 'hero-3d-stage')"
kill $SERVER_PID
```

预期输出：`tailwind refs: 0`，其余四项均 `>= 1`。

- [ ] **Step 3: 人工目检检查点。** 本地服务打开 `http://localhost:8000/`，确认：
  - 近黑蓝灰底色 + 全屏 CRT 扫描线可见；
  - Hero 英文标题为像素体铬渐变、中文标题带绿/蓝错位描边；
  - 黄底黑字跑马灯在 Hero 与「草稿」区之间横向滚动；
  - 三张项目卡片为深色面板 + 金属边框，hover 时边框变霓虹绿、标题 glitch 抖动、扫描线扫过；
  - 移动端宽度（DevTools 375px）下汉堡菜单可开合（旧 `main.js` 仍在工作）；
  - 控制台无 404（除 favicon 类无害项）与报错。

- [ ] **Step 4: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add index.html
git commit -m "feat(y2k): reskin homepage with theme.css, drop Tailwind CDN"
```

---

## Task 3: `sfx.js` 音效模块 + 静音开关

WebAudio 振荡器合成 8-bit 音效，无音频文件。默认静音，右下角开关，状态持久化。本任务创建 `sfx.js` 并在主页接入（开关按钮 + script 标签）。

**Files:**
- Create: `assets/y2k/sfx.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `QRC.handleError`（有 defensive fallback）；`.sfx-toggle` / `.sfx-on` 样式（Task 1 已定义）
- Produces: `QRC.sfx.init()`、`QRC.sfx.play('hover'|'click')`、`QRC.sfx.setEnabled(bool)`、`QRC.sfx.enabled`；存储键 `localStorage['qrc-sfx-enabled']`；DOM 契约 `#sfx-toggle`

**Steps:**

- [ ] **Step 1: 创建 `assets/y2k/sfx.js`，完整内容如下：**

```js
/* ==========================================================================
   QRC-Eye Y2K sfx — WebAudio 振荡器合成 8-bit 音效（无音频文件）
   默认静音；右下角开关开启；状态存 localStorage['qrc-sfx-enabled']。
   所有 AudioContext 调用外包 try/catch（浏览器自动播放策略：首次开启
   动作本身是用户手势，可安全创建/恢复 AudioContext）。
   ========================================================================== */
window.QRC = window.QRC || {};

QRC.handleError = QRC.handleError || function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
};

QRC.sfx = (function () {
    const STORAGE_KEY = 'qrc-sfx-enabled';
    let ctx = null;
    let enabled = false;
    let lastHoverTarget = null;

    function ensureCtx() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        return ctx;
    }

    function tone(freq, duration, type, delay, volume) {
        const ac = ensureCtx();
        if (!ac) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const t = ac.currentTime + (delay || 0);
        osc.type = type || 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume || 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + duration);
    }

    function play(name) {
        if (!enabled) return;
        try {
            if (name === 'hover') {
                tone(880, 0.06, 'square', 0, 0.05);
            } else if (name === 'click') {
                tone(660, 0.07, 'square', 0, 0.07);
                tone(990, 0.09, 'square', 0.07, 0.07);
            }
        } catch (error) {
            QRC.handleError(error, 'sfx.play');
        }
    }

    function updateToggle() {
        const btn = document.getElementById('sfx-toggle');
        if (!btn) return;
        btn.textContent = enabled ? 'SOUND: ON' : 'SOUND: OFF';
        btn.setAttribute('aria-pressed', String(enabled));
        btn.classList.toggle('sfx-on', enabled);
    }

    function setEnabled(value) {
        enabled = !!value;
        try {
            localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
        } catch (error) {
            QRC.handleError(error, 'sfx.setEnabled storage');
        }
        if (enabled) {
            try {
                ensureCtx();
                play('click');
            } catch (error) {
                QRC.handleError(error, 'sfx.setEnabled unlock');
            }
        }
        updateToggle();
    }

    function init() {
        try {
            try {
                enabled = localStorage.getItem(STORAGE_KEY) === '1';
            } catch (error) {
                enabled = false;
            }
            const btn = document.getElementById('sfx-toggle');
            if (btn) {
                btn.addEventListener('click', function () {
                    setEnabled(!enabled);
                });
            }
            document.addEventListener('mouseover', function (e) {
                const target = e.target.closest ? e.target.closest('a, button') : null;
                if (!target || target === lastHoverTarget) return;
                lastHoverTarget = target;
                play('hover');
            });
            document.addEventListener('click', function (e) {
                if (e.target.closest && e.target.closest('#sfx-toggle')) return;
                if (e.target.closest && e.target.closest('a, button')) play('click');
            });
            updateToggle();
        } catch (error) {
            QRC.handleError(error, 'sfx.init');
        }
    }

    return {
        init: init,
        play: play,
        setEnabled: setEnabled,
        get enabled() { return enabled; }
    };
})();

document.addEventListener('DOMContentLoaded', function () {
    try {
        QRC.sfx.init();
    } catch (error) {
        QRC.handleError(error, 'sfx DOMContentLoaded');
    }
});
```

- [ ] **Step 2: 在 `index.html` 中接入。** 一处编辑（同时完成开关按钮插入与 sfx.js 引入）——在 `</footer>` 之后、`<script src="js/main.js"></script>` 之前插入：

old_string:
```html
    </footer>

    <script src="js/main.js"></script>
```

new_string:
```html
    </footer>

    <button id="sfx-toggle" class="sfx-toggle" aria-pressed="false" aria-label="开启或关闭音效">SOUND: OFF</button>

    <script src="assets/y2k/sfx.js" defer></script>
    <script src="js/main.js"></script>
```

- [ ] **Step 3: 语法校验 + 服务验证。**

```bash
cd /Users/ruochenhua/QrcSite
node --check assets/y2k/sfx.js && echo "sfx.js syntax OK"
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "sfx.js tag: $(curl -s http://localhost:8000/ | grep -c 'assets/y2k/sfx.js')"
echo "toggle button: $(curl -s http://localhost:8000/ | grep -c 'id="sfx-toggle"')"
kill $SERVER_PID
```

预期输出：`sfx.js syntax OK`，后两项均 `1`。

- [ ] **Step 4: 人工目检检查点。** 打开主页：右下角有 `SOUND: OFF` 按钮；点击后变为绿色 `SOUND: ON` 并听到「哔-啵」；hover 链接有短促「哔」；刷新页面开关状态保持；再点一次回到 OFF。

- [ ] **Step 5: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add assets/y2k/sfx.js index.html
git commit -m "feat(y2k): add WebAudio sfx module with muted-by-default toggle"
```

---

## Task 4: `fx.js` 动效套件（吸收 `js/main.js`，含降级逻辑）

创建 `assets/y2k/fx.js`：统一错误处理、移动菜单、滚动动画、平滑滚动（吸收 main.js 全部行为），新增定制十字光标 + Canvas 星星拖尾、随机 RGB 分离闪烁、卡片轻微视差、启动画面逻辑，以及集中式降级判定 `QRC.fx.flags`。主页改引 `fx.js`，删除 `js/main.js`。

**Files:**
- Create: `assets/y2k/fx.js`
- Modify: `index.html`
- Delete: `js/main.js`

**Interfaces:**
- Consumes: `#mobile-menu` / `#menu-button`（Task 2 标记）；`.animate-on-scroll`（Task 1/2）；`[data-glitch]`（Task 2 标记的闪烁目标）；`#boot-screen` 系列 ID（Task 5 才加入标记，本任务中 `initBootScreen` 对缺失元素 no-op）；`.card-y2k` 的 `--parallax` CSS 变量（Task 1 已定义）
- Produces: `QRC.handleError`、`QRC.fx.flags = { finePointer, isMobile, reducedMotion }`、`QRC.fx.init()`、全局 `toggleMobileMenu()`；存储键 `sessionStorage['qrc-booted']`；JS 创建的元素 `#y2k-cursor`、`#y2k-trail`、`body.y2k-cursor-on`

**Steps:**

- [ ] **Step 1: 创建 `assets/y2k/fx.js`，完整内容如下：**

```js
/* ==========================================================================
   QRC-Eye Y2K fx — 动效套件
   吸收原 js/main.js 全部行为（移动菜单 / 滚动动画 / 平滑滚动 / 全局错误
   监听），新增：定制十字光标 + Canvas 星星拖尾、随机 RGB 分离闪烁、卡片
   视差、SYSTEM BOOT 启动画面。
   降级判定集中在 QRC.fx.flags，是全站唯一判定来源（hero3d.js 复用）。
   ========================================================================== */
window.QRC = window.QRC || {};

QRC.handleError = QRC.handleError || function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
};

/* 移动菜单（沿用 js/main.js 的契约：index.html 内联 onclick 调用） */
function toggleMobileMenu() {
    try {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuButton = document.getElementById('menu-button');
        if (mobileMenu && menuButton) {
            const isHidden = mobileMenu.classList.toggle('hidden');
            mobileMenu.setAttribute('aria-hidden', isHidden);
            menuButton.setAttribute('aria-expanded', !isHidden);
            menuButton.setAttribute('aria-label', isHidden ? '打开菜单' : '关闭菜单');
        } else {
            console.warn('Mobile menu or menu button not found');
        }
    } catch (error) {
        QRC.handleError(error, 'toggleMobileMenu');
    }
}

QRC.fx = (function () {
    /* 降级判定唯一来源 */
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 滚动动画（来自 js/main.js，行为不变） ---------- */
    function handleScrollAnimations() {
        try {
            const elements = document.querySelectorAll('.animate-on-scroll');
            elements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 120;
                if (elementTop < window.innerHeight - elementVisible) {
                    element.classList.add('animated');
                }
            });
        } catch (error) {
            QRC.handleError(error, 'handleScrollAnimations');
        }
    }

    /* ---------- 平滑滚动（来自 js/main.js，行为不变） ---------- */
    function initSmoothScroll() {
        try {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') return;
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        e.preventDefault();
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        } catch (error) {
            QRC.handleError(error, 'initSmoothScroll');
        }
    }

    /* ---------- 定制十字光标 + Canvas 星星拖尾 ---------- */
    function initCursor() {
        if (!finePointer || isMobile || reducedMotion) return;
        try {
            document.body.classList.add('y2k-cursor-on');

            const cursor = document.createElement('div');
            cursor.id = 'y2k-cursor';
            cursor.setAttribute('aria-hidden', 'true');
            document.body.appendChild(cursor);

            const trail = document.createElement('canvas');
            trail.id = 'y2k-trail';
            trail.setAttribute('aria-hidden', 'true');
            document.body.appendChild(trail);
            const ctx = trail.getContext('2d');

            let stars = [];

            function resize() {
                trail.width = window.innerWidth;
                trail.height = window.innerHeight;
            }
            resize();
            window.addEventListener('resize', resize);

            window.addEventListener('mousemove', function (e) {
                cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
                stars.push({ x: e.clientX, y: e.clientY, life: 8 });
                if (stars.length > 60) stars.splice(0, stars.length - 60);
            });

            document.addEventListener('mouseover', function (e) {
                if (e.target.closest && e.target.closest('a, button')) {
                    cursor.classList.add('y2k-cursor-hover');
                } else {
                    cursor.classList.remove('y2k-cursor-hover');
                }
            });

            function drawStar(x, y, size, alpha) {
                ctx.strokeStyle = `rgba(57, 255, 106, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x - size, y);
                ctx.lineTo(x + size, y);
                ctx.moveTo(x, y - size);
                ctx.lineTo(x, y + size);
                ctx.stroke();
            }

            (function loop() {
                ctx.clearRect(0, 0, trail.width, trail.height);
                stars.forEach(s => {
                    s.life -= 1;
                    drawStar(s.x, s.y, 4, (s.life / 8) * 0.8);
                });
                stars = stars.filter(s => s.life > 0);
                requestAnimationFrame(loop);
            })();
        } catch (error) {
            QRC.handleError(error, 'fx.initCursor');
        }
    }

    /* ---------- 随机 RGB 分离闪烁（每 8-12s 一次，200ms） ---------- */
    function initGlitch() {
        if (reducedMotion) return;
        try {
            (function scheduleFlicker() {
                const delay = 8000 + Math.random() * 4000;
                setTimeout(function () {
                    try {
                        const targets = document.querySelectorAll('[data-glitch]');
                        if (targets.length) {
                            const el = targets[Math.floor(Math.random() * targets.length)];
                            el.classList.add('rgb-split');
                            setTimeout(function () {
                                el.classList.remove('rgb-split');
                            }, 200);
                        }
                    } catch (error) {
                        QRC.handleError(error, 'fx.flicker');
                    }
                    scheduleFlicker();
                }, delay);
            })();
        } catch (error) {
            QRC.handleError(error, 'fx.initGlitch');
        }
    }

    /* ---------- 卡片轻微视差（写 --parallax CSS 变量，不与 hover 变换冲突） ---------- */
    function initParallax() {
        if (isMobile || reducedMotion) return;
        try {
            const cards = document.querySelectorAll('.card-y2k');
            if (!cards.length) return;
            let ticking = false;
            function update() {
                ticking = false;
                const viewportCenter = window.innerHeight / 2;
                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const cardCenter = rect.top + rect.height / 2;
                    let offset = (cardCenter - viewportCenter) * 0.03;
                    offset = Math.max(-12, Math.min(12, offset));
                    card.style.setProperty('--parallax', offset.toFixed(1) + 'px');
                });
            }
            window.addEventListener('scroll', function () {
                if (!ticking) {
                    ticking = true;
                    requestAnimationFrame(update);
                }
            });
            update();
        } catch (error) {
            QRC.handleError(error, 'fx.initParallax');
        }
    }

    /* ---------- SYSTEM BOOT 启动画面（首次访问 ~1s，可点击跳过） ---------- */
    function initBootScreen() {
        try {
            const boot = document.getElementById('boot-screen');
            if (!boot) return; // 非主页或标记未注入（Task 5 才加入）

            let alreadyBooted = false;
            try {
                alreadyBooted = !!sessionStorage.getItem('qrc-booted');
            } catch (error) {
                alreadyBooted = false;
            }
            if (reducedMotion || alreadyBooted) {
                boot.remove();
                return;
            }

            const fill = document.getElementById('boot-fill');
            const status = document.getElementById('boot-status');
            const DURATION = 1000;
            let done = false;

            function finish() {
                if (done) return;
                done = true;
                try {
                    sessionStorage.setItem('qrc-booted', '1');
                } catch (error) {
                    QRC.handleError(error, 'fx.bootScreen storage');
                }
                boot.classList.add('boot-done');
                setTimeout(function () {
                    if (boot.parentNode) boot.parentNode.removeChild(boot);
                }, 450);
            }

            boot.addEventListener('click', finish);

            const start = performance.now();
            (function tick(now) {
                if (done) return;
                const p = Math.min(1, (now - start) / DURATION);
                if (fill) fill.style.width = (p * 100).toFixed(0) + '%';
                if (status) status.textContent = 'LOADING… ' + (p * 100).toFixed(0) + '%';
                if (p < 1) {
                    requestAnimationFrame(tick);
                } else {
                    finish();
                }
            })(start);
        } catch (error) {
            QRC.handleError(error, 'fx.initBootScreen');
        }
    }

    function init() {
        handleScrollAnimations();
        window.addEventListener('scroll', handleScrollAnimations);
        initSmoothScroll();
        initCursor();
        initGlitch();
        initParallax();
        initBootScreen();
    }

    return {
        init: init,
        flags: {
            finePointer: finePointer,
            isMobile: isMobile,
            reducedMotion: reducedMotion
        }
    };
})();

document.addEventListener('DOMContentLoaded', function () {
    try {
        QRC.fx.init();
        console.log('QRC-Eye Y2K fx loaded');
    } catch (error) {
        QRC.handleError(error, 'fx DOMContentLoaded');
    }
});

window.addEventListener('error', function (event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
});
```

- [ ] **Step 2: `index.html` 改引 fx.js。**

old_string:
```html
    <script src="assets/y2k/sfx.js" defer></script>
    <script src="js/main.js"></script>
```

new_string:
```html
    <script src="assets/y2k/sfx.js" defer></script>
    <script src="assets/y2k/fx.js" defer></script>
```

- [ ] **Step 3: 删除 `js/main.js`（行为已被 fx.js 全部吸收）。**

```bash
cd /Users/ruochenhua/QrcSite
git rm js/main.js
```

注意：`js/` 目录清空后 git 不再追踪该目录，属预期。

- [ ] **Step 4: 语法校验 + 服务验证。**

```bash
cd /Users/ruochenhua/QrcSite
node --check assets/y2k/fx.js && echo "fx.js syntax OK"
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "fx.js tag: $(curl -s http://localhost:8000/ | grep -c 'assets/y2k/fx.js')"
echo "main.js refs: $(curl -s http://localhost:8000/ | grep -c 'js/main.js')"
kill $SERVER_PID
```

预期输出：`fx.js syntax OK`、`fx.js tag: 1`、`main.js refs: 0`。

- [ ] **Step 5: 人工目检检查点。** 桌面 Chrome 打开主页：
  - 原生光标消失，替换为十字准星；移动鼠标有绿色星星拖尾；hover 链接/按钮时准星变绿放大；
  - 滚动页面，卡片进入视口弹性淡入，且随滚动有轻微视差；
  - 等待 8-12 秒，Hero 标题或区块标题出现一次短暂的 RGB 分离闪烁；
  - hover 卡片标题 glitch 抖动；移动宽度下汉堡菜单仍可开合；
  - 控制台出现 `QRC-Eye Y2K fx loaded`，无报错。

- [ ] **Step 6: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add assets/y2k/fx.js index.html
git commit -m "feat(y2k): add fx.js effects suite, absorb and remove js/main.js"
```

---

## Task 5: 主页启动画面（SYSTEM BOOT）

把启动画面标记注入主页。逻辑（`initBootScreen`）已在 Task 4 的 fx.js 中就绪，本任务只加 HTML 标记并验证整链路。

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `QRC.fx.initBootScreen`（fx.js，Task 4）；`#boot-screen` 系列样式（theme.css，Task 1）；存储键 `sessionStorage['qrc-booted']`
- Produces: DOM 契约 `#boot-screen`、`#boot-fill`、`#boot-status`

**Steps:**

- [ ] **Step 1: 在 `index.html` 的 `<body>` 之后立即插入启动画面标记。**

old_string:
```html
<body>

    <nav class="nav-y2k" aria-label="主导航">
```

new_string:
```html
<body>

    <div id="boot-screen" role="dialog" aria-label="系统启动画面">
        <div class="boot-box">
            <p class="boot-line">QRC-EYE SYSTEM BOOT</p>
            <div class="boot-bar"><div class="boot-fill" id="boot-fill"></div></div>
            <p class="boot-line boot-status" id="boot-status">LOADING… 0%</p>
            <p class="boot-hint">CLICK TO SKIP</p>
        </div>
    </div>

    <nav class="nav-y2k" aria-label="主导航">
```

- [ ] **Step 2: 服务验证标记存在。**

```bash
cd /Users/ruochenhua/QrcSite
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "boot screen: $(curl -s http://localhost:8000/ | grep -c 'id="boot-screen"')"
echo "boot fill: $(curl -s http://localhost:8000/ | grep -c 'id="boot-fill"')"
kill $SERVER_PID
```

预期输出：两项均 `1`。

- [ ] **Step 3: 人工目检检查点。** 桌面 Chrome 新开无痕窗口（确保 sessionStorage 为空）打开主页：
  - 首次访问：全屏黑色启动画面，`QRC-EYE SYSTEM BOOT` + 绿色条纹进度条约 1 秒从 0% 走到 100%，随后淡出；
  - 进度条走完前点击画面任意处，立即跳过并淡出；
  - 同一会话内刷新页面（同一标签页）：启动画面不再出现；
  - 控制台无报错。

- [ ] **Step 4: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add index.html
git commit -m "feat(y2k): add SYSTEM BOOT splash screen to homepage"
```

---

## Task 6: `hero3d.js` — Three.js 主视觉 + 降级

主页 Hero 加入可交互 3D：挤出金属字 `QRC-EYE` 中央悬浮自转、线框网格地面、鼠标倾斜、滚动缩小上移。Three.js 经 import map 引入（`three@0.160.0`，jsdelivr），`hero3d.js` 用动态 `import()` + try/catch，任何失败（CDN 不可达、WebGL 不可用、字体加载失败）都降级为 Task 2 已有的 CSS 铬渐变静态标题。移动端 / reduced-motion 直接不初始化。

**Files:**
- Create: `assets/y2k/hero3d.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `#hero-3d-stage`（Task 2 标记）；`#hero-title-text` + `.hero-title-hidden` / `#hero-3d-stage.hero-3d-on` / `#hero-3d-canvas` 样式（Task 1）；`QRC.fx.flags`（Task 4，含 defensive fallback）；`QRC.handleError`
- Produces: `QRC.hero3d.init()`（返回 Promise）；运行时创建 `#hero-3d-canvas`

**Steps:**

- [ ] **Step 1: 创建 `assets/y2k/hero3d.js`，完整内容如下。** 说明：本文件是经典脚本（非 module），通过动态 `import()` 加载 Three.js，因此 `node --check` 可直接校验；import map 对经典脚本中的动态 import 同样生效。

```js
/* ==========================================================================
   QRC-Eye Y2K hero3d — Three.js Hero 主视觉（仅主页，仅桌面端）
   挤出金属字 QRC-EYE + 线框网格地面 + 鼠标倾斜 + 滚动缩小。
   降级链：reduced-motion / 移动端 / WebGL 不可用 / CDN 或字体加载失败
   → 保留 CSS 铬渐变静态标题（Task 2 标记），不白屏不报错。
   ========================================================================== */
window.QRC = window.QRC || {};

QRC.handleError = QRC.handleError || function handleError(error, functionName) {
    console.error(`Error in ${functionName}:`, error);
};

QRC.hero3d = (function () {
    const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';

    function getFlags() {
        if (QRC.fx && QRC.fx.flags) return QRC.fx.flags;
        return {
            finePointer: window.matchMedia('(pointer: fine)').matches,
            isMobile: window.matchMedia('(max-width: 768px)').matches,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
    }

    function webglAvailable() {
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (error) {
            return false;
        }
    }

    function cleanup(stage, fallback) {
        const canvas = document.getElementById('hero-3d-canvas');
        if (canvas) canvas.remove();
        if (stage) stage.classList.remove('hero-3d-on');
        if (fallback) fallback.classList.remove('hero-title-hidden');
    }

    async function init() {
        const stage = document.getElementById('hero-3d-stage');
        const fallback = document.getElementById('hero-title-text');
        if (!stage) return; // 非主页

        const flags = getFlags();
        if (flags.reducedMotion || flags.isMobile || !webglAvailable()) {
            return; // 保留 CSS 降级标题
        }

        try {
            const THREE = await import('three');
            const { FontLoader } = await import('three/addons/loaders/FontLoader.js');
            const { TextGeometry } = await import('three/addons/geometries/TextGeometry.js');

            const canvas = document.createElement('canvas');
            canvas.id = 'hero-3d-canvas';
            stage.appendChild(canvas);

            const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x0a0c10, 8, 26);

            const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
            camera.position.set(0, 1.2, 9);
            camera.lookAt(0, 0, 0);

            /* 灯光：环境光 + 主光 + 霓虹绿/冷蓝点光，保证金属材质有反射层次 */
            scene.add(new THREE.AmbientLight(0x404060, 1.2));
            const key = new THREE.DirectionalLight(0xffffff, 2.0);
            key.position.set(3, 5, 4);
            scene.add(key);
            const neon = new THREE.PointLight(0x39ff6a, 12, 30);
            neon.position.set(-4, 2, 3);
            scene.add(neon);
            const blue = new THREE.PointLight(0x7da2ff, 12, 30);
            blue.position.set(4, -1, 2);
            scene.add(blue);

            /* 线框网格地面（GridHelper + Fog 实现透视消失于地平线） */
            const grid = new THREE.GridHelper(60, 60, 0x39ff6a, 0x14421f);
            grid.position.y = -2.2;
            scene.add(grid);

            /* 挤出金属立体字 */
            const font = await new FontLoader().loadAsync(FONT_URL);
            const geo = new TextGeometry('QRC-EYE', {
                font: font,
                size: 1.4,
                height: 0.4,
                curveSegments: 6,
                bevelEnabled: true,
                bevelThickness: 0.05,
                bevelSize: 0.04,
                bevelSegments: 3
            });
            geo.center();
            const mat = new THREE.MeshStandardMaterial({
                color: 0xd5d5dd,
                metalness: 0.95,
                roughness: 0.22
            });
            const logo = new THREE.Mesh(geo, mat);
            const tiltGroup = new THREE.Group();
            tiltGroup.add(logo);
            tiltGroup.position.y = 0.6;
            scene.add(tiltGroup);

            /* 交互：鼠标倾斜目标值 */
            let targetRX = 0;
            let targetRY = 0;
            window.addEventListener('mousemove', function (e) {
                targetRY = (e.clientX / window.innerWidth - 0.5) * 0.6;
                targetRX = (e.clientY / window.innerHeight - 0.5) * 0.3;
            });

            function resize() {
                const w = stage.clientWidth || 1;
                const h = stage.clientHeight || 1;
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }

            /* 先显示舞台再量尺寸（display:none 时 clientWidth 为 0） */
            stage.classList.add('hero-3d-on');
            if (fallback) fallback.classList.add('hero-title-hidden');
            resize();
            window.addEventListener('resize', resize);

            (function animate() {
                requestAnimationFrame(animate);
                const scroll = Math.min(1, window.scrollY / window.innerHeight);
                logo.rotation.y += 0.005;
                tiltGroup.rotation.x += (targetRX - tiltGroup.rotation.x) * 0.05;
                tiltGroup.rotation.y += (targetRY - tiltGroup.rotation.y) * 0.05;
                const scale = 1 - scroll * 0.5;
                tiltGroup.scale.set(scale, scale, scale);
                tiltGroup.position.y = 0.6 + scroll * 2;
                renderer.render(scene, camera);
            })();
        } catch (error) {
            QRC.handleError(error, 'hero3d.init');
            console.warn('hero3d: falling back to CSS static title');
            cleanup(stage, fallback);
        }
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', function () {
    QRC.hero3d.init().catch(function (error) {
        QRC.handleError(error, 'hero3d DOMContentLoaded');
    });
});
```

- [ ] **Step 2: 在 `index.html` 的 `</head>` 前加入 import map，在 fx.js 之后引入 hero3d.js。** 两处编辑：

编辑 A（import map 必须在任何 module 解析之前，放 `</head>` 前）：

old_string:
```html
    <link rel="stylesheet" href="assets/y2k/theme.css">
</head>
```

new_string:
```html
    <link rel="stylesheet" href="assets/y2k/theme.css">
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
        }
    }
    </script>
</head>
```

编辑 B（script 引入）：

old_string:
```html
    <script src="assets/y2k/sfx.js" defer></script>
    <script src="assets/y2k/fx.js" defer></script>
```

new_string:
```html
    <script src="assets/y2k/sfx.js" defer></script>
    <script src="assets/y2k/fx.js" defer></script>
    <script src="assets/y2k/hero3d.js" defer></script>
```

- [ ] **Step 3: 语法校验 + 服务验证。**

```bash
cd /Users/ruochenhua/QrcSite
node --check assets/y2k/hero3d.js && echo "hero3d.js syntax OK"
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "importmap: $(curl -s http://localhost:8000/ | grep -c 'type="importmap"')"
echo "three pinned: $(curl -s http://localhost:8000/ | grep -c 'three@0.160.0')"
echo "hero3d tag: $(curl -s http://localhost:8000/ | grep -c 'assets/y2k/hero3d.js')"
kill $SERVER_PID
```

预期输出：`hero3d.js syntax OK`，其余三项均 `>= 1`。

- [ ] **Step 4: 人工目检检查点（需要联网加载 CDN）。** 桌面 Chrome 打开主页：
  - Hero 区出现 3D 金属立体字 `QRC-EYE` 缓慢自转，下方有绿色线框网格地面延伸消失；
  - 移动鼠标，Logo 朝指针方向弹性倾斜；
  - 向下滚动，Logo 缩小并上移，让位给内容；
  - DevTools 设备模拟切到 iPhone（375px）刷新：无 3D，显示 CSS 铬渐变静态标题，控制台无报错；
  - DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` 刷新：同样为静态标题；
  - Network 面板把 `cdn.jsdelivr.net` 设为 blocked 后刷新：静态标题正常显示，控制台只有 warn/error 日志，无白屏。

- [ ] **Step 5: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add assets/y2k/hero3d.js index.html
git commit -m "feat(y2k): add Three.js hero visual with CSS fallback"
```

---

## Task 7: dev-blog 换皮

`dev-blog/index.html` 与 `dev-blog/post-template.html` 弃用 Tailwind，接入 `theme.css` + `fx.js` + `sfx.js`（与主页同一套资源，相对路径 `../assets/y2k/`）。先在 theme.css 追加 dev-blog 专用样式，再重写两个 HTML。文案结构不变（空状态文案、模板占位文案原样保留）。

**Files:**
- Modify: `assets/y2k/theme.css`
- Modify: `dev-blog/index.html`
- Modify: `dev-blog/post-template.html`

**Interfaces:**
- Consumes: theme.css 令牌与组件（Task 1）、`QRC.fx` / `QRC.sfx`（Task 3/4）
- Produces: dev-blog 专用类 `.notes-main`、`.notes-nav`、`.notes-back`、`.notes-title`、`.notes-sub`、`.note-empty`、`.post-header`、`.post-title`、`.post-date`、`.post-body`、`.prose-y2k`

**Steps:**

- [ ] **Step 1: 在 `assets/y2k/theme.css` 末尾追加 dev-blog 专用样式。** 追加到文件最末（`@media (prefers-reduced-motion: reduce)` 块之后）：

```css

/* ---------- 7. dev-blog（实验笔记） ---------- */
.notes-main {
    max-width: 56rem;
    margin: 0 auto;
    padding: 4rem 1.5rem;
}

.notes-nav {
    margin-bottom: 4rem;
}

.notes-back {
    color: var(--y2k-neon);
    font-family: var(--y2k-font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    text-decoration: none;
}

.notes-back:hover {
    text-shadow: 0 0 8px rgba(57, 255, 106, 0.5);
}

.notes-title {
    font-size: clamp(2.5rem, 8vw, 5rem);
    margin: 0 0 1rem;
}

.notes-sub {
    color: var(--y2k-muted);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-size: 0.8rem;
    margin: 0 0 4rem;
}

.note-empty {
    text-align: center;
    padding: 4rem 2rem;
}

.note-empty .card-emoji {
    display: block;
    margin-bottom: 1rem;
}

.note-empty p {
    margin: 0 0 0.5rem;
    color: var(--y2k-text);
}

.note-empty .note-empty-sub {
    color: var(--y2k-muted);
    font-size: 0.85rem;
}

/* 文章页 */
.post-header {
    max-width: 42rem;
    margin: 8rem auto 4rem;
    padding: 0 1.5rem;
}

.post-title {
    font-size: clamp(1.8rem, 5vw, 3rem);
    color: var(--y2k-chrome-1);
    margin: 0 0 1.5rem;
    line-height: 1.2;
}

.post-date {
    color: var(--y2k-neon);
    font-family: var(--y2k-font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
}

.post-body {
    max-width: 42rem;
    margin: 0 auto;
    padding: 0 1.5rem 6rem;
}

.prose-y2k {
    color: var(--y2k-text);
    line-height: 1.9;
    font-size: 1.05rem;
}

.prose-y2k p {
    margin: 0 0 1.5rem;
}

.prose-y2k h2 {
    font-size: 1.4rem;
    color: var(--y2k-chrome-1);
    margin: 3rem 0 1rem;
}

.prose-y2k h2::before {
    content: '// ';
    color: var(--y2k-neon);
}
```

- [ ] **Step 2: 完整重写 `dev-blog/index.html`：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>实验笔记 | QRC-Eye</title>
    <link rel="icon" href="../favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="../favicon.ico" type="image/x-icon">
    <meta name="description" content="QRC-Eye 的实验笔记，记录想法从草稿到原型的过程。">
    <meta name="keywords" content="实验笔记, 原型, QRC-Eye, 想法, 开发">
    <meta name="author" content="QRC-Eye">
    <meta name="robots" content="index, follow">
    <meta property="og:title" content="实验笔记 | QRC-Eye">
    <meta property="og:description" content="QRC-Eye 的实验笔记，记录想法从草稿到原型的过程。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.qrc-eye.com/dev-blog/">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="实验笔记 | QRC-Eye">
    <meta name="twitter:description" content="QRC-Eye 的实验笔记，记录想法从草稿到原型的过程。">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/y2k/theme.css">
</head>
<body>
    <main class="notes-main">
        <nav class="notes-nav">
            <a href="../index.html" class="notes-back">← Back to Home</a>
        </nav>
        <h1 class="notes-title chrome-text" data-glitch>Notes.</h1>
        <p class="notes-sub">记录想法从草稿到原型的过程</p>

        <div class="card-y2k note-empty">
            <span class="card-emoji">📝</span>
            <p>还没有实验笔记。</p>
            <p class="note-empty-sub">等有想法值得记录的时候，会放在这里。</p>
        </div>
    </main>

    <button id="sfx-toggle" class="sfx-toggle" aria-pressed="false" aria-label="开启或关闭音效">SOUND: OFF</button>

    <script src="../assets/y2k/sfx.js" defer></script>
    <script src="../assets/y2k/fx.js" defer></script>
</body>
</html>
```

- [ ] **Step 3: 完整重写 `dev-blog/post-template.html`：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文章标题 | QRC-Eye Notes</title>
    <link rel="icon" href="../favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="../favicon.ico" type="image/x-icon">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/y2k/theme.css">
</head>
<body>
    <nav class="nav-y2k" aria-label="文章导航">
        <div class="nav-inner">
            <a href="index.html" class="notes-back">← 返回列表</a>
            <div class="nav-logo">QRC<span class="neon">.</span>EYE</div>
        </div>
    </nav>
    <article>
        <header class="post-header">
            <h1 class="post-title" data-glitch>这里是你的文章大标题</h1>
            <div class="post-date">PUBLISHED ON MARCH 4, 2024</div>
        </header>
        <div class="post-body prose-y2k">
            <p>在这里开始书写你的实验笔记。记录一个想法从出现到变成原型的过程，或者只是一些零碎的思考。</p>
            <h2>小标题</h2>
            <p>正文从这里继续...</p>
        </div>
    </article>

    <button id="sfx-toggle" class="sfx-toggle" aria-pressed="false" aria-label="开启或关闭音效">SOUND: OFF</button>

    <script src="../assets/y2k/sfx.js" defer></script>
    <script src="../assets/y2k/fx.js" defer></script>
</body>
</html>
```

- [ ] **Step 4: 服务验证两个页面。**

```bash
cd /Users/ruochenhua/QrcSite
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "blog tailwind refs: $(curl -s http://localhost:8000/dev-blog/ | grep -c 'cdn.tailwindcss.com')"
echo "blog theme.css: $(curl -s http://localhost:8000/dev-blog/ | grep -c '../assets/y2k/theme.css')"
echo "blog fx.js: $(curl -s http://localhost:8000/dev-blog/ | grep -c '../assets/y2k/fx.js')"
echo "template tailwind refs: $(curl -s http://localhost:8000/dev-blog/post-template.html | grep -c 'cdn.tailwindcss.com')"
echo "template theme.css: $(curl -s http://localhost:8000/dev-blog/post-template.html | grep -c '../assets/y2k/theme.css')"
kill $SERVER_PID
```

预期输出：两个 `tailwind refs` 均为 `0`，其余均 `1`。

- [ ] **Step 5: 人工目检检查点。** 打开 `http://localhost:8000/dev-blog/`：像素体铬渐变 `Notes.` 标题、绿色返回链接、深色卡片空状态、右下角 SOUND 开关、桌面端十字光标生效。打开 `post-template.html`：顶部固定导航条、`// 小标题` 控制台装饰、正文等宽字体排版可读。

- [ ] **Step 6: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add assets/y2k/theme.css dev-blog/index.html dev-blog/post-template.html
git commit -m "feat(y2k): reskin dev-blog index and post template"
```

---

## Task 8: 游戏页面 Y2K 外壳（shell.css / shell.js）

为三个游戏页面注入共享外壳：Y2K 顶栏（返回首页 + 当前页标题）+ 每次进入时的「INSERT COIN」启动画面（点击消散）。游戏内部代码一行不动：每个游戏 `index.html` 只加一行 `<link>` 和一行 `<script defer>`，外壳 DOM 全部由 shell.js 运行时创建，ID/类名带 `y2k-` 前缀避免与游戏样式冲突。

**已知情况：`kings-field/` 目录当前在磁盘上不存在**（主页有链接、CONTEXT.md 有记录，但文件尚未落地）。本任务的 Step 4 用条件命令处理：存在则注入，不存在则跳过并在提交信息中注明；等 kings-field 页面创建时按同一两行模式补注入。

**Files:**
- Create: `assets/y2k/shell.css`
- Create: `assets/y2k/shell.js`
- Modify: `cybertravel/index.html`
- Modify: `firework-master/index.html`
- Modify: `kings-field/index.html`（仅当存在）

**Interfaces:**
- Consumes: 无（shell 自包含，不依赖 theme.css / fx.js / sfx.js，避免与游戏代码产生加载顺序耦合）
- Produces: `body.y2k-shell`、`#y2k-topbar`、`.y2k-topbar-back`、`.y2k-topbar-title`、`#y2k-boot`、`.y2k-boot-off`、`.y2k-boot-inner`、`.y2k-boot-coin`、`.y2k-boot-start`

**Steps:**

- [ ] **Step 1: 创建 `assets/y2k/shell.css`，完整内容如下。** 独立文件，自带变量（与 theme.css 同值），不依赖其他样式。

```css
/* ==========================================================================
   QRC-Eye Y2K game shell — 游戏页面外壳（顶栏 + INSERT COIN 启动画面）
   独立自包含：不依赖 theme.css，不与游戏内部样式耦合。
   所有选择器带 y2k- 前缀 / 高 z-index，避免污染游戏。
   ========================================================================== */

#y2k-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 44px;
    z-index: 99990;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 1rem;
    background: rgba(10, 12, 16, 0.92);
    border-bottom: 1px solid rgba(57, 255, 106, 0.35);
    font-family: 'Courier New', Courier, monospace;
    box-sizing: border-box;
}

.y2k-topbar-back {
    color: #39ff6a;
    text-decoration: none;
    font-size: 12px;
    letter-spacing: 0.15em;
    white-space: nowrap;
}

.y2k-topbar-back:hover {
    text-shadow: 0 0 8px rgba(57, 255, 106, 0.6);
}

.y2k-topbar-title {
    color: #9a9aa5;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* shell.js 注入成功时给 body 加此类，为顶栏腾出空间 */
body.y2k-shell {
    padding-top: 44px !important;
}

#y2k-boot {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: #0a0c10;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.4s;
}

#y2k-boot.y2k-boot-off {
    opacity: 0;
    pointer-events: none;
}

.y2k-boot-inner {
    text-align: center;
    font-family: 'Courier New', Courier, monospace;
}

.y2k-boot-coin {
    color: #ffe14d;
    font-size: 1.4rem;
    letter-spacing: 0.3em;
    margin: 0 0 1rem;
    animation: y2k-blink 1s steps(2) infinite;
}

.y2k-boot-start {
    color: #39ff6a;
    font-size: 0.85rem;
    letter-spacing: 0.25em;
    margin: 0;
}

@keyframes y2k-blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.2; }
}

@media (prefers-reduced-motion: reduce) {
    .y2k-boot-coin {
        animation: none;
    }
}
```

- [ ] **Step 2: 创建 `assets/y2k/shell.js`，完整内容如下。** 经典脚本 + `defer`，纯 DOM 创建，全部包在 try/catch 中——任何失败都只是没有外壳，游戏本身不受影响。

```js
/* ==========================================================================
   QRC-Eye Y2K game shell — 向游戏页面注入顶栏 + INSERT COIN 启动画面
   用法：游戏 index.html 的 <head> 加 shell.css，</body> 前加本脚本（defer）。
   游戏内部代码零改动；本脚本失败不影响游戏运行。
   ========================================================================== */
(function () {
    function handleError(error, functionName) {
        console.error('Error in ' + functionName + ':', error);
    }

    try {
        document.body.classList.add('y2k-shell');

        /* 顶栏：返回首页 + 当前页标题 */
        var bar = document.createElement('div');
        bar.id = 'y2k-topbar';

        var back = document.createElement('a');
        back.className = 'y2k-topbar-back';
        back.href = '../index.html';
        back.textContent = '◀ QRC-EYE';
        bar.appendChild(back);

        var title = document.createElement('span');
        title.className = 'y2k-topbar-title';
        title.textContent = document.title || '';
        bar.appendChild(title);

        document.body.appendChild(bar);

        /* INSERT COIN 启动画面：点击消散（每次进入都显示，街机仪式感；
           同时它的点击天然构成用户手势，利于游戏内音频解锁） */
        var boot = document.createElement('div');
        boot.id = 'y2k-boot';
        boot.setAttribute('role', 'button');
        boot.setAttribute('aria-label', '点击进入游戏');

        var inner = document.createElement('div');
        inner.className = 'y2k-boot-inner';

        var coin = document.createElement('p');
        coin.className = 'y2k-boot-coin';
        coin.textContent = 'INSERT COIN';
        inner.appendChild(coin);

        var start = document.createElement('p');
        start.className = 'y2k-boot-start';
        start.textContent = '▶ CLICK TO START';
        inner.appendChild(start);

        boot.appendChild(inner);
        boot.addEventListener('click', function () {
            boot.classList.add('y2k-boot-off');
            setTimeout(function () {
                if (boot.parentNode) boot.parentNode.removeChild(boot);
            }, 450);
        });
        document.body.appendChild(boot);
    } catch (error) {
        handleError(error, 'y2k-shell');
    }
})();
```

- [ ] **Step 3: 注入 `cybertravel/index.html` 与 `firework-master/index.html`（每个文件恰好两处编辑）。**

`cybertravel/index.html` 编辑 A：

old_string:
```html
<link rel="stylesheet" href="style.css">
</head>
```

new_string:
```html
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="../assets/y2k/shell.css">
</head>
```

`cybertravel/index.html` 编辑 B：

old_string:
```html
<script type="module" src="js/game.js"></script>
</body>
```

new_string:
```html
<script type="module" src="js/game.js"></script>
<script src="../assets/y2k/shell.js" defer></script>
</body>
```

`firework-master/index.html` 编辑 A：

old_string:
```html
<link rel="stylesheet" href="css/components/toast.css">
</head>
```

new_string:
```html
<link rel="stylesheet" href="css/components/toast.css">
<link rel="stylesheet" href="../assets/y2k/shell.css">
</head>
```

`firework-master/index.html` 编辑 B：

old_string:
```html
<script type="module" src="js/game.js"></script>
</body>
```

new_string:
```html
<script type="module" src="js/game.js"></script>
<script src="../assets/y2k/shell.js" defer></script>
</body>
```

- [ ] **Step 4: kings-field 条件注入。** 目录当前不存在；用条件命令探测，存在则按同一模式注入（其 `index.html` 结构未知，届时编辑点需执行者打开文件，在最后一条 `<link rel="stylesheet">` 后加 shell.css、在 `</body>` 前加 shell.js defer，old/new 模式与 Step 3 相同）：

```bash
cd /Users/ruochenhua/QrcSite
if [ -f kings-field/index.html ]; then
    echo "kings-field exists: apply the same two-line injection as Step 3"
else
    echo "kings-field/index.html not found — skipping (page not yet created)"
fi
```

预期输出：`kings-field/index.html not found — skipping (page not yet created)`。若将来文件存在，必须完成注入后再继续。

- [ ] **Step 5: 语法校验 + 服务验证。**

```bash
cd /Users/ruochenhua/QrcSite
node --check assets/y2k/shell.js && echo "shell.js syntax OK"
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "cybertravel shell.css: $(curl -s http://localhost:8000/cybertravel/ | grep -c 'assets/y2k/shell.css')"
echo "cybertravel shell.js: $(curl -s http://localhost:8000/cybertravel/ | grep -c 'assets/y2k/shell.js')"
echo "firework shell.css: $(curl -s http://localhost:8000/firework-master/ | grep -c 'assets/y2k/shell.css')"
echo "firework shell.js: $(curl -s http://localhost:8000/firework-master/ | grep -c 'assets/y2k/shell.js')"
kill $SERVER_PID
```

预期输出：`shell.js syntax OK`，其余四项均 `1`。

- [ ] **Step 6: 人工目检检查点。** 分别打开 `http://localhost:8000/cybertravel/` 和 `http://localhost:8000/firework-master/`：
  - 进入即见全屏 `INSERT COIN` 黄色闪烁 + `▶ CLICK TO START`，点击后淡出；
  - 顶部固定 44px 顶栏：左侧绿色 `◀ QRC-EYE`（点击回主页），右侧灰色游戏标题；
  - 游戏本体功能完全正常（cybertravel 可看到开局人设选择界面；firework-master 开始界面 Logo/按钮无遮挡错位）；
  - 顶栏不遮挡游戏关键内容（body 已整体下移 44px；firework-master 全屏 view 允许出现最多 44px 的纵向滚动，属可接受折衷）；
  - 控制台无报错。

- [ ] **Step 7: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add assets/y2k/shell.css assets/y2k/shell.js cybertravel/index.html firework-master/index.html
git commit -m "feat(y2k): add game page shell (topbar + INSERT COIN splash); kings-field pending (dir absent)"
```

---

## Task 9: 终验 + 更新 CONTEXT.md

全站端到端验证，并把项目结构说明更新到改造后的真实状态。

**Files:**
- Modify: `CONTEXT.md`

**Interfaces:**
- Consumes: 前 8 个任务的全部产物
- Produces: 更新后的 `CONTEXT.md` 项目结构说明

**Steps:**

- [ ] **Step 1: 全量静态检查。** 一条命令跑完所有自动验证：

```bash
cd /Users/ruochenhua/QrcSite
for f in assets/y2k/fx.js assets/y2k/sfx.js assets/y2k/hero3d.js assets/y2k/shell.js; do
    node --check "$f" && echo "OK: $f"
done
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
for page in "" "dev-blog/" "dev-blog/post-template.html" "cybertravel/" "firework-master/"; do
    echo "--- /$page"
    echo "  tailwind: $(curl -s "http://localhost:8000/$page" | grep -c 'cdn.tailwindcss.com')"
done
echo "homepage y2k assets: $(curl -s http://localhost:8000/ | grep -o 'assets/y2k/[a-z0-9.]*' | sort -u | tr '\n' ' ')"
kill $SERVER_PID
```

预期输出：四个 JS 文件均 `OK`；所有页面 `tailwind: 0`；主页 y2k 资源列表包含 `theme.css`、`fx.js`、`sfx.js`、`hero3d.js`。

- [ ] **Step 2: 人工目检总清单（本地服务 + 桌面 Chrome）。** 逐项确认：
  - 主页：SYSTEM BOOT（无痕窗口首次）、3D Hero（自转/鼠标倾斜/滚动缩小）、跑马灯、卡片 hover glitch + 扫描线、十字光标 + 星星拖尾、8-12s RGB 闪烁、SOUND 开关、移动菜单（375px 模拟）；
  - dev-blog 两页：换皮一致、光标与音效开关生效；
  - cybertravel / firework-master：INSERT COIN → 顶栏 → 游戏功能正常、可返回主页；
  - 控制台无未捕获错误（`QRC.handleError` 输出的 error 日志只允许出现在刻意断网的降级测试中）。

- [ ] **Step 3: reduced-motion 验证。** DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`，刷新主页确认：无启动画面、无 3D（静态铬标题）、无定制光标（原生光标）、跑马灯静止、区块直接可见（无淡入等待）。

- [ ] **Step 4: Lighthouse 移动端 Performance ≥ 80。** 本地服务运行中执行（需要本机装有 Chrome；`npx lighthouse` 首次运行会下载，不写入仓库依赖）：

```bash
cd /Users/ruochenhua/QrcSite
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
npx --yes lighthouse http://localhost:8000/ \
    --only-categories=performance \
    --form-factor=mobile \
    --output=cli \
    --chrome-flags="--headless=new"
kill $SERVER_PID
```

通过标准：Performance 分数 ≥ 80。若不达标，首先检查 3D 是否在移动模拟下正确降级（`max-width: 768px` 判定），再考虑压缩字重数量；不得为提分删除规格要求的功能。若本机无 Chrome / npx 不可用，记录为「环境缺失，待在有 Chrome 的机器上补测」，不得伪造结果。

- [ ] **Step 5: 更新 `CONTEXT.md` 的项目结构说明。** 将「## 项目结构」小节整段替换。old_string 是 `CONTEXT.md` 当前的 `## 项目结构` 小节（其内部本身含一个 ``` 代码块，此处用 ~~~~ 作外层围栏以避免嵌套混淆；执行编辑时 old_string/new_string 均不含外层 ~~~~ 行）：

old_string（`## 项目结构` 标题行起、到其树形代码块的结束围栏行为止，逐字匹配）：

~~~~
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
├── firework-master/    # 游戏目录（单文件 index.html 为主）
├── kings-field/        # 游戏目录（单文件 index.html，Canvas 光线投射）
├── js/                 # 网站 JS
└── dev-blog/           # 实验笔记（当前未在首页导航展示）
```
~~~~

new_string:

~~~~
## 项目结构

```
qrcsite/
├── index.html          # 主页（Y2K 换皮，手写 CSS，无 Tailwind）
├── assets/y2k/         # 全站共享 Y2K 主题包
│   ├── theme.css       # 设计令牌（配色/字体）+ 通用组件 + 页面布局
│   ├── fx.js           # 动效套件：光标+拖尾、glitch、滚动动画、启动画面、降级判定（QRC.fx.flags）
│   ├── sfx.js          # WebAudio 合成音效，默认静音（QRC.sfx）
│   ├── hero3d.js       # Three.js 主页主视觉（import map，three@0.160.0，失败降级 CSS 标题）
│   ├── shell.css       # 游戏页外壳样式（顶栏 + INSERT COIN 启动画面）
│   └── shell.js        # 游戏页外壳注入（纯 DOM 创建，游戏内部零改动）
├── cybertravel/        # 游戏目录
│   ├── index.html      # 游戏 DOM 容器（已注入 y2k shell 两行）
│   ├── style.css       # 游戏样式
│   ├── js/             # 游戏逻辑（ES Module）
│   │   ├── config.js   # 配置数据（路线/事件/物品/天气等）
│   │   ├── systems.js  # 逻辑系统（时间/事件/内容/平台/黑红）
│   │   ├── state.js    # 状态机 + 存档系统
│   │   ├── renderer.js # UI 渲染器
│   │   └── game.js     # 游戏主控 + 入口
│   ├── openspec/       # 变更管理
│   └── doc/            # 设计文档
├── firework-master/    # 游戏目录（单文件 index.html 为主，已注入 y2k shell）
├── kings-field/        # 游戏目录（规划中/未落地；落地后需注入 y2k shell）
└── dev-blog/           # 实验笔记（Y2K 换皮，当前未在首页导航展示）
```

说明：原 `js/main.js` 已被 `assets/y2k/fx.js` 吸收并删除；kings-field 目录在 2026-07 Y2K 改造时尚不存在。
~~~~

- [ ] **Step 6: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add CONTEXT.md
git commit -m "docs: update CONTEXT.md project structure for y2k theme package"
```

---

## 完成定义（Definition of Done）

- [ ] 9 个任务全部按序完成，各自验证步骤通过
- [ ] 四个 JS 文件 `node --check` 通过；所有页面无 Tailwind 引用
- [ ] 桌面端主页：BOOT → 3D Hero → 全部动效生效；移动端/reduced-motion/CDN 断网三种降级均验证
- [ ] 两个游戏页外壳注入且游戏功能无损；kings-field 缺席已记录
- [ ] Lighthouse 移动端 Performance ≥ 80（或如实记录环境缺失）
- [ ] `CONTEXT.md` 结构说明已更新
- [ ] 每个任务一个 commit，共 9 个 commit
