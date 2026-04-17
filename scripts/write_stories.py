#!/usr/bin/env python3
"""Enumerate bounded story paths from a book's graph.json.

Reads:   output/books/<slug>/graph.json
         output/books/<slug>/pages/*.txt
Writes:  output/books/<slug>/stories/story-NNNN.txt
         output/books/<slug>/stories/manifest.json

Termination: a path ends when
  - current node has no outgoing edges (natural end)
  - the next node already appears in the path (cycle)
  - the path hits --max-decisions branch points
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple


def load_graph(book_dir: Path) -> dict:
    return json.loads((book_dir / "graph.json").read_text(encoding="utf-8"))


def load_pages(book_dir: Path) -> Dict[int, str]:
    out: Dict[int, str] = {}
    for p in (book_dir / "pages").glob("*.txt"):
        # Filename like "003.txt" -> 3
        stem = p.stem.lstrip("0") or "0"
        try:
            out[int(stem)] = p.read_text(encoding="utf-8", errors="ignore")
        except ValueError:
            continue
    return out


def enumerate_paths(start: int, adj: Dict[int, List[int]], terminals: set,
                    max_decisions: int, max_paths: int) -> List[Tuple[List[int], str]]:
    """DFS with decision-point budget and cycle detection. Capped by max_paths."""
    results: List[Tuple[List[int], str]] = []

    def dfs(path: List[int], decisions: int) -> None:
        if len(results) >= max_paths:
            return
        current = path[-1]
        # Respect explicit terminal nodes even if edges exist downstream.
        if current in terminals:
            results.append((path[:], "end"))
            return
        nxt = adj.get(current, [])
        if not nxt:
            results.append((path[:], "end"))
            return
        branching = len(nxt) > 1
        new_decisions = decisions + (1 if branching else 0)
        if new_decisions > max_decisions:
            results.append((path[:], "max-decisions"))
            return
        for n in nxt:
            if len(results) >= max_paths:
                return
            if n in path:
                results.append((path + [n], "cycle"))
                continue
            dfs(path + [n], new_decisions)

    dfs([start], 0)
    return results


def render_story(path: List[int], pages: Dict[int, str], reason: str) -> str:
    lines = ["Path: " + " -> ".join(str(p) for p in path), ""]
    for i, pg in enumerate(path, 1):
        lines.append(f"=== Step {i}: Page {pg} ===")
        lines.append(pages.get(pg, f"Page {pg}\n\n[Missing page text]").rstrip())
        lines.append("")
    if reason != "end":
        lines.append(f"[Path terminated by: {reason}]")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Enumerate bounded story paths.")
    p.add_argument("--book-dir", type=Path, required=True)
    p.add_argument("--max-decisions", type=int, default=20)
    p.add_argument("--max-paths", type=int, default=500,
                   help="Hard cap on enumerated paths (safety valve on combinatorial graphs).")
    p.add_argument("--start-page", type=int, default=None,
                   help="Override the graph's declared start_page.")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    book_dir: Path = args.book_dir
    if not (book_dir / "graph.json").exists():
        print(f"Missing graph at {book_dir / 'graph.json'}", file=sys.stderr)
        sys.exit(1)

    graph = load_graph(book_dir)
    pages = load_pages(book_dir)

    adj: Dict[int, List[int]] = {}
    terminals: set = set()
    for n in graph["nodes"]:
        adj[n["id"]] = [c["target"] for c in n["choices"]]
        if n.get("is_terminal"):
            terminals.add(n["id"])

    start = args.start_page or graph.get("start_page")
    if start is None or start not in adj:
        # Pick the lowest node as a fallback
        if not adj:
            print("Empty graph.", file=sys.stderr)
            sys.exit(1)
        start = min(adj)

    paths = enumerate_paths(start, adj, terminals, args.max_decisions, args.max_paths)

    stories_dir = book_dir / "stories"
    stories_dir.mkdir(parents=True, exist_ok=True)
    for old in stories_dir.glob("story-*.txt"):
        old.unlink()

    manifest = []
    for idx, (path, reason) in enumerate(paths, 1):
        fname = f"story-{idx:04d}.txt"
        (stories_dir / fname).write_text(render_story(path, pages, reason), encoding="utf-8")
        manifest.append({
            "file": fname,
            "path": path,
            "end_reason": reason,
            "start_page": path[0],
            "end_page": path[-1],
            "length": len(path),
        })
    (stories_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"[{graph.get('slug','?')}] start={start} stories={len(paths)} "
          f"(max_decisions={args.max_decisions}, max_paths={args.max_paths})")


if __name__ == "__main__":
    main()
