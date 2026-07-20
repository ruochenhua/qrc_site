# Dev-Blog System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 QRC-Eye 建立「Markdown 写作 + 本地 Python 生成静态页」的 dev-blog 系统：`dev-blog/src/*.md`（front matter + 正文）经 `tools/build-blog.py` 生成文章页、列表页、RSS 与主页「最新笔记」区块；主页导航加入口。仓库产物保持纯静态，GitHub Pages 零构建。

**Architecture:**

```
tools/
├── build-blog.py        # 唯一生成器（Python 3 标准库 + markdown + pygments）
└── requirements.txt     # 钉版本：markdown==3.7, pygments==2.18.0
.venv/                   # 本地隔离环境（入 .gitignore，不入库）
dev-blog/
├── index.html           # 列表页（生成器整页重写，不再手写）
├── post-template.html   # 文章页结构参考（生成器内嵌模板以其为蓝本，本文件保持不动）
├── posts/<slug>.html    # 生成的文章页（相对资源前缀为 ../../）
├── feed.xml             # RSS 2.0（生成器产出）
└── src/<slug>.md        # Markdown 源文件（--- 围栏 front matter + 正文）
index.html               # 主页：导航手写加「笔记」；BLOG-LATEST 标记区间由生成器重写
```

- 生成器流程：`load_posts()`（解析 + 校验全部源文件，任一失败即非零退出、不写任何文件）→ 逐篇 `render_post_page()` → `clean_stale_posts()` 清理孤儿文章页 → `render_list_page()` → `render_feed()` → `update_homepage()`（只重写 `<!-- BLOG-LATEST:START/END -->` 之间）。
- 输出完全确定性（不含当前时间戳；RSS pubDate 由文章日期派生），保证连续运行两次产物字节一致。
- 代码高亮在生成时完成（codehilite + pygments 产出静态 `<span>`），不引入运行时高亮库；样式追加到 `assets/y2k/theme.css`。

**Tech Stack:** Python 3.10（本机 3.10.11）+ `markdown==3.7` + `pygments==2.18.0`（装 `.venv/`）；纯静态 HTML/CSS/JS；沿用现有 Y2K 主题（`assets/y2k/theme.css`、`fx.js`）；GitHub Pages 托管。

**已钉死的选型决策**（规格留有余地的项，本计划定案，执行者照抄，不得改选）：

| 项 | 决策 |
|---|---|
| Front matter 解析 | **手写最小解析器**（`---` 围栏 + `key: value` + `[a, b]` 列表），不用 YAML 库、不用 markdown Meta 扩展 |
| 依赖版本 | `markdown==3.7`、`pygments==2.18.0`（与 Python 3.10 兼容） |
| Markdown 扩展 | `["extra", "toc", "codehilite"]`；配置 `toc: {toc_depth: "2-2"}`、`codehilite: {guess_lang: False, css_class: "codehilite"}` |
| TOC 显示条件 | `md.toc_tokens` 顶层条目数（= h2 数量）`>= 3` 才渲染 `.post-toc` 区块 |
| TOC HTML 来源 | 直接用 `md.toc`（`<div class="toc">…`），样式走 `.post-toc .toc` |
| 文章页/列表页模板 | 内嵌为 `build-blog.py` 中的 Python 字符串常量（`POST_PAGE_TEMPLATE` / `LIST_PAGE_TEMPLATE`），`post-template.html` 仅作结构蓝本保持不动 |
| 标签筛选 JS | 写进 `assets/y2k/fx.js` 的 `initBlogFilter()`，`#tag-filter` 守卫，沿用 `QRC.handleError` 模式 |
| 主页集成 | 导航与 BLOG-LATEST 区块外壳手写一次；生成器只重写标记区间 |
| RSS | 固定 channel 信息，不写 `lastBuildDate`（幂等）；item pubDate = 文章日期 12:00 +0800 的 RFC 822 |
| 日期显示 | 全站统一 ISO：`PUBLISHED ON 2026-07-19`，不做本地化处理 |

## Global Constraints

（以下来自已批准规格 `docs/superpowers/specs/2026-07-19-dev-blog-system-design.md` 的「约束」与相关小节，逐条约束所有任务）

1. **仓库产物保持纯静态**：GitHub Pages 零构建；`tools/` 与 `.venv/` 仅为本地工具；`.venv/` 必须加入 `.gitignore`，绝不入库。
2. **不引入 npm/node 依赖、不引入运行时高亮库**：代码高亮全部由生成器在构建时完成；不引入任何测试框架。
3. **Python 依赖仅两个**：`markdown`、`pygments`，装入项目本地 `.venv/`，`tools/requirements.txt` 钉版本；脚本调用统一为 `.venv/bin/python tools/build-blog.py`。
4. **先校验后产出**：缺必填字段（`title`/`date`/`description`）、日期格式错误、slug 非法或重复时，脚本打印全部错误并非零退出，不产出半成品（`load_posts()` 在任何写文件之前完成全部校验）。
5. **沿用 Y2K 主题与降级逻辑**：新 CSS 只用 `:root` 已有变量（`--y2k-*`），禁止散落硬编码颜色；JS 沿用 `QRC.handleError(error, functionName)` 模式与 fx.js 的守卫式初始化风格；中文文案规范与全站一致。
6. **生成器输出确定性**：任何生成文件不得包含运行时刻的时间戳或随机内容，保证幂等——连续运行两次，`git status --porcelain` 为空。
7. **验证手段不变**：`node --check`（JS 文件）、`python3 -m http.server` + `curl -s | grep`、生成器自校验与幂等性检查。每个验证步骤给出确切命令和预期输出。
8. **手写区与生成区边界**：`index.html` 只有 BLOG-LATEST 标记区间允许被生成器改写，其余部分手写不动；`dev-blog/index.html`、`dev-blog/posts/*.html`、`dev-blog/feed.xml` 为生成产物，不再手写。

## 命名总表（所有任务必须一致引用）

**Python（`tools/build-blog.py`）：**

| 名称 | 定义于 | 说明 |
|---|---|---|
| `ROOT` / `SRC_DIR` / `POSTS_DIR` / `LIST_PAGE` / `FEED_FILE` / `HOME_PAGE` | Task 1 | 路径常量（`Path`），`SRC_DIR = ROOT/"dev-blog"/"src"` 等 |
| `SITE_URL` / `BLOG_URL` | Task 1 | `"https://www.qrc-eye.com"`、`SITE_URL + "/dev-blog/"` |
| `SLUG_RE` / `DATE_RE` / `TAG_RE` / `REQUIRED_FIELDS` / `TOC_MIN_H2` | Task 1 | `^[a-z0-9]+(-[a-z0-9]+)*$`、`^\d{4}-\d{2}-\d{2}$`、同 SLUG_RE、`("title", "date", "description")`、`3` |
| `HOME_START_MARK` / `HOME_END_MARK` | Task 1 | `<!-- BLOG-LATEST:START -->` / `<!-- BLOG-LATEST:END -->` |
| `BuildError` | Task 1 | 校验/解析异常 |
| `parse_front_matter(text, path)` → `(meta, body)` | Task 1 | 手写最小解析器 |
| `validate_post(meta, slug, path)` → `list[str]` | Task 1 | 返回错误列表（空 = 合法） |
| `load_posts()` → `list[dict]` | Task 1 | 解析 + 校验全部源文件，日期倒序；任一错误 → 打印并 `SystemExit(1)` |
| `MD_EXTENSIONS` / `MD_EXTENSION_CONFIGS` | Task 2 | 见「已钉死的选型决策」 |
| `render_markdown(body)` → `(body_html, toc_html, h2_count)` | Task 2 | 每次调用新建 `markdown.Markdown` 实例 |
| `render_tag_badges(tags)` → `str` | Task 2 | 一串 `<span class="tag-badge">` |
| `POST_PAGE_TEMPLATE` | Task 2 | 文章页模板字符串（相对资源前缀 `../../`） |
| `render_post_page(post)` → `Path` | Task 2 | 写 `dev-blog/posts/<slug>.html` |
| `clean_stale_posts(slugs)` | Task 2 | 删除没有对应源文件的已生成文章页 |
| `LIST_PAGE_TEMPLATE` / `collect_tags(posts)` / `render_tag_filter(tags)` / `render_post_card(post, posts_prefix="posts/")` / `render_list_page(posts)` | Task 4 | 列表页生成 |
| `FEED_TEMPLATE` / `render_feed(posts)` | Task 5 | RSS 生成 |
| `HOME_PLACEHOLDER` / `render_home_latest(posts)` / `replace_marked_region(original, start_mark, end_mark, inner)` / `update_homepage(posts)` | Task 6 | 主页集成 |
| `main()` | Task 1 起逐任务扩展 | 总入口 |

