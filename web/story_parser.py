"""Text parsing utilities for CYOA pages. Used as a suggestion engine only."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional, Set

PAGE_FILE_RE = re.compile(r"^(\d+)-CoT\.txt$")
TURN_TO_RE = re.compile(
    r"\b(?:turn|tum|go|follow|take|return)\b[^\n]{0,120}?\b(?:to|ta|io)\b[^\n]{0,20}?"
    r"(?:page|poge|p\.)\s*([0-9IlOoSsZz]{1,3})",
    flags=re.IGNORECASE,
)

TERMINAL_PATTERNS = [
    re.compile(r"\bThe\s+End\b[.!]?\s*$", flags=re.IGNORECASE | re.MULTILINE),
    re.compile(r"\bEND\s+STORY\b[.!]?\s*$", flags=re.IGNORECASE | re.MULTILINE),
    re.compile(r"\bSTORY\s+ENDS\b[.!]?\s*$", flags=re.IGNORECASE | re.MULTILINE),
    re.compile(r"\bTHE\s+END\b[.!]?\s*$", flags=re.IGNORECASE | re.MULTILINE),
    re.compile(r"\bEnd\.\s*$", flags=re.IGNORECASE | re.MULTILINE),
]


def normalize_page_token(token: str) -> int | None:
    raw = token.strip()
    if raw.lower() in {"s", "z"}:
        return None
    if not re.search(r"[0-9IlOoL]", raw):
        return None

    mapped = (
        raw.replace("O", "0")
        .replace("o", "0")
        .replace("I", "1")
        .replace("l", "1")
        .replace("L", "1")
        .replace("S", "5")
        .replace("s", "5")
        .replace("Z", "2")
        .replace("z", "2")
    )
    if not mapped.isdigit():
        return None
    value = int(mapped)
    if value <= 0 or value > 300:
        return None
    return value


def parse_pages(pages_dir: Path) -> Dict[int, str]:
    pages: Dict[int, str] = {}
    for path in sorted(pages_dir.glob("*-CoT.txt")):
        match = PAGE_FILE_RE.match(path.name)
        if not match:
            continue
        page = int(match.group(1))
        pages[page] = path.read_text(encoding="utf-8", errors="ignore")
    return pages


def extract_links(text: str) -> List[int]:
    links: List[int] = []
    for match in TURN_TO_RE.finditer(text):
        page = normalize_page_token(match.group(1))
        if page is None:
            continue
        if page not in links:
            links.append(page)
    return links


def extract_links_with_matches(text: str) -> List[Dict]:
    """Return suggested outgoing page numbers plus the raw regex match text."""
    results: List[Dict] = []
    seen: Set[int] = set()
    for match in TURN_TO_RE.finditer(text):
        page = normalize_page_token(match.group(1))
        if page is None:
            continue
        if page not in seen:
            seen.add(page)
            results.append({"page": page, "match": match.group(0)})
    return results


def is_terminal(text: str) -> bool:
    for pattern in TERMINAL_PATTERNS:
        if pattern.search(text):
            return True
    return False


def suggest_edges(page_text: str, page_set: Optional[Set[int]] = None) -> List[int]:
    """Return suggested outgoing page numbers from the given text."""
    targets = extract_links(page_text)
    if page_set is not None:
        targets = [t for t in targets if t in page_set]
    return targets


def suggest_graph_delta(
    pages_dir: Path,
    current_graph: Dict,
) -> Dict:
    """Compare parsed text against the current MMD graph and return a diff report.

    current_graph format: {"nodes": [...], "edges": [...]}
    """
    pages = parse_pages(pages_dir)
    page_set = set(pages.keys())

    # Build current edge set from graph
    current_edges: Set[Tuple[int, int]] = set()
    for edge in current_graph.get("edges", []):
        try:
            src = int(edge["source"][1:])
            dst = int(edge["target"][1:])
            current_edges.add((src, dst))
        except (KeyError, ValueError, IndexError):
            continue

    # Parse text and build suggested edges (including sequential fallback)
    suggested_edges: Set[Tuple[int, int]] = set()
    terminals: Set[int] = set()
    broken_links: List[Dict] = []

    sorted_pages = sorted(pages)
    for page, text in pages.items():
        targets = [t for t in extract_links(text) if t in page_set and t != page]
        if targets:
            for t in targets:
                suggested_edges.add((page, t))
            continue

        if is_terminal(text):
            terminals.add(page)
            continue

        # Sequential fallback
        next_page = page + 1
        if next_page in page_set:
            suggested_edges.add((page, next_page))

    # Detect broken links in current graph
    for src, dst in current_edges:
        if dst not in page_set:
            broken_links.append({"source": src, "target": dst, "reason": "target page missing"})

    # Compute diffs
    new_edges = sorted(suggested_edges - current_edges)
    orphan_edges = sorted(current_edges - suggested_edges)

    return {
        "pages_parsed": len(pages),
        "suggested_new_edges": [{"source": s, "target": t} for s, t in new_edges],
        "orphan_edges": [{"source": s, "target": t} for s, t in orphan_edges],
        "terminals": sorted(terminals),
        "broken_links": broken_links,
    }
