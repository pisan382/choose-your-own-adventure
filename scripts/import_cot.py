#!/usr/bin/env python3
"""Import the existing Cave of Time OCR output into output/books/the-cave-of-time/.

The legacy workflow stores CoT at output/cot-pages-ocr-v2/*-CoT.txt. To keep
the web app uniform, we re-emit those pages under the new schema (without
re-running OCR) and then hand off to build_graph + write_stories + render_svg.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "output" / "cot-pages-ocr-v2"
DST = REPO / "output" / "books" / "the-cave-of-time"

PAGE_FILE_RE = re.compile(r"^(\d+)-CoT\.txt$")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source: {SRC}")

    pages_dir = DST / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    for old in pages_dir.glob("*.txt"):
        old.unlink()

    count = 0
    for src in sorted(SRC.glob("*-CoT.txt")):
        m = PAGE_FILE_RE.match(src.name)
        if not m:
            continue
        page_no = int(m.group(1))
        fname = f"{page_no:03d}.txt"
        shutil.copyfile(src, pages_dir / fname)
        count += 1

    meta = {
        "slug": "the-cave-of-time",
        "title": "The Cave of Time",
        "source_pdf": "samples/the-cave-of-time.pdf",
        "format": "cyoa",
        "reference_style": "page",
        "layout": "spread",
        "pdf_start_page": 8,
        "pdf_end_page": 66,
        "story_start_page": 2,
        "pages_written": count,
        "pages_dir": "pages",
        "extractor": "ocr-legacy-v2",
    }
    (DST / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"[the-cave-of-time] imported {count} pages")

    # Chain into the new tools for graph/stories/svg
    def run(cmd):
        print("  $", " ".join(str(c) for c in cmd))
        subprocess.run(cmd, check=True, cwd=REPO)

    run(["python3", "scripts/build_graph.py", "--book-dir", str(DST.relative_to(REPO))])
    run(["python3", "scripts/write_stories.py", "--book-dir", str(DST.relative_to(REPO))])
    run(["python3", "scripts/render_graph_svg.py", "--book-dir", str(DST.relative_to(REPO))])


if __name__ == "__main__":
    main()