**post dict 键**：`slug`、`title`、`date`（`datetime.date`）、`date_iso`（str）、`tags`（list[str]）、`description`、`body`（Markdown 正文）。

**Front matter 字段**（源文件契约）：`title`（必填）、`date`（必填，YYYY-MM-DD）、`tags`（可选，`[a, b]` 列表，元素同 slug 规则）、`description`（必填，一句话摘要）。

**CSS 新类（全部追加到 `assets/y2k/theme.css`，Task 3）：** `.codehilite`（+ 其下 pygments token 类 `.k`/`.s*`/`.c*`/`.nf` 等）、`.post-layout`、`.post-toc`、`.post-toc-title`、`.post-tags`、`.tag-badge`、`#tag-filter`、`.tag-filter-btn`（`.active`）、`.notes-grid`、`.note-card`（与 `.card-y2k` 组合使用）、`.note-card-top`、`.note-card-date`、`.note-card-tags`、`.note-card-hidden`、`.notes-placeholder`；`.prose-y2k` 扩展子选择器（`h3`/`ul`/`ol`/`li`/`a`/`code`/`blockquote`/`hr`）。

**JS：** `initBlogFilter()`（`fx.js` 内部函数，注册进 `QRC.fx` 的 `init()`，守卫 `#tag-filter` 存在）。

**HTML 契约：** 主页标记 `<!-- BLOG-LATEST:START -->` / `<!-- BLOG-LATEST:END -->`；列表页卡片 `data-tags="tag1 tag2"`；筛选按钮 `data-tag="<tag>"`，「全部」按钮 `data-tag="all"`（`all` 为保留值，不校验、不允许作为文章标签——写文时自查）；文章页 TOC 容器 `.post-toc` 内嵌 `md.toc` 产出的 `<div class="toc">`。

---

## Task 1: 工具链 —— `requirements.txt`、`.gitignore`、`.venv`、`build-blog.py` 骨架（解析 + 校验）

建立本地 Python 工具链，并写出生成器的第一段：常量、front matter 最小解析器、字段校验、`load_posts()`。本任务结束时脚本可运行：扫描 `dev-blog/src/`（暂为空或不存在），打印校验通过的文章数。

**Files:**
- Create: `tools/requirements.txt`
- Create: `.gitignore`
- Create: `tools/build-blog.py`
- Create（本地、不入库）: `.venv/`

**Interfaces:**
- Consumes: 无（`dev-blog/src/` 尚不存在时按 0 篇处理）
- Produces: 命名总表中 Task 1 标记的全部常量、`BuildError`、`parse_front_matter()`、`validate_post()`、`load_posts()`、`main()`；可用的 `.venv/bin/python`

**Steps:**

- [ ] **Step 1: 创建 `tools/requirements.txt`。** 完整内容：

```
markdown==3.7
pygments==2.18.0
```

- [ ] **Step 2: 创建 `.gitignore`。** 仓库当前没有 `.gitignore`，新建，完整内容：

```
# Local Python toolchain for tools/build-blog.py (never committed)
.venv/
```

- [ ] **Step 3: 建虚拟环境并装依赖。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python -c "import markdown, pygments; print(markdown.__version__, pygments.__version__)"
```

预期输出最后一行：`3.7 2.18.0`。

- [ ] **Step 4: 创建 `tools/build-blog.py`（骨架）。** 完整内容：

```python
#!/usr/bin/env python3
"""build-blog.py - QRC-Eye dev-blog static generator.

Reads Markdown sources from dev-blog/src/, validates front matter, and
regenerates post pages, the list page, the RSS feed and the homepage
"latest notes" block. This is a build-time tool only: the committed site
stays fully static.

Usage: .venv/bin/python tools/build-blog.py
"""

import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "dev-blog" / "src"
POSTS_DIR = ROOT / "dev-blog" / "posts"
LIST_PAGE = ROOT / "dev-blog" / "index.html"
FEED_FILE = ROOT / "dev-blog" / "feed.xml"
HOME_PAGE = ROOT / "index.html"

SITE_URL = "https://www.qrc-eye.com"
BLOG_URL = SITE_URL + "/dev-blog/"

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TAG_RE = SLUG_RE
REQUIRED_FIELDS = ("title", "date", "description")
TOC_MIN_H2 = 3

HOME_START_MARK = "<!-- BLOG-LATEST:START -->"
HOME_END_MARK = "<!-- BLOG-LATEST:END -->"


class BuildError(Exception):
    """Raised when a source file or the homepage fails validation."""


def parse_front_matter(text, path):
    """Split the `---` fenced front matter from the Markdown body.

    Minimal parser, no YAML dependency: every line inside the fence must be
    `key: value`; the only list syntax supported is `[a, b, c]`.
    Returns (meta, body). Raises BuildError on malformed input.
    """
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        raise BuildError(f"{path}: missing opening '---' front matter fence")
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        raise BuildError(f"{path}: missing closing '---' front matter fence")
    meta = {}
    for lineno, line in enumerate(lines[1:end], start=2):
        if not line.strip():
            continue
        if ":" not in line:
            raise BuildError(
                f"{path}:{lineno}: front matter line is not 'key: value': {line!r}"
            )
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if not key:
            raise BuildError(f"{path}:{lineno}: empty front matter key")
        if value.startswith("[") and value.endswith("]"):
            items = [item.strip() for item in value[1:-1].split(",")]
            meta[key] = [item for item in items if item]
        else:
            meta[key] = value
    body = "\n".join(lines[end + 1:]).strip() + "\n"
    return meta, body


def validate_post(meta, slug, path):
    """Return a list of validation error strings (empty list = valid)."""
    errors = []
    if not SLUG_RE.match(slug):
        errors.append(
            f"{path}: invalid slug {slug!r} (must match {SLUG_RE.pattern})"
        )
    for field in REQUIRED_FIELDS:
        if field not in meta or not str(meta[field]).strip():
            errors.append(f"{path}: missing required field {field!r}")
    raw_date = str(meta.get("date", "")).strip()
    if raw_date:
        if not DATE_RE.match(raw_date):
            errors.append(f"{path}: invalid date {raw_date!r} (expected YYYY-MM-DD)")
        else:
            try:
                date.fromisoformat(raw_date)
            except ValueError:
                errors.append(
                    f"{path}: invalid date {raw_date!r} (not a real calendar date)"
                )
    tags = meta.get("tags", [])
    if not isinstance(tags, list):
        errors.append(
            f"{path}: 'tags' must be a list like [game-design, firework-master]"
        )
    else:
        for tag in tags:
            if not TAG_RE.match(tag):
                errors.append(
                    f"{path}: invalid tag {tag!r} (must match {TAG_RE.pattern})"
                )
    return errors


def load_posts():
    """Parse and validate every dev-blog/src/*.md before anything is written.

    Prints all errors and exits 1 if any file is invalid (no partial output).
    Returns posts sorted by date descending. Each post is a dict with keys:
    slug, title, date (datetime.date or None), date_iso, tags, description,
    body.
    """
    errors = []
    posts = []
    seen_slugs = set()
    md_files = sorted(SRC_DIR.glob("*.md")) if SRC_DIR.is_dir() else []
    for md_file in md_files:
        slug = md_file.stem
        try:
            meta, body = parse_front_matter(
                md_file.read_text(encoding="utf-8"), md_file
            )
        except BuildError as exc:
            errors.append(str(exc))
            continue
        errors.extend(validate_post(meta, slug, md_file))
        if slug in seen_slugs:
            errors.append(f"{md_file}: duplicate slug {slug!r}")
        seen_slugs.add(slug)
        raw_date = str(meta.get("date", "")).strip()
        try:
            parsed_date = date.fromisoformat(raw_date) if DATE_RE.match(raw_date) else None
        except ValueError:
            parsed_date = None
        raw_tags = meta.get("tags", [])
        posts.append(
            {
                "slug": slug,
                "title": str(meta.get("title", "")).strip(),
                "date": parsed_date,
                "date_iso": raw_date,
                "tags": raw_tags if isinstance(raw_tags, list) else [],
                "description": str(meta.get("description", "")).strip(),
                "body": body,
            }
        )
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    posts.sort(key=lambda p: p["date_iso"], reverse=True)
    return posts


