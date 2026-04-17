#!/usr/bin/env python3
"""Build a story graph from a book's extracted pages.

Reads:   output/books/<slug>/pages/*.txt
         output/books/<slug>/meta.json
Writes:  output/books/<slug>/graph.json   (machine-readable, consumed by web app)
         output/books/<slug>/graph.mmd    (Mermaid, for debugging / parity with legacy)

graph.json schema:
{
  "slug": "...",
  "title": "...",
  "start_page": 3,                          # first page of the story
  "reference_style": "page|section|none",
  "nodes": [
    {"id": 3, "label": "3", "is_terminal": false, "chars": 742,
     "choices": [{"target": 4, "prompt": "If you decide to ...", "raw": "turn to page 4"}]}
  ],
  "edges": [{"source": 3, "target": 4, "prompt": "..."}]
}

Prompts are best-effort extraction of the sentence fragment that introduces
a choice ("If you decide to go home, turn to page 4"). These are rough —
users can override in the UI if needed.

Reference styles:
  page     "turn to page N" / "go to page N" — typical CYOA.
  section  Fighting-Fantasy style. Bare numbered targets ("turn to 237").
           Requires book layout with explicit section markers.
  none     Linear book. Only sequential (N -> N+1) continuation edges.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

PAGE_FILE_RE = re.compile(r"^0*(\d+)\.txt$")

# Style-specific choice patterns. Each pattern's first group captures the target number.
# Context window (up to ~160 chars before the turn-to phrase) is captured as the prompt.
PATTERNS_PAGE = [
    re.compile(
        r"(?P<prompt>(?:[^.!?\n]{0,200}?))"
        r"\b(?:turn|tum|go|proceed|continue|return|skip)\b[^\n]{0,40}?"
        r"\b(?:to|io)\b\s*(?:page|poge|p\.)\s*"
        r"(?P<target>[0-9IlOoSsZz]{1,3})",
        flags=re.IGNORECASE,
    ),
]

PATTERNS_SECTION = [
    re.compile(
        r"(?P<prompt>(?:[^.!?\n]{0,200}?))"
        r"\b(?:turn|go|proceed|continue)\b[^\n]{0,30}?\b(?:to)\b\s*"
        r"(?P<target>[0-9]{1,3})(?!\s*(?:page|p\.|%|°))",
        flags=re.IGNORECASE,
    ),
]


def normalize_token(tok: str) -> int | None:
    raw = tok.strip()
    if not raw:
        return None
    mapped = (raw.replace("O", "0").replace("o", "0")
                 .replace("I", "1").replace("l", "1").replace("L", "1")
                 .replace("S", "5").replace("s", "5")
                 .replace("Z", "2").replace("z", "2"))
    if not mapped.isdigit():
        return None
    v = int(mapped)
    if v <= 0 or v > 999:
        return None
    return v


def parse_pages(pages_dir: Path) -> Dict[int, str]:
    out: Dict[int, str] = {}
    for p in sorted(pages_dir.glob("*.txt")):
        m = PAGE_FILE_RE.match(p.name)
        if not m:
            continue
        out[int(m.group(1))] = p.read_text(encoding="utf-8", errors="ignore")
    return out


def extract_choices(text: str, patterns: List[re.Pattern]) -> List[Tuple[int, str, str]]:
    """Return [(target, prompt, raw_match), ...] preserving order, deduped by target."""
    seen: set = set()
    results: List[Tuple[int, str, str]] = []
    for pat in patterns:
        for m in pat.finditer(text):
            target = normalize_token(m.group("target"))
            if target is None or target in seen:
                continue
            prompt = re.sub(r"\s+", " ", (m.group("prompt") or "")).strip(" ,.;:—-")
            # Trim prompt to last sentence-ish fragment
            prompt = prompt[-200:]
            raw = re.sub(r"\s+", " ", m.group(0)).strip()
            seen.add(target)
            results.append((target, prompt, raw))
    return results


_END_LINE_RE = re.compile(r"^\s*the\s+end\b.*$", flags=re.IGNORECASE)


def is_terminal(text: str) -> bool:
    """True if 'The End' appears as (near) its own line in the last few non-empty lines.

    The naive \\bthe\\s+end\\b search has too many false positives ("at the end
    of the hall"), so we require it to appear as a standalone line near the
    end of the page.
    """
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for ln in lines[-4:]:
        if _END_LINE_RE.match(ln):
            # Additional guard: the line should be short (not a sentence using "the end" mid-clause)
            if len(ln.split()) <= 4:
                return True
    return False


def build_graph(pages: Dict[int, str], reference_style: str, start_page: int | None,
                allow_sequential: bool = True) -> dict:
    if reference_style == "page":
        patterns = PATTERNS_PAGE
    elif reference_style == "section":
        patterns = PATTERNS_SECTION
    else:
        patterns = []

    page_set = set(pages.keys())
    sorted_pages = sorted(pages)

    nodes_out: List[dict] = []
    edges_out: List[dict] = []

    for page in sorted_pages:
        text = pages[page]
        terminal = is_terminal(text)
        choices: List[dict] = []

        if patterns:
            for target, prompt, raw in extract_choices(text, patterns):
                if target == page or target not in page_set:
                    continue
                choices.append({"target": target, "prompt": prompt, "raw": raw})

        # Sequential continuation when no explicit branch and page isn't terminal.
        # Skip up to 3 missing pages to tolerate blank/illustration-only pages.
        if allow_sequential and not terminal and not choices:
            for delta in (1, 2, 3):
                nxt = page + delta
                if nxt in page_set:
                    choices.append({"target": nxt, "prompt": "(continues)", "raw": ""})
                    break

        nodes_out.append({
            "id": page,
            "label": str(page),
            "is_terminal": terminal,
            "chars": len(text),
            "choices": choices,
        })
        for c in choices:
            edges_out.append({"source": page, "target": c["target"], "prompt": c["prompt"]})

    effective_start = start_page if start_page and start_page in page_set else (
        sorted_pages[0] if sorted_pages else None
    )
    return {
        "start_page": effective_start,
        "reference_style": reference_style,
        "nodes": nodes_out,
        "edges": edges_out,
    }


def render_mermaid(graph: dict) -> str:
    lines = ["graph TD"]
    for n in graph["nodes"]:
        lines.append(f'  P{n["id"]}["{n["label"]}"]')
    for e in graph["edges"]:
        lines.append(f'  P{e["source"]} --> P{e["target"]}')
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Build a story graph from extracted pages.")
    p.add_argument("--book-dir", type=Path, required=True,
                   help="output/books/<slug>")
    p.add_argument("--no-sequential", action="store_true",
                   help="Disable auto sequential edges when a page has no explicit choices.")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    meta_path = args.book_dir / "meta.json"
    pages_dir = args.book_dir / "pages"
    if not meta_path.exists():
        print(f"Missing {meta_path}", file=sys.stderr)
        sys.exit(1)
    if not pages_dir.exists():
        print(f"Missing {pages_dir}", file=sys.stderr)
        sys.exit(1)

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    pages = parse_pages(pages_dir)
    if not pages:
        print("No pages found.", file=sys.stderr)
        sys.exit(1)

    graph = build_graph(
        pages,
        reference_style=meta.get("reference_style", "page"),
        start_page=meta.get("story_start_page"),
        allow_sequential=not args.no_sequential,
    )
    graph["slug"] = meta["slug"]
    graph["title"] = meta.get("title", meta["slug"])

    (args.book_dir / "graph.json").write_text(json.dumps(graph, indent=2), encoding="utf-8")
    (args.book_dir / "graph.mmd").write_text(render_mermaid(graph), encoding="utf-8")

    n_nodes = len(graph["nodes"])
    n_edges = len(graph["edges"])
    n_terminal = sum(1 for n in graph["nodes"] if n["is_terminal"])
    branching = sum(1 for n in graph["nodes"] if len(n["choices"]) > 1)
    print(f"[{meta['slug']}] nodes={n_nodes} edges={n_edges} "
          f"terminals={n_terminal} branching={branching} start={graph['start_page']}")


if __name__ == "__main__":
    main()
