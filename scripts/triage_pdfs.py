#!/usr/bin/env python3
"""Triage every PDF in samples/: determine layout, text layer, size."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF


SAMPLES = Path("samples")
OUT = Path("output/triage.json")


def slugify(name: str) -> str:
    base = Path(name).stem
    base = re.sub(r"[^A-Za-z0-9]+", "-", base).strip("-").lower()
    return base


def inspect(pdf_path: Path) -> dict:
    doc = fitz.open(pdf_path)
    page_count = doc.page_count

    # Sample pages for text length, dimensions.
    sample_indices = sorted({0, min(1, page_count - 1), page_count // 2, page_count - 1})
    samples = []
    total_text_chars = 0
    for idx in range(page_count):
        page = doc.load_page(idx)
        txt = page.get_text("text") or ""
        total_text_chars += len(txt)

    # Detailed samples for layout inspection
    for idx in sample_indices:
        if idx < 0 or idx >= page_count:
            continue
        page = doc.load_page(idx)
        rect = page.rect
        txt = page.get_text("text") or ""
        samples.append({
            "page_index": idx,
            "width": rect.width,
            "height": rect.height,
            "aspect": round(rect.width / rect.height, 3) if rect.height else None,
            "text_chars": len(txt),
            "first_chars": txt[:240].replace("\n", " "),
        })

    # Pattern heuristics over full text: spot-check for CYOA markers
    full_text = ""
    for idx in range(page_count):
        full_text += doc.load_page(idx).get_text("text") or ""

    # Different CYOA/gamebook reference patterns
    turn_to_page = len(re.findall(r"\bturn\s+to\s+page\s+\d+", full_text, flags=re.I))
    turn_to_section = len(re.findall(r"\bturn\s+to\s+(?:section\s+)?\d+", full_text, flags=re.I))
    go_to_page = len(re.findall(r"\bgo\s+to\s+page\s+\d+", full_text, flags=re.I))
    if_then = len(re.findall(r"\bif\s+you\b[^\.]{0,80}\bturn\s+to\b", full_text, flags=re.I))
    the_end = len(re.findall(r"\bthe\s+end\b", full_text, flags=re.I))

    doc.close()
    size_mb = pdf_path.stat().st_size / (1024 * 1024)

    return {
        "file": pdf_path.name,
        "slug": slugify(pdf_path.name),
        "size_mb": round(size_mb, 2),
        "page_count": page_count,
        "total_text_chars": total_text_chars,
        "chars_per_page": round(total_text_chars / max(1, page_count), 1),
        "has_text_layer": total_text_chars > 500,
        "probably_scanned": total_text_chars < 200 * page_count,
        "patterns": {
            "turn_to_page": turn_to_page,
            "turn_to_section": turn_to_section,
            "go_to_page": go_to_page,
            "if_you_turn_to": if_then,
            "the_end": the_end,
        },
        "samples": samples,
    }


def main() -> None:
    if not SAMPLES.exists():
        print(f"No samples dir at {SAMPLES}", file=sys.stderr)
        sys.exit(1)

    pdfs = sorted(SAMPLES.glob("*.pdf"))
    print(f"Found {len(pdfs)} PDFs", file=sys.stderr)

    results = []
    for pdf in pdfs:
        print(f"  inspecting {pdf.name} ...", file=sys.stderr, flush=True)
        try:
            results.append(inspect(pdf))
        except Exception as e:  # noqa: BLE001
            results.append({"file": pdf.name, "error": str(e)})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(results, indent=2))
    print(f"Wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