def main():
    posts = load_posts()
    print(f"build-blog: {len(posts)} post(s) validated")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: 验证骨架可运行且校验生效。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
.venv/bin/python tools/build-blog.py; echo "exit=$?"
```

预期输出：`build-blog: 0 post(s) validated`，`exit=0`。

再验证错误报告路径（临时文件，测完即删）：

```bash
cd /Users/ruochenhua/QrcSite
mkdir -p dev-blog/src
cat > dev-blog/src/Bad_Test.md <<'EOF'
---
title: 坏文章
date: not-a-date
---
正文
EOF
.venv/bin/python tools/build-blog.py; echo "exit=$?"
rm dev-blog/src/Bad_Test.md
rmdir dev-blog/src
```

预期输出：`ERROR: dev-blog/src/Bad_Test.md: invalid slug 'Bad_Test' ...`、`ERROR: ... missing required field 'description'`、`ERROR: ... invalid date 'not-a-date' ...` 共 3 条错误，`exit=1`；随后文件已删除、目录已移除。

- [ ] **Step 6: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add tools/requirements.txt tools/build-blog.py .gitignore
git status --porcelain
git commit -m "build(blog): add build toolchain and validated markdown loader"
```

`git status --porcelain` 的预期输出中**不得**出现 `.venv/`（确认 .gitignore 生效）。

---

## Task 2: 文章页生成 —— Markdown 渲染、`POST_PAGE_TEMPLATE`、TOC、标签徽章 + 示例文章

给生成器加上 Markdown → HTML 渲染（extra/toc/codehilite）与文章页模板渲染，并创建第一篇真实示例文章用于端到端验证。注意：生成的文章页位于 `dev-blog/posts/`，比 `post-template.html` 深一级，所有相对资源路径用 `../../`（模板蓝本里是 `../`）。本任务产出的文章页引用的 `.post-toc` / `.tag-badge` / `.codehilite` 样式在 Task 3 才落地，本任务只验证结构标记存在。

**Files:**
- Modify: `tools/build-blog.py`
- Create: `dev-blog/src/firework-master-dev-notes-1.md`
- Create（生成产物）: `dev-blog/posts/firework-master-dev-notes-1.html`

**Interfaces:**
- Consumes: Task 1 的 `load_posts()`、常量与 post dict 契约
- Produces: `MD_EXTENSIONS`、`MD_EXTENSION_CONFIGS`、`render_markdown()`、`render_tag_badges()`、`POST_PAGE_TEMPLATE`、`render_post_page()`、`clean_stale_posts()`；生成文章页结构钩子 `.post-header`/`.post-date`/`.post-tags`/`.post-toc`/`.post-body .prose-y2k`/`.codehilite`（Task 3 为其写样式）

**Steps:**

- [ ] **Step 1: 修改 `tools/build-blog.py` 的 import 区。** 用 Edit 把：

```python
import re
import sys
from datetime import date
from pathlib import Path
```

替换为：

```python
import html as html_lib
import re
import sys
from datetime import date
from pathlib import Path

import markdown
```

- [ ] **Step 2: 在 `def main():` 之前插入渲染常量与函数。** 即在 `def main():` 行前插入以下完整代码（保持其后原有的 `main()` 与 `if __name__` 不动）：

```python
MD_EXTENSIONS = ["extra", "toc", "codehilite"]
MD_EXTENSION_CONFIGS = {
    "toc": {"toc_depth": "2-2"},
    "codehilite": {"guess_lang": False, "css_class": "codehilite"},
}


def render_markdown(body):
    """Render a Markdown body to HTML.

    Returns (body_html, toc_html, h2_count). A fresh Markdown instance is
    created per call (converter state is not reusable across documents).
    With toc_depth "2-2", top-level toc tokens correspond to h2 headings.
    """
    md = markdown.Markdown(
        extensions=MD_EXTENSIONS, extension_configs=MD_EXTENSION_CONFIGS
    )
    body_html = md.convert(body)
    return body_html, md.toc, len(md.toc_tokens)


def render_tag_badges(tags):
    """Render the tag badge row for a post (empty string when no tags)."""
    return "".join(
        f'<span class="tag-badge">{html_lib.escape(tag)}</span>' for tag in tags
    )


POST_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | QRC-Eye Notes</title>
    <link rel="icon" href="../../favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="../../favicon.ico" type="image/x-icon">
    <meta name="description" content="{description}">
    <meta name="author" content="QRC-Eye">
    <meta property="og:title" content="{title} | QRC-Eye Notes">
    <meta property="og:description" content="{description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="{post_url}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="{title} | QRC-Eye Notes">
    <meta name="twitter:description" content="{description}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../assets/y2k/theme.css">
</head>
<body>
    <nav class="nav-y2k" aria-label="文章导航">
        <div class="nav-inner">
            <a href="../index.html" class="notes-back">← 返回列表</a>
            <div class="nav-logo">QRC<span class="neon">.</span>EYE</div>
        </div>
    </nav>
    <article>
        <header class="post-header">
            <h1 class="post-title" data-glitch>{title}</h1>
            <div class="post-date">PUBLISHED ON {date_iso}</div>
            <div class="post-tags">{tag_badges}</div>
        </header>
        {content_block}
    </article>

    <button id="sfx-toggle" class="sfx-toggle" aria-pressed="false" aria-label="开启或关闭音效">SOUND: OFF</button>

    <script src="../../assets/y2k/sfx.js" defer></script>
    <script src="../../assets/y2k/fx.js" defer></script>
</body>
</html>
"""


def render_post_page(post):
    """Render one post to dev-blog/posts/<slug>.html. Returns the path written."""
    body_html, toc_html, h2_count = render_markdown(post["body"])
    body_block = '<div class="post-body prose-y2k">\n' + body_html + "        </div>"
    if h2_count >= TOC_MIN_H2:
        toc_block = (
            '<aside class="post-toc" aria-label="文章目录">\n'
            '                <p class="post-toc-title">目录</p>\n'
            "                "
            + toc_html.replace("\n", "\n                ").rstrip()
            + "\n            </aside>"
        )
        content_block = (
            '<div class="post-layout">\n            '
            + toc_block
            + "\n            "
            + body_block
            + "\n        </div>"
        )
    else:
        content_block = body_block
    page = POST_PAGE_TEMPLATE.format(
        title=html_lib.escape(post["title"]),
        description=html_lib.escape(post["description"], quote=True),
        date_iso=post["date_iso"],
        tag_badges=render_tag_badges(post["tags"]),
        post_url=BLOG_URL + "posts/" + post["slug"] + ".html",
        content_block=content_block,
    )
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = POSTS_DIR / (post["slug"] + ".html")
    out_path.write_text(page, encoding="utf-8")
    return out_path


def clean_stale_posts(slugs):
    """Delete generated post pages whose source md no longer exists."""
    if not POSTS_DIR.is_dir():
        return
    for html_file in sorted(POSTS_DIR.glob("*.html")):
        if html_file.stem not in slugs:
            html_file.unlink()
            print(f"build-blog: removed stale {html_file.relative_to(ROOT)}")


```

（末尾的空行属于插入内容：使 `clean_stale_posts` 与后面的 `main()` 之间保持两个空行。）

- [ ] **Step 3: 替换 `main()`。** 用 Edit 把：

```python
def main():
    posts = load_posts()
    print(f"build-blog: {len(posts)} post(s) validated")
```

替换为：

```python
def main():
    posts = load_posts()
    for post in posts:
        out_path = render_post_page(post)
        print(f"build-blog: wrote {out_path.relative_to(ROOT)}")
    clean_stale_posts({post["slug"] for post in posts})
    print(f"build-blog: done, {len(posts)} post(s)")
```

- [ ] **Step 4: 创建示例文章 `dev-blog/src/firework-master-dev-notes-1.md`。** 这是一篇真实文章（以后可删改），刻意包含 4 个 h2（触发 TOC）和一个 python 代码围栏（触发高亮）。完整内容（外层 ~~~~ 仅为避免嵌套围栏混淆，写入文件时不含 ~~~~ 行）：

