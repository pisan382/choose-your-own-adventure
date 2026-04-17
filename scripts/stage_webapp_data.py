#!/usr/bin/env python3
"""Stage extracted book data into webapp/public/data/ for the web app to fetch.

Copies just what the app needs:
  webapp/public/data/books.json
  webapp/public/data/<slug>/meta.json
  webapp/public/data/<slug>/graph.json
  webapp/public/data/<slug>/graph.svg
  webapp/public/data/<slug>/pages/NNN.txt
  webapp/public/data/<slug>/stories/manifest.json

We skip the generated story-NNNN.txt files because the reader renders paths
on demand from the page text. Skipping saves ~100x the bundle size.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "output" / "books"
INDEX = REPO / "output" / "books.json"
DST = REPO / "webapp" / "public" / "data"


def stage() -> None:
    if DST.exists():
        shutil.rmtree(DST)
    DST.mkdir(parents=True, exist_ok=True)

    if INDEX.exists():
        shutil.copy2(INDEX, DST / "books.json")
    else:
        raise SystemExit(f"Missing master index: {INDEX}")

    slugs = []
    for book_dir in sorted(SRC.iterdir()):
        if not book_dir.is_dir():
            continue
        slug = book_dir.name
        dst_book = DST / slug
        dst_book.mkdir(parents=True, exist_ok=True)
        (dst_book / "pages").mkdir(exist_ok=True)
        (dst_book / "stories").mkdir(exist_ok=True)

        for fname in ("meta.json", "graph.json", "graph.svg"):
            src = book_dir / fname
            if src.exists():
                shutil.copy2(src, dst_book / fname)

        # Pages
        pages_src = book_dir / "pages"
        if pages_src.exists():
            for p in pages_src.glob("*.txt"):
                shutil.copy2(p, dst_book / "pages" / p.name)

        # Story manifest only — not the individual story files.
        mf = book_dir / "stories" / "manifest.json"
        if mf.exists():
            shutil.copy2(mf, dst_book / "stories" / "manifest.json")

        slugs.append(slug)

    print(f"Staged {len(slugs)} books to {DST}")
    # Report total size
    total = sum(f.stat().st_size for f in DST.rglob("*") if f.is_file())
    print(f"Total bundled data: {total / 1024:.1f} KB")


if __name__ == "__main__":
    stage()
