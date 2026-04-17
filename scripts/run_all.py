#!/usr/bin/env python3
"""Batch orchestrator: run extract -> build_graph -> write_stories -> render_svg
for every book defined in BOOKS below.

Each entry specifies per-book extraction params determined from triage.
To add a book: append a dict; rerun `python3 scripts/run_all.py`.

After running, writes output/books.json as the master index consumed by
the web app.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SAMPLES = REPO / "samples"
OUT_ROOT = REPO / "output" / "books"


# Per-book configuration. Anything not listed is skipped.
BOOKS = [
    # --- Category A: CYOA with native text layer ---
    {
        "slug": "arcade-explorers",
        "title": "Arcade Explorers: Save the Venturians!",
        "pdf": "ArcadeExplorers-SaveTheVenturians1985.pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 13,
        "story_start_page": 3,
        "reference_style": "page",
        "format": "cyoa",
    },
    # --- Category B: possibly branching, patterns TBD ---
    {
        "slug": "microadventure-7-doomstalker",
        "title": "Micro Adventure #7: Doom Stalker",
        "pdf": "MicroAdventureNo.7-DoomStalker.pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "page",
        "format": "cyoa",
    },
    {
        "slug": "nintendo-adventure-2-leaping-lizards",
        "title": "Nintendo Adventure Books #2: Leaping Lizards!",
        "pdf": "NintendoAdventureBooks02-LeapingLizards1991.pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "page",
        "format": "cyoa",
    },
    {
        "slug": "mystery-adventure-computer-storybook",
        "title": "The Mystery and Adventure Computer Storybook",
        "pdf": "TheMysteryAndAdventureComputerStorybook1983.pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "page",
        "format": "cyoa",
    },
    {
        "slug": "magic-micro-captain-kid",
        "title": "A Magic Micro Adventure: Captain Kid and the Pirates",
        "pdf": "A Magic Micro Adventure - Captain Kid and the Pirates (1985).pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "page",
        "format": "cyoa",
    },
    {
        "slug": "magic-micro-cats-castle-mountain",
        "title": "A Magic Micro Adventure: The Cats of Castle Mountain",
        "pdf": "AMagicMicroAdventure-TheCatsOfCastleMountain.pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "page",
        "format": "cyoa",
    },
    # --- Category C: linear novels ---
    {
        "slug": "child-of-the-chaos",
        "title": "Child of the Chaos (2004)",
        "pdf": "Child of the Chaos (2004).pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "none",
        "format": "linear",
    },
    {
        "slug": "bards-tale-chaos-gate",
        "title": "The Bard's Tale: The Chaos Gate (1994)",
        "pdf": "The Bard's Tale - The Chaos Gate (1994).pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "none",
        "format": "linear",
    },
    {
        "slug": "under-a-killing-moon",
        "title": "Under a Killing Moon: A Tex Murphy Novel (1996)",
        "pdf": "Under a Killing Moon - A Tex Murphy Novel (1996).pdf",
        "extractor": "text",
        "layout": "single",
        "pdf_start_page": 1,
        "story_start_page": 1,
        "reference_style": "none",
        "format": "linear",
    },
]


def run(cmd: list[str]) -> None:
    print("  $", " ".join(str(c) for c in cmd))
    subprocess.run(cmd, check=True)


def process_book(cfg: dict) -> dict:
    slug = cfg["slug"]
    pdf = SAMPLES / cfg["pdf"]
    book_dir = OUT_ROOT / slug

    if not pdf.exists():
        return {"slug": slug, "status": "missing-pdf", "pdf": str(pdf)}

    print(f"\n=== {slug} ===")

    if cfg["extractor"] == "text":
        run([
            "python3", "scripts/extract_text.py",
            "--pdf", str(pdf),
            "--slug", slug,
            "--title", cfg["title"],
            "--layout", cfg["layout"],
            "--pdf-start-page", str(cfg["pdf_start_page"]),
            "--story-start-page", str(cfg["story_start_page"]),
            "--reference-style", cfg["reference_style"],
            "--format", cfg["format"],
        ])
    else:
        return {"slug": slug, "status": f"unknown-extractor:{cfg['extractor']}"}

    run(["python3", "scripts/build_graph.py", "--book-dir", str(book_dir)])
    # For linear novels, cap max_paths aggressively (no branching anyway,
    # but defend against odd graphs)
    max_paths = "10" if cfg["format"] == "linear" else "500"
    run(["python3", "scripts/write_stories.py",
         "--book-dir", str(book_dir),
         "--max-paths", max_paths])
    run(["python3", "scripts/render_graph_svg.py", "--book-dir", str(book_dir)])

    # Summary
    graph = json.loads((book_dir / "graph.json").read_text())
    manifest = json.loads((book_dir / "stories" / "manifest.json").read_text())
    return {
        "slug": slug,
        "title": cfg["title"],
        "format": cfg["format"],
        "reference_style": cfg["reference_style"],
        "pages": len(graph["nodes"]),
        "edges": len(graph["edges"]),
        "terminals": sum(1 for n in graph["nodes"] if n.get("is_terminal") or not n["choices"]),
        "branching_pages": sum(1 for n in graph["nodes"] if len(n["choices"]) > 1),
        "start_page": graph.get("start_page"),
        "stories": len(manifest),
        "status": "ok",
    }


def build_master_index() -> None:
    index = []
    for book_dir in sorted(OUT_ROOT.iterdir()):
        if not book_dir.is_dir():
            continue
        meta_path = book_dir / "meta.json"
        graph_path = book_dir / "graph.json"
        manifest_path = book_dir / "stories" / "manifest.json"
        if not (meta_path.exists() and graph_path.exists()):
            continue
        meta = json.loads(meta_path.read_text())
        graph = json.loads(graph_path.read_text())
        manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
        terminals_only = [n for n in graph["nodes"] if n.get("is_terminal") or not n["choices"]]
        index.append({
            "slug": meta["slug"],
            "title": meta.get("title", meta["slug"]),
            "format": meta.get("format", "cyoa"),
            "reference_style": meta.get("reference_style", "page"),
            "source_pdf": meta.get("source_pdf", "").split("/")[-1],
            "pages": len(graph["nodes"]),
            "edges": len(graph["edges"]),
            "branching_pages": sum(1 for n in graph["nodes"] if len(n["choices"]) > 1),
            "terminals": len(terminals_only),
            "start_page": graph.get("start_page"),
            "stories": len(manifest),
        })
    out = REPO / "output" / "books.json"
    out.write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"\nMaster index: {out} ({len(index)} books)")


def main() -> None:
    only = sys.argv[1:]  # optional subset
    summaries = []
    for cfg in BOOKS:
        if only and cfg["slug"] not in only:
            continue
        try:
            summaries.append(process_book(cfg))
        except subprocess.CalledProcessError as e:
            summaries.append({"slug": cfg["slug"], "status": f"failed: {e}"})
    print("\n=== SUMMARY ===")
    for s in summaries:
        print(json.dumps(s))
    build_master_index()


if __name__ == "__main__":
    main()