~~~~markdown
---
title: 烟花大师开发笔记 #1：评分公式怎么定
date: 2026-07-19
tags: [game-design, firework-master]
description: 第一篇开发笔记：烟花大师的评分公式为什么用连续值匹配，以及调参时踩过的坑。
---

烟花大师的核心循环是「组装烟花 → 参加比赛 → 拿名气和资金」。让这套循环转起来的关键是评分公式：它决定了玩家每一次组装决策会得到什么反馈。这篇笔记记录评分公式从拍脑袋到定稿的过程。

## 为什么不用阈值判定

最早的版本是阈值式的：高度超过 80 得满分，否则线性衰减。玩起来感觉「要么满分要么垃圾」，中间态毫无区分度，玩家凑出一个达标配方后就不再尝试新组合。

阈值的问题在于它把连续的属性空间切成了阶梯。烟花的高度、规模、颜色、持续时间、特效是五个连续维度，玩家真正有意思的是「再改一点点会不会更好」的探索感，阶梯式评分直接掐死了这个动机。

## 连续值匹配的思路

定稿方案是连续值匹配：每个事件对五个维度各有一个偏好值，玩家烟花属性与偏好的拟合度决定得分。偏离越小分越高，偏离方向不重要——超配和欠配同样扣分。

核心计算大概长这样：

```python
def dimension_score(actual: float, preferred: float, tolerance: float) -> float:
    """单维度得分：偏离越少分越高，超出容差为 0。"""
    deviation = abs(actual - preferred)
    if deviation >= tolerance:
        return 0.0
    return 1.0 - (deviation / tolerance) ** 2
```

用平方而不是线性，是为了让「差一点」和「差很多」的手感差异更明显：接近偏好时曲线平缓（鼓励微调），远离偏好时快速衰减。

## 复杂度奖励与重复惩罚

光有拟合度会导致最优解永远是「单发贴脸配方」，表演毫无观赏性。所以总分里加了两项：

- 复杂度奖励：节目单里烟花弹数量、组件种类越多，加成越高，但有上限；
- 重复惩罚：同一配方重复出现会递减得分，逼玩家为一场表演设计多个不同烟花。

## 调参时踩过的坑

最大的坑是容差（tolerance）的取值：定得太宽，玩家随便装都能拿高分，赛事没有挑战性；定得太窄，预算限制的赛事根本完不成。最后的做法是每个职业等级一套容差基准——学徒宽、大师窄，让评分难度跟着玩家成长曲线走。

另一个教训是评分结果必须可解释。得分界面会逐维度显示拟合度条，玩家能看到「颜色差了一点」，而不是一个莫名其妙的总分——否则公式调得再好，玩家也学不会怎么改进。

下一篇打算写 Canvas 粒子表演的渲染管线，以及二次爆炸（多层壳）是怎么在粒子上实现的。
~~~~

