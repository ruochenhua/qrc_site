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
