#!/usr/bin/env python3
"""Generalized text extraction from a PDF's native text layer.

Writes one file per book-page into output/books/<slug>/pages/.
Supports three layout modes:

  single    One reader-page per PDF page (the most common).
  spread    One PDF page contains two reader-pages (left/right halves).
            Used by books scanned as two-page spreads.
  sections  Fighting-Fantasy style: the book is numbered by sections,
            not pages. We still dump one file per PDF page but label
            them "section-source" so build_graph.py knows to look
            for section references (not page references) inside.

For `single` layout, the mapping from PDF page to book page is:
    book_page = pdf_page - pdf_start_page + story_start_page
where pdf_start_page / story_start_page are 1-indexed.

For `spread`:
    book_page_left  = story_start_page + 2*spread_index
    book_page_right = book_page_left + 1

For linear novels (no branching), use --layout single and treat every
PDF page as a linear chapter-page; build_graph.py will still work,
it will just find zero explicit choice edges and rely on sequential
continuation.

This tool is source-text-layer only. For scanned PDFs without a text
layer, use extract_ocr.py instead.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF


def slugify(name: str) -> str:
    base = Path(name).stem
    base = re.sub(r"[^A-Za-z0-9]+", "-", base).strip("-").lower()
    return base


def clean_page_text(raw: str, page_no: int) -> str:
    """Strip common header/footer noise: leading/trailing bare page numbers."""
    lines = [ln.rstrip() for ln in raw.splitlines()]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    # Drop leading/trailing standalone integers if they match the page number
    while lines and re.fullmatch(rf"\s*{page_no}\s*", lines[0] or ""):
        lines.pop(0)
    while lines and re.fullmatch(rf"\s*{page_no}\s*", lines[-1] or ""):
        lines.pop()
    # Drop leading/trailing pure integers generally (often header/footer)
    while lines and re.fullmatch(r"\s*\d{1,4}\s*", lines[0] or ""):
        lines.pop(0)
    while lines and re.fullmatch(r"\s*\d{1,4}\s*", lines[-1] or ""):
        lines.pop()
    return "\n".join(lines).strip()


def extract_single(doc: "fitz.Document", args: argparse.Namespace, out_dir: Path) -> dict:
    """One PDF page per book page."""
    written = 0
    page_records: list[dict] = []

    last_pdf_page = args.pdf_end_page or doc.page_count
    for pdf_page in range(args.pdf_start_page, last_pdf_page + 1):
        book_page = pdf_page - args.pdf_start_page + args.story_start_page
        raw = doc.load_page(pdf_page - 1).get_text("text") or ""
        clean = clean_page_text(raw, book_page)
        # Skip pages that are effectively blank
        if len("".join(clean.split())) < args.min_chars:
            continue
        fname = f"{book_page:0{args.pad}d}.txt"
        (out_dir / fname).write_text(f"Page {book_page}\n\n{clean}\n", encoding="utf-8")
        written += 1
        page_records.append({"page": book_page, "pdf_page": pdf_page, "chars": len(clean)})
    return {"written": written, "pages": page_records}


def extract_spread(doc: "fitz.Document", args: argparse.Namespace, out_dir: Path) -> dict:
    """Two book pages per PDF page (left/right halves of text by x-coord)."""
    written = 0
    page_records: list[dict] = []
    spread_index = 0
    last_pdf_page = args.pdf_end_page or doc.page_count

    for pdf_page in range(args.pdf_start_page, last_pdf_page + 1):
        page = doc.load_page(pdf_page - 1)
        midx = page.rect.width / 2
        blocks = page.get_text("blocks") or []
        # blocks: (x0, y0, x1, y1, text, block_no, block_type)
        left_parts, right_parts = [], []
        for b in blocks:
            if len(b) < 5:
                continue
            x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4]
            # Guard: skip non-text blocks
            if not isinstance(text, str) or not text.strip():
                continue
            cx = (x0 + x1) / 2
            if cx < midx:
                left_parts.append((y0, text))
            else:
                right_parts.append((y0, text))
        left_parts.sort()
        right_parts.sort()
        left_text = "\n".join(t for _, t in left_parts).strip()
        right_text = "\n".join(t for _, t in right_parts).strip()

        book_left = args.story_start_page + spread_index * 2
        book_right = book_left + 1

        for bp, txt in ((book_left, left_text), (book_right, right_text)):
            clean = clean_page_text(txt, bp)
            if len("".join(clean.split())) < args.min_chars:
                continue
            fname = f"{bp:0{args.pad}d}.txt"
            (out_dir / fname).write_text(f"Page {bp}\n\n{clean}\n", encoding="utf-8")
            written += 1
            page_records.append({"page": bp, "pdf_page": pdf_page, "chars": len(clean)})

        spread_index += 1

    return {"written": written, "pages": page_records}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generalized text-layer PDF extractor.")
    p.add_argument("--pdf", type=Path, required=True)
    p.add_argument("--out-root", type=Path, default=Path("output/books"))
    p.add_argument("--slug", type=str, default=None,
                   help="Book slug. Defaults to slugify(pdf stem).")
    p.add_argument("--title", type=str, default=None,
                   help="Human-readable title. Defaults to pdf stem.")
    p.add_argument("--layout", choices=("single", "spread"), default="single")
    p.add_argument("--pdf-start-page", type=int, default=1,
                   help="1-indexed PDF page to start from.")
    p.add_argument("--pdf-end-page", type=int, default=None,
                   help="1-indexed PDF page to stop on (inclusive). Defaults to last.")
    p.add_argument("--story-start-page", type=int, default=1,
                   help="Book page number that corresponds to --pdf-start-page.")
    p.add_argument("--min-chars", type=int, default=30,
                   help="Skip pages with fewer than this many non-whitespace chars.")
    p.add_argument("--pad", type=int, default=3,
                   help="Zero-padding width for output filenames.")
    p.add_argument("--reference-style", choices=("page", "section", "none"), default="page",
                   help="How choices reference targets. 'page' = turn to page N; "
                        "'section' = Fighting Fantasy style (bare numbers); "
                        "'none' = linear book, no branching.")
    p.add_argument("--format", choices=("cyoa", "ff", "linear"), default="cyoa",
                   help="High-level book format tag stored in meta.json.")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(1)

    slug = args.slug or slugify(args.pdf.name)
    title = args.title or args.pdf.stem
    book_dir = args.out_root / slug
    pages_dir = book_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    # Wipe stale per-run page files so we get a clean snapshot
    for old in pages_dir.glob("*.txt"):
        old.unlink()

    doc = fitz.open(args.pdf)
    try:
        if args.layout == "single":
            result = extract_single(doc, args, pages_dir)
        else:
            result = extract_spread(doc, args, pages_dir)
    finally:
        doc.close()

    meta = {
        "slug": slug,
        "title": title,
        "source_pdf": str(args.pdf).replace("\\", "/"),
        "format": args.format,
        "reference_style": args.reference_style,
        "layout": args.layout,
        "pdf_start_page": args.pdf_start_page,
        "pdf_end_page": args.pdf_end_page,
        "story_start_page": args.story_start_page,
        "pages_written": result["written"],
        "pages_dir": "pages",
        "extractor": "text-layer",
    }
    (book_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"[{slug}] wrote {result['written']} pages to {pages_dir}")


if __name__ == "__main__":
    main()