- [ ] **Step 5: 运行生成器并验证文章页结构。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
.venv/bin/python tools/build-blog.py; echo "exit=$?"
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
PAGE=http://localhost:8000/dev-blog/posts/firework-master-dev-notes-1.html
echo "title: $(curl -s $PAGE | grep -c '<title>烟花大师开发笔记 #1：评分公式怎么定 | QRC-Eye Notes</title>')"
echo "toc: $(curl -s $PAGE | grep -c 'class="post-toc"')"
echo "toc links: $(curl -s $PAGE | grep -c 'class="toc"')"
echo "codehilite: $(curl -s $PAGE | grep -c 'class="codehilite"')"
echo "h2 anchors: $(curl -s $PAGE | grep -o 'id="[^"]*"' | grep -c '')"
echo "tag badges: $(curl -s $PAGE | grep -o 'class="tag-badge"' | wc -l | tr -d ' ')"
echo "date: $(curl -s $PAGE | grep -c 'PUBLISHED ON 2026-07-19')"
echo "asset prefix: $(curl -s $PAGE | grep -c 'href="../../assets/y2k/theme.css"')"
kill $SERVER_PID
```

预期输出：`exit=0`；生成器打印 `build-blog: wrote dev-blog/posts/firework-master-dev-notes-1.html` 与 `build-blog: done, 1 post(s)`；`title: 1`、`toc: 1`、`toc links: 1`、`codehilite: 1`、`h2 anchors` ≥ 4（四个 h2 都有 id）、`tag badges: 2`、`date: 1`、`asset prefix: 1`。

- [ ] **Step 6: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add tools/build-blog.py dev-blog/src/firework-master-dev-notes-1.md dev-blog/posts/firework-master-dev-notes-1.html
git commit -m "feat(blog): render post pages from markdown with toc and tag badges"
```

---

## Task 3: `theme.css` 追加 —— pygments Y2K 配色、TOC、标签徽章/筛选、博客卡片

把 dev-blog 生成产物所需的全部样式追加到 `assets/y2k/theme.css` 末尾。只用已有 `--y2k-*` 变量，命名沿用现有风格。本任务不改任何 HTML/JS/Python。

**Files:**
- Modify: `assets/y2k/theme.css`

**Interfaces:**
- Consumes: Task 2 产出的结构钩子（`.post-toc`、`.tag-badge`、`.codehilite`）；命名总表中的新 CSS 类清单
- Produces: Task 4（列表页）、Task 6（主页区块）要用的 `#tag-filter`、`.tag-filter-btn`、`.notes-grid`、`.note-card*`、`.note-card-hidden`、`.notes-placeholder` 样式

**Steps:**

- [ ] **Step 1: 在 `assets/y2k/theme.css` 文件末尾追加以下内容。** 当前文件以 `.prose-y2k h2::before { … }` 块结束（第 879 行附近），在其后追加一整个新段落：

```css

/* ---------- 8. dev-blog 生成器组件（tools/build-blog.py 产物） ---------- */

/* 标签徽章（复用 .badge-led 风格，换冷蓝、无 LED 灯） */
.tag-badge {
    display: inline-flex;
    align-items: center;
    font-family: var(--y2k-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10px;
    color: var(--y2k-blue);
    border: 1px solid rgba(125, 162, 255, 0.4);
    background: rgba(125, 162, 255, 0.06);
    padding: 3px 8px;
}

/* 文章页头部标签行 */
.post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1.25rem;
}

/* 文章页带 TOC 时的双栏布局（无 TOC 时不用 .post-layout） */
.post-layout {
    display: grid;
    grid-template-columns: minmax(0, 42rem);
    justify-content: center;
    gap: 2.5rem;
    padding: 0 1.5rem 6rem;
}

@media (min-width: 1024px) {
    .post-layout {
        grid-template-columns: 14rem minmax(0, 42rem);
        gap: 3rem;
    }
}

.post-layout .post-body {
    margin: 0;
    padding: 0;
}

/* TOC 区块（移动端在正文上方，桌面端左侧 sticky） */
.post-toc {
    align-self: start;
    border: 1px solid rgba(154, 154, 165, 0.35);
    background: var(--y2k-panel);
    padding: 1.25rem 1.5rem;
}

@media (min-width: 1024px) {
    .post-toc {
        position: sticky;
        top: 6rem;
    }
}

.post-toc-title {
    font-family: var(--y2k-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.75rem;
    color: var(--y2k-neon);
    margin: 0 0 0.75rem;
}

.post-toc .toc ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.post-toc .toc li {
    margin: 0 0 0.5rem;
}

.post-toc .toc a {
    color: var(--y2k-muted);
    text-decoration: none;
    font-size: 0.85rem;
    line-height: 1.5;
}

.post-toc .toc a:hover {
    color: var(--y2k-neon);
}

/* 标签筛选条（列表页） */
#tag-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin: 0 0 2.5rem;
}

.tag-filter-btn {
    font-family: var(--y2k-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    color: var(--y2k-muted);
    background: none;
    border: 1px solid rgba(154, 154, 165, 0.4);
    padding: 0.4rem 0.9rem;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
}

.tag-filter-btn:hover {
    color: var(--y2k-neon);
    border-color: var(--y2k-neon);
}

.tag-filter-btn.active {
    color: var(--y2k-neon);
    border-color: var(--y2k-neon);
    background: rgba(57, 255, 106, 0.06);
}

/* 博客卡片列表（列表页单列，主页复用 .cards-grid 多列） */
.notes-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
}

.note-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
}

.note-card-date {
    font-family: var(--y2k-font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    color: var(--y2k-neon);
}

.note-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

/* 标签筛选隐藏态（fx.js initBlogFilter 切换） */
.note-card-hidden {
    display: none;
}

/* 主页「最新笔记」空占位 */
.notes-placeholder {
    max-width: 64rem;
    margin: 0 auto;
    text-align: center;
    color: var(--y2k-muted);
}

/* .prose-y2k 扩展：Markdown 正文常见元素 */
.prose-y2k h3 {
    font-size: 1.1rem;
    color: var(--y2k-chrome-1);
    margin: 2rem 0 0.75rem;
}

.prose-y2k ul,
.prose-y2k ol {
    margin: 0 0 1.5rem;
    padding-left: 1.5rem;
}

.prose-y2k li {
    margin-bottom: 0.5rem;
}

.prose-y2k a {
    color: var(--y2k-blue);
}

.prose-y2k a:hover {
    color: var(--y2k-neon);
}

.prose-y2k strong {
    color: var(--y2k-chrome-1);
}

.prose-y2k blockquote {
    margin: 0 0 1.5rem;
    padding: 0.5rem 0 0.5rem 1.25rem;
    border-left: 2px solid var(--y2k-neon);
    color: var(--y2k-muted);
}

.prose-y2k hr {
    border: none;
    border-top: 1px solid rgba(154, 154, 165, 0.35);
    margin: 2.5rem 0;
}

/* 行内代码 */
.prose-y2k code {
    font-family: var(--y2k-font-mono);
    font-size: 0.9em;
    color: var(--y2k-neon);
    background: rgba(57, 255, 106, 0.08);
    padding: 0.1em 0.35em;
}

/* 代码块（codehilite 生成时高亮，静态 <span> 标记） */
.codehilite {
    background: var(--y2k-panel);
    border: 1px solid rgba(154, 154, 165, 0.35);
    margin: 0 0 1.5rem;
    overflow-x: auto;
}

.codehilite pre {
    margin: 0;
    padding: 1rem 1.25rem;
    font-family: var(--y2k-font-mono);
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--y2k-text);
}

.codehilite code {
    color: inherit;
    background: none;
    padding: 0;
}

/* pygments token 配色（Y2K：蓝关键字 / 黄字符串与数字 / 绿函数 / 灰注释） */
.codehilite .k,
.codehilite .kc,
.codehilite .kd,
.codehilite .kn,
.codehilite .kp,
.codehilite .kr,
.codehilite .kt {
    color: var(--y2k-blue);
}

.codehilite .s,
.codehilite .sa,
.codehilite .sb,
.codehilite .sc,
.codehilite .dl,
.codehilite .sd,
.codehilite .s1,
.codehilite .s2,
.codehilite .se,
.codehilite .sh,
.codehilite .si,
.codehilite .sr,
.codehilite .ss,
.codehilite .sx {
    color: var(--y2k-yellow);
}

.codehilite .c,
.codehilite .ch,
.codehilite .cm,
.codehilite .c1,
.codehilite .cp,
.codehilite .cpf,
.codehilite .cs {
    color: var(--y2k-muted);
    font-style: italic;
}

.codehilite .nf,
.codehilite .fm {
    color: var(--y2k-neon);
}

.codehilite .m,
.codehilite .mb,
.codehilite .mf,
.codehilite .mh,
.codehilite .mi,
.codehilite .il,
.codehilite .mo {
    color: var(--y2k-yellow);
}

.codehilite .nb,
.codehilite .bp,
.codehilite .nc,
.codehilite .nn,
.codehilite .no,
.codehilite .ne {
    color: var(--y2k-blue);
}

.codehilite .o,
.codehilite .ow {
    color: var(--y2k-chrome-2);
}

.codehilite .p {
    color: var(--y2k-text);
}

@media (prefers-reduced-motion: reduce) {
    .tag-filter-btn {
        transition: none;
    }
}
```

- [ ] **Step 2: 验证样式可被服务且关键选择器存在。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
CSS=http://localhost:8000/assets/y2k/theme.css
for sel in '.codehilite pre' '.post-toc .toc a' '.tag-filter-btn.active' '.note-card-hidden' '.notes-placeholder' '.prose-y2k blockquote'; do
    echo "$sel: $(curl -s $CSS | grep -c -- "$sel")"
done
kill $SERVER_PID
```

预期输出：六个选择器各为 `1`（或更多）。

- [ ] **Step 3: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add assets/y2k/theme.css
git commit -m "feat(y2k): add blog component styles (codehilite, toc, tags, note cards)"
```

---

## Task 4: 列表页生成 —— 日期倒序卡片、标签筛选（fx.js）、空状态保留

生成器接管 `dev-blog/index.html` 整页：有文章时输出标签筛选条 + 日期倒序卡片网格，无文章时保留现有 `.note-empty` 空状态（逐字不变）。筛选交互写入 `fx.js`，沿用 `QRC.handleError` 与守卫式初始化风格。

**Files:**
- Modify: `tools/build-blog.py`
- Modify: `assets/y2k/fx.js`
- Modify（生成产物）: `dev-blog/index.html`

**Interfaces:**
- Consumes: Task 1/2 的全部函数与 post dict；Task 3 的 `#tag-filter`/`.tag-filter-btn`/`.notes-grid`/`.note-card*`/`.note-card-hidden` 样式；现有 `dev-blog/index.html` 的 head 与空状态结构
- Produces: `LIST_PAGE_TEMPLATE`、`collect_tags()`、`render_tag_filter()`、`render_post_card(post, posts_prefix="posts/")`、`render_list_page(posts)`；HTML 契约 `data-tags` / `data-tag` / `data-tag="all"`；fx.js 的 `initBlogFilter()`（Task 6 复用 `render_post_card`）

**Steps:**

- [ ] **Step 1: 在 `tools/build-blog.py` 的 `def main():` 之前插入列表页生成代码。** 即在 `def main():` 行前插入：

```python
LIST_PAGE_TEMPLATE = """<!DOCTYPE html>
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

        {list_block}
    </main>

    <button id="sfx-toggle" class="sfx-toggle" aria-pressed="false" aria-label="开启或关闭音效">SOUND: OFF</button>

    <script src="../assets/y2k/sfx.js" defer></script>
    <script src="../assets/y2k/fx.js" defer></script>
</body>
</html>
"""

EMPTY_LIST_BLOCK = (
    '<div class="card-y2k note-empty">\n'
    '            <span class="card-emoji">📝</span>\n'
    "            <p>还没有实验笔记。</p>\n"
    '            <p class="note-empty-sub">等有想法值得记录的时候，会放在这里。</p>\n'
    "        </div>"
)


def collect_tags(posts):
    """All distinct tags across posts, sorted alphabetically."""
    tags = set()
    for post in posts:
        tags.update(post["tags"])
    return sorted(tags)


def render_tag_filter(tags):
    """The tag filter bar: an 'all' button plus one button per tag."""
    buttons = [
        '<button type="button" class="tag-filter-btn active" data-tag="all">全部</button>'
    ]
    for tag in tags:
        buttons.append(
            f'<button type="button" class="tag-filter-btn" data-tag="{html_lib.escape(tag)}">'
            f"{html_lib.escape(tag)}</button>"
        )
    return (
        '<div id="tag-filter" role="group" aria-label="按标签筛选">\n            '
        + "\n            ".join(buttons)
        + "\n        </div>"
    )


def render_post_card(post, posts_prefix="posts/"):
    """One blog card. Shared by the list page and the homepage latest block.

    posts_prefix is "posts/" on the list page and "dev-blog/posts/" on the
    homepage. Cards carry data-tags for the list page tag filter.
    """
    href = posts_prefix + post["slug"] + ".html"
    data_tags = html_lib.escape(" ".join(post["tags"]))
    return (
        f'<a href="{href}" class="card-y2k note-card" data-tags="{data_tags}">\n'
        '            <div class="note-card-top">\n'
        f'                <span class="note-card-date">{post["date_iso"]}</span>\n'
        f'                <div class="note-card-tags">{render_tag_badges(post["tags"])}</div>\n'
        "            </div>\n"
        f'            <h3 class="card-title">{html_lib.escape(post["title"])}</h3>\n'
        f'            <p class="card-desc">{html_lib.escape(post["description"])}</p>\n'
        '            <div class="card-link">\n'
        "                <span>阅读</span>\n"
        '                <span class="card-arrow" aria-hidden="true">&gt;</span>\n'
        "            </div>\n"
        "        </a>"
    )


def render_list_page(posts):
    """Rewrite dev-blog/index.html: filter bar + cards, or the empty state."""
    if posts:
        cards = "\n".join("            " + render_post_card(post) for post in posts)
        list_block = (
            render_tag_filter(collect_tags(posts))
            + '\n        <div class="notes-grid">\n'
            + cards
            + "\n        </div>"
        )
    else:
        list_block = EMPTY_LIST_BLOCK
    LIST_PAGE.write_text(
        LIST_PAGE_TEMPLATE.format(list_block=list_block), encoding="utf-8"
    )


```

（末尾空行属于插入内容。）

- [ ] **Step 2: 替换 `main()`。** 用 Edit 把：

```python
def main():
    posts = load_posts()
    for post in posts:
        out_path = render_post_page(post)
        print(f"build-blog: wrote {out_path.relative_to(ROOT)}")
    clean_stale_posts({post["slug"] for post in posts})
    print(f"build-blog: done, {len(posts)} post(s)")
```

替换为：

```python
def main():
    posts = load_posts()
    for post in posts:
        out_path = render_post_page(post)
        print(f"build-blog: wrote {out_path.relative_to(ROOT)}")
    clean_stale_posts({post["slug"] for post in posts})
    render_list_page(posts)
    print(f"build-blog: wrote {LIST_PAGE.relative_to(ROOT)}")
    print(f"build-blog: done, {len(posts)} post(s)")
```

- [ ] **Step 3: 在 `assets/y2k/fx.js` 中加入标签筛选。** 用 Edit 把：

```javascript
    function init() {
        handleScrollAnimations();
        window.addEventListener('scroll', handleScrollAnimations);
        initSmoothScroll();
        initCursor();
        initGlitch();
        initParallax();
        initBootScreen();
    }
```

替换为：

```javascript
    /* ---------- dev-blog 标签筛选（仅列表页，守卫 #tag-filter 存在） ---------- */
    function initBlogFilter() {
        const filter = document.getElementById('tag-filter');
        if (!filter) return; // 非列表页或无文章（空状态无筛选条）
        try {
            const buttons = filter.querySelectorAll('.tag-filter-btn');
            const cards = document.querySelectorAll('.note-card');
            filter.addEventListener('click', function (e) {
                const btn = e.target.closest('.tag-filter-btn');
                if (!btn) return;
                const tag = btn.getAttribute('data-tag');
                buttons.forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                cards.forEach(function (card) {
                    const cardTags = (card.getAttribute('data-tags') || '').split(' ');
                    const show = tag === 'all' || cardTags.indexOf(tag) !== -1;
                    card.classList.toggle('note-card-hidden', !show);
                });
            });
        } catch (error) {
            QRC.handleError(error, 'fx.initBlogFilter');
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
        initBlogFilter();
    }
```

- [ ] **Step 4: JS 语法检查 + 运行生成器。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
node --check assets/y2k/fx.js && echo "OK: fx.js"
.venv/bin/python tools/build-blog.py; echo "exit=$?"
```

预期输出：`OK: fx.js`；`exit=0`；打印含 `build-blog: wrote dev-blog/index.html`。

- [ ] **Step 5: 验证列表页结构（有文章路径）。**

```bash
cd /Users/ruochenhua/QrcSite
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
LIST=http://localhost:8000/dev-blog/index.html
echo "filter: $(curl -s $LIST | grep -c 'id="tag-filter"')"
echo "all btn: $(curl -s $LIST | grep -c 'data-tag="all"')"
echo "tag btn: $(curl -s $LIST | grep -c 'data-tag="game-design"')"
echo "card: $(curl -s $LIST | grep -c 'class="card-y2k note-card"')"
echo "card data-tags: $(curl -s $LIST | grep -c 'data-tags="game-design firework-master"')"
echo "card href: $(curl -s $LIST | grep -c 'href="posts/firework-master-dev-notes-1.html"')"
echo "empty state: $(curl -s $LIST | grep -c 'note-empty')"
kill $SERVER_PID
```

预期输出：`filter: 1`、`all btn: 1`、`tag btn: 1`、`card: 1`、`card data-tags: 1`、`card href: 1`、`empty state: 0`。

- [ ] **Step 6: 验证空状态路径 + 孤儿文章页清理（临时移走源文件，测完恢复）。**

```bash
cd /Users/ruochenhua/QrcSite
mv dev-blog/src/firework-master-dev-notes-1.md dev-blog/src/firework-master-dev-notes-1.md.bak
.venv/bin/python tools/build-blog.py; echo "exit=$?"
echo "empty state: $(grep -c 'note-empty' dev-blog/index.html)"
echo "stale post removed: $(ls dev-blog/posts/*.html 2>/dev/null | wc -l | tr -d ' ')"
mv dev-blog/src/firework-master-dev-notes-1.md.bak dev-blog/src/firework-master-dev-notes-1.md
.venv/bin/python tools/build-blog.py; echo "exit=$?"
echo "post restored: $(ls dev-blog/posts/*.html | wc -l | tr -d ' ')"
echo "filter back: $(grep -c 'id="tag-filter"' dev-blog/index.html)"
```

预期输出：第一轮 `exit=0`、打印含 `build-blog: removed stale dev-blog/posts/firework-master-dev-notes-1.html`、`empty state: 2`（class 与注释不出现，`.note-empty` 出现在 `<div class="card-y2k note-empty">` 与 `note-empty-sub` 两行，故计数 2）、`stale post removed: 0`；第二轮 `exit=0`、`post restored: 1`、`filter back: 1`。

- [ ] **Step 7: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add tools/build-blog.py assets/y2k/fx.js dev-blog/index.html dev-blog/posts/firework-master-dev-notes-1.html
git commit -m "feat(blog): generate list page with tag filter"
```

---

## Task 5: RSS —— `feed.xml` 生成

生成 `dev-blog/feed.xml`（RSS 2.0）。为保证幂等：不写 `lastBuildDate`，item 的 `pubDate` 固定为文章日期当天 12:00（+0800）的 RFC 822 表示。无文章时也生成合法的空 channel。

**Files:**
- Modify: `tools/build-blog.py`
- Create（生成产物）: `dev-blog/feed.xml`

**Interfaces:**
- Consumes: `load_posts()`、`BLOG_URL`、post dict（`date` 此时必为合法 `datetime.date`——`load_posts` 已校验）
- Produces: `FEED_TEMPLATE`、`render_feed(posts)`

**Steps:**

- [ ] **Step 1: 修改 import 区。** 用 Edit 把：

```python
import html as html_lib
import re
import sys
from datetime import date
from pathlib import Path

import markdown
```

替换为：

```python
import html as html_lib
import re
import sys
from datetime import date, datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

import markdown
```

- [ ] **Step 2: 在 `def main():` 之前插入 RSS 生成代码。**

```python
FEED_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>QRC-Eye 实验笔记</title>
    <link>{blog_url}</link>
    <description>QRC-Eye 的实验笔记，记录想法从草稿到原型的过程。</description>
    <language>zh-CN</language>
{items}
  </channel>
</rss>
"""


def render_feed(posts):
    """Write dev-blog/feed.xml (RSS 2.0).

    No lastBuildDate and no build-time timestamps anywhere, so the output is
    byte-identical across runs with the same sources (idempotency).
    """
    items = []
    for post in posts:
        post_url = BLOG_URL + "posts/" + post["slug"] + ".html"
        pub_date = datetime(
            post["date"].year,
            post["date"].month,
            post["date"].day,
            12,
            0,
            tzinfo=timezone(timedelta(hours=8)),
        )
        items.append(
            "    <item>\n"
            f"      <title>{xml_escape(post['title'])}</title>\n"
            f"      <link>{post_url}</link>\n"
            f'      <guid isPermaLink="true">{post_url}</guid>\n'
            f"      <pubDate>{format_datetime(pub_date)}</pubDate>\n"
            f"      <description>{xml_escape(post['description'])}</description>\n"
            "    </item>"
        )
    FEED_FILE.write_text(
        FEED_TEMPLATE.format(blog_url=BLOG_URL, items="\n".join(items)),
        encoding="utf-8",
    )


```

（末尾空行属于插入内容。）

- [ ] **Step 3: 替换 `main()`。** 用 Edit 把：

```python
    render_list_page(posts)
    print(f"build-blog: wrote {LIST_PAGE.relative_to(ROOT)}")
    print(f"build-blog: done, {len(posts)} post(s)")
```

替换为：

```python
    render_list_page(posts)
    print(f"build-blog: wrote {LIST_PAGE.relative_to(ROOT)}")
    render_feed(posts)
    print(f"build-blog: wrote {FEED_FILE.relative_to(ROOT)}")
    print(f"build-blog: done, {len(posts)} post(s)")
```

- [ ] **Step 4: 运行并验证 feed。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
.venv/bin/python tools/build-blog.py; echo "exit=$?"
.venv/bin/python -c "import xml.etree.ElementTree as ET; r = ET.parse('dev-blog/feed.xml').getroot(); items = r.findall('./channel/item'); print('items:', len(items)); print('title:', items[0].findtext('title')); print('link:', items[0].findtext('link')); print('pubDate:', items[0].findtext('pubDate'))"
grep -c 'lastBuildDate' dev-blog/feed.xml; echo "lastBuildDate grep exit=$?"
```

预期输出：`exit=0`；XML 解析成功，`items: 1`，`title: 烟花大师开发笔记 #1：评分公式怎么定`，`link: https://www.qrc-eye.com/dev-blog/posts/firework-master-dev-notes-1.html`，`pubDate: Sun, 19 Jul 2026 12:00:00 +0800`；`lastBuildDate` grep 计数为 `0`（grep 无匹配时退出码为 1，`lastBuildDate grep exit=1` 属预期）。

- [ ] **Step 5: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add tools/build-blog.py dev-blog/feed.xml
git commit -m "feat(blog): generate RSS feed.xml"
```

---

## Task 6: 主页集成 —— 导航「笔记」、BLOG-LATEST 标记区块、生成器重写标记区间

主页 `index.html` 手写三处一次性修改（桌面导航、移动菜单、项目与关于之间的「最新笔记」区块外壳），然后给生成器加 `update_homepage()`：只重写 `<!-- BLOG-LATEST:START/END -->` 之间的内容（最近 3 篇卡片，或无文章时的占位文案），标记外一律不动。此后该区间由生成器维护，手写时不要再碰标记之间的内容。

**Files:**
- Modify: `index.html`
- Modify: `tools/build-blog.py`

**Interfaces:**
- Consumes: `render_post_card(post, posts_prefix=...)`（Task 4）、`HOME_START_MARK` / `HOME_END_MARK`（Task 1）、Task 3 的 `.notes-placeholder` 样式
- Produces: `HOME_PLACEHOLDER`、`render_home_latest(posts)`、`replace_marked_region()`、`update_homepage(posts)`；主页 DOM 钩子 `<!-- BLOG-LATEST:START/END -->`、`#notes` section

**Steps:**

- [ ] **Step 1: 桌面导航加「笔记」。** 用 Edit 修改 `index.html`，把：

```html
            <div class="nav-links">
                <a href="#projects">项目</a>
                <a href="#about">关于</a>
            </div>
```

替换为：

```html
            <div class="nav-links">
                <a href="#projects">项目</a>
                <a href="dev-blog/index.html">笔记</a>
                <a href="#about">关于</a>
            </div>
```

- [ ] **Step 2: 移动菜单加「笔记」。** 用 Edit 把：

```html
        <div id="mobile-menu" class="hidden" aria-hidden="true" aria-labelledby="menu-button">
            <a href="#projects" onclick="toggleMobileMenu()">项目</a>
            <a href="#about" onclick="toggleMobileMenu()">关于</a>
        </div>
```

替换为：

```html
        <div id="mobile-menu" class="hidden" aria-hidden="true" aria-labelledby="menu-button">
            <a href="#projects" onclick="toggleMobileMenu()">项目</a>
            <a href="dev-blog/index.html" onclick="toggleMobileMenu()">笔记</a>
            <a href="#about" onclick="toggleMobileMenu()">关于</a>
        </div>
```

（指向页面的链接不需要平滑滚动，`toggleMobileMenu()` 仅负责收起菜单；fx.js 的平滑滚动只匹配 `a[href^="#"]`，不受影响。）

- [ ] **Step 3: 在「项目」与「关于」之间插入「最新笔记」区块外壳。** 用 Edit 把：

```html
            <p class="more-note animate-on-scroll">
                更多想法正在画草稿 …
            </p>
        </section>

        <div class="section-divider"></div>
```

替换为：

```html
            <p class="more-note animate-on-scroll">
                更多想法正在画草稿 …
            </p>
        </section>

        <!-- Latest notes: BLOG-LATEST 标记之间由 tools/build-blog.py 重写，标记外手写维护 -->
        <section id="notes" class="section latest-notes">
            <div class="section-head animate-on-scroll">
                <h2 class="section-title" data-glitch>最新笔记</h2>
                <p class="section-sub">想法从草稿到原型的过程记录。</p>
            </div>
            <!-- BLOG-LATEST:START -->
            <p class="notes-placeholder">笔记还在酝酿中 …</p>
            <!-- BLOG-LATEST:END -->
            <p class="more-note animate-on-scroll">
                <a href="dev-blog/index.html">全部笔记</a>
            </p>
        </section>

        <div class="section-divider"></div>
```

（初始占位内容与生成器无文章时写回的内容逐字一致，因此本步手工修改后运行生成器产生的 diff 只来自真实文章卡片。）

- [ ] **Step 4: 在 `tools/build-blog.py` 的 `def main():` 之前插入主页更新代码。**

```python
HOME_PLACEHOLDER = '<p class="notes-placeholder">笔记还在酝酿中 …</p>'


def render_home_latest(posts):
    """Inner HTML for the BLOG-LATEST markers on the homepage (max 3 posts)."""
    latest = posts[:3]
    if not latest:
        return HOME_PLACEHOLDER
    cards = "\n".join(
        "                " + render_post_card(post, posts_prefix="dev-blog/posts/")
        for post in latest
    )
    return '<div class="cards-grid">\n' + cards + "\n            </div>"


def replace_marked_region(original, start_mark, end_mark, inner):
    """Replace the text between start_mark and end_mark (the marks are kept).

    Raises BuildError if either marker is missing or they are misordered, so
    a hand-edit that breaks the markers fails loudly instead of corrupting
    the homepage.
    """
    start = original.find(start_mark)
    end = original.find(end_mark)
    if start == -1 or end == -1 or end < start:
        raise BuildError(
            f"index.html: missing or misordered {start_mark} / {end_mark} markers"
        )
    start += len(start_mark)
    return original[:start] + "\n            " + inner + "\n            " + original[end:]


def update_homepage(posts):
    """Rewrite only the BLOG-LATEST region of index.html; nothing else."""
    original = HOME_PAGE.read_text(encoding="utf-8")
    updated = replace_marked_region(
        original, HOME_START_MARK, HOME_END_MARK, render_home_latest(posts)
    )
    HOME_PAGE.write_text(updated, encoding="utf-8")


```

（末尾空行属于插入内容。）

- [ ] **Step 5: 替换 `main()` 收尾部分。** 用 Edit 把：

```python
    render_feed(posts)
    print(f"build-blog: wrote {FEED_FILE.relative_to(ROOT)}")
    print(f"build-blog: done, {len(posts)} post(s)")
```

替换为：

```python
    render_feed(posts)
    print(f"build-blog: wrote {FEED_FILE.relative_to(ROOT)}")
    update_homepage(posts)
    print(f"build-blog: updated {HOME_PAGE.relative_to(ROOT)} BLOG-LATEST block")
    print(f"build-blog: done, {len(posts)} post(s)")
```

- [ ] **Step 6: 运行并验证主页。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
.venv/bin/python tools/build-blog.py; echo "exit=$?"
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
HOME=http://localhost:8000/index.html
echo "nav link: $(curl -s $HOME | grep -o 'href="dev-blog/index.html"' | wc -l | tr -d ' ')"
echo "markers: $(curl -s $HOME | grep -c 'BLOG-LATEST')"
echo "latest card: $(curl -s $HOME | grep -c 'href="dev-blog/posts/firework-master-dev-notes-1.html"')"
echo "placeholder: $(curl -s $HOME | grep -c 'notes-placeholder')"
echo "about intact: $(curl -s $HOME | grep -c 'id="about"')"
echo "beian intact: $(curl -s $HOME | grep -c '粤ICP备2024189519号-1')"
kill $SERVER_PID
```

预期输出：`exit=0`；`nav link: 3`（桌面导航 + 移动菜单 + 区块底部「全部笔记」各一）、`markers: 3`（注释说明里一次 + START/END 各一次）、`latest card: 1`、`placeholder: 0`（有文章时占位被卡片替换）、`about intact: 1`、`beian intact: 1`。

- [ ] **Step 7: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add index.html tools/build-blog.py
git commit -m "feat(blog): add homepage notes entry and BLOG-LATEST block"
```

---

## Task 7: 端到端终验 + 坏 md 报错检查 + 幂等性检查 + 更新 `CONTEXT.md`

全流程收尾验证：完整走一遍「写 md → 生成 → curl 检查文章页/列表页/RSS/主页区块」，验证幂等（连跑两次产物一致）与坏 md 报错（非零退出、不产出半成品），最后把 `CONTEXT.md` 的项目结构说明更新到 blog 系统落地后的真实状态。

**Files:**
- Modify: `CONTEXT.md`

**Interfaces:**
- Consumes: 前 6 个任务的全部产物
- Produces: 更新后的 `CONTEXT.md` 项目结构说明

**Steps:**

- [ ] **Step 1: 全量端到端检查。** 在仓库根目录执行：

```bash
cd /Users/ruochenhua/QrcSite
node --check assets/y2k/fx.js && echo "OK: fx.js"
.venv/bin/python tools/build-blog.py; echo "build exit=$?"
python3 -m http.server 8000 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "post page: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/dev-blog/posts/firework-master-dev-notes-1.html)"
echo "list page: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/dev-blog/index.html)"
echo "feed: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/dev-blog/feed.xml)"
echo "post codehilite: $(curl -s http://localhost:8000/dev-blog/posts/firework-master-dev-notes-1.html | grep -c 'codehilite')"
echo "post toc: $(curl -s http://localhost:8000/dev-blog/posts/firework-master-dev-notes-1.html | grep -c 'post-toc')"
echo "list filter: $(curl -s http://localhost:8000/dev-blog/index.html | grep -c 'tag-filter')"
echo "feed item: $(curl -s http://localhost:8000/dev-blog/feed.xml | grep -c '<item>')"
echo "home latest: $(curl -s http://localhost:8000/index.html | grep -c 'dev-blog/posts/')"
kill $SERVER_PID
```

预期输出：`OK: fx.js`；`build exit=0`；三个页面均为 `200`；`post codehilite` ≥ 1、`post toc: 1`、`list filter` ≥ 1、`feed item: 1`、`home latest` ≥ 1。

- [ ] **Step 2: 幂等性检查（连跑两次，产物零变化）。** 当前工作区应是干净的（Task 6 已提交）；执行：

```bash
cd /Users/ruochenhua/QrcSite
git status --porcelain
.venv/bin/python tools/build-blog.py >/dev/null; echo "run1 exit=$?"
git status --porcelain
.venv/bin/python tools/build-blog.py >/dev/null; echo "run2 exit=$?"
git status --porcelain
```

预期输出：四次 `git status --porcelain` 全部为空（无任何行输出），`run1 exit=0`、`run2 exit=0`。若有输出，说明生成器输出不确定（常见原因：写入了当前时间戳），必须修复后重跑本步。

- [ ] **Step 3: 坏 md 报错检查（非零退出、不产出半成品）。**

```bash
cd /Users/ruochenhua/QrcSite
cat > dev-blog/src/bad-test.md <<'EOF'
---
title: 坏文章
date: not-a-date
---
正文
EOF
.venv/bin/python tools/build-blog.py; echo "bad exit=$?"
git status --porcelain
rm dev-blog/src/bad-test.md
.venv/bin/python tools/build-blog.py; echo "recover exit=$?"
git status --porcelain
```

预期输出：`bad exit=1`，stderr 含 `ERROR: dev-blog/src/bad-test.md: missing required field 'description'` 与 `invalid date 'not-a-date'`；此时 `git status --porcelain` 只输出 `?? dev-blog/src/bad-test.md` 一行（验证失败发生在任何写文件之前，无半成品）；清理后 `recover exit=0`，最后一次 `git status --porcelain` 为空。

- [ ] **Step 4: 人工目检总清单（本地服务 + 桌面 Chrome）。** 逐项确认：
  - 文章页：排版正常、TOC 侧栏（≥1024px 左侧 sticky，窄屏在正文上方）、TOC 链接可跳转、代码块 Y2K 配色高亮、标签徽章显示、`.prose-y2k` 列表/行内代码样式正常；
  - 列表页：卡片日期倒序、点击标签按钮筛选生效（含「全部」复位）、卡片可点击进文章；
  - 主页：导航（桌面 + 375px 移动菜单）「笔记」可达列表页、「最新笔记」卡片显示且可达文章页；
  - RSS：`/dev-blog/feed.xml` 在浏览器/阅读器中可订阅；
  - 控制台无未捕获错误（`QRC.handleError` 输出不应出现）。

- [ ] **Step 5: 更新 `CONTEXT.md` 的项目结构说明。** 用 Edit 把（old_string 为 `## 项目结构` 小节整段，其内部本身含一个 ``` 代码块，此处用 ~~~~ 作外层围栏以避免嵌套混淆；执行编辑时 old_string/new_string 均不含外层 ~~~~ 行）：

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

替换为：

~~~~
## 项目结构

```
qrcsite/
├── index.html          # 主页（导航含「笔记」；BLOG-LATEST 标记区间由生成器重写，其余手写）
├── assets/y2k/         # 全站共享 Y2K 主题包
│   ├── theme.css       # 设计令牌（配色/字体）+ 通用组件 + 页面布局 + blog 组件样式
│   ├── fx.js           # 动效套件：光标+拖尾、glitch、滚动动画、启动画面、降级判定、博客标签筛选
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
├── tools/
│   ├── build-blog.py   # dev-blog 静态生成器（运行：.venv/bin/python tools/build-blog.py）
│   └── requirements.txt# 钉版本：markdown==3.7、pygments==2.18.0（装本地 .venv/，不入库）
└── dev-blog/           # 实验笔记（Markdown + 生成器工作流）
    ├── index.html      # 列表页（生成器整页重写，勿手写）
    ├── post-template.html # 文章页结构蓝本（生成器内嵌模板以其为原型，本文件保持不动）
    ├── posts/          # 生成的文章页 <slug>.html（勿手写）
    ├── feed.xml        # RSS 2.0（生成器产出）
    └── src/            # Markdown 源文件（--- 围栏 front matter：title/date/tags/description）
```

说明：原 `js/main.js` 已被 `assets/y2k/fx.js` 吸收并删除；kings-field 目录在 2026-07 Y2K 改造时尚不存在。发布文章工作流：在 `dev-blog/src/` 新建 `<slug>.md`（slug 英文小写连字符）→ 运行 `.venv/bin/python tools/build-blog.py` → `git add -A && git commit` 提交产物；生成器输出确定（无时间戳），连跑两次产物一致，校验失败时非零退出且不产出半成品。
~~~~

- [ ] **Step 6: 提交。**

```bash
cd /Users/ruochenhua/QrcSite
git add CONTEXT.md
git commit -m "docs: update CONTEXT.md for dev-blog generator workflow"
```

---

## 完成定义（Definition of Done）

- [ ] 7 个任务全部按序完成，各自验证步骤通过
- [ ] `node --check assets/y2k/fx.js` 通过
- [ ] 示例文章全流程通过：文章页（TOC/高亮/标签徽章）、列表页（倒序卡片/标签筛选）、`feed.xml`（合法 RSS、1 个 item）、主页（导航 + 最新笔记区块）
- [ ] 幂等性：连续运行 `.venv/bin/python tools/build-blog.py` 两次，`git status --porcelain` 为空
- [ ] 坏 md：非零退出、错误信息含文件名与原因、无半成品写入
- [ ] 空状态路径：无文章时列表页保留 `.note-empty`、主页显示占位文案、孤儿文章页被清理
- [ ] `.venv/` 未入库；仓库无 npm/node 依赖、无运行时高亮库
- [ ] `CONTEXT.md` 结构说明已更新
- [ ] 每个任务一个 commit，共 7 个 commit
