#!/usr/bin/env python3
"""build-blog.py - QRC-Eye dev-blog static generator.

Reads Markdown sources from dev-blog/src/, validates front matter, and
regenerates post pages, the list page, the RSS feed and the homepage
"latest notes" block. This is a build-time tool only: the committed site
stays fully static.

Usage: .venv/bin/python tools/build-blog.py
"""

import html as html_lib
import re
import sys
from datetime import date
from pathlib import Path

import markdown

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


def main():
    posts = load_posts()
    for post in posts:
        out_path = render_post_page(post)
        print(f"build-blog: wrote {out_path.relative_to(ROOT)}")
    clean_stale_posts({post["slug"] for post in posts})
    render_list_page(posts)
    print(f"build-blog: wrote {LIST_PAGE.relative_to(ROOT)}")
    print(f"build-blog: done, {len(posts)} post(s)")


if __name__ == "__main__":
    main()
