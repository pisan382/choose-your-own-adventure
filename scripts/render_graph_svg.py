#!/usr/bin/env python3
"""Render graph.json to SVG using a Sugiyama-style layered layout.

Adapted from render_story_graph_svg.py (which reads Mermaid). Reads
output/books/<slug>/graph.json and writes graph.svg into the same dir.
Highlights:
  - terminal nodes (no outgoing edges) in red
  - the main trunk (greedy lowest-target successor path from start) in blue
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from collections import deque
from pathlib import Path
from statistics import mean
from typing import Dict, Iterable, List, Set, Tuple

NODE_W = 68
NODE_H = 30
LAYER_GAP = 132
ROW_GAP = 42
MARGIN_X = 40
MARGIN_Y = 40
FONT_SIZE = 12

DEFAULT_NODE_FILL = "#e2e8f0"
DEFAULT_NODE_STROKE = "#475569"
DEFAULT_EDGE_STROKE = "#94a3b8"
TERMINAL_NODE_FILL = "#fee2e2"
TERMINAL_NODE_STROKE = "#b91c1c"
TRUNK_NODE_FILL = "#dbeafe"
TRUNK_NODE_STROKE = "#1d4ed8"
TRUNK_EDGE_STROKE = "#2563eb"


def load_graph(book_dir: Path) -> dict:
    return json.loads((book_dir / "graph.json").read_text(encoding="utf-8"))


def build_preds(nodes: List[int], edges: Dict[int, List[int]]) -> Dict[int, List[int]]:
    preds = {n: [] for n in nodes}
    for src in nodes:
        for dst in edges.get(src, []):
            preds.setdefault(dst, []).append(src)
    for k in preds:
        preds[k].sort()
    return preds


def topo_order(nodes: List[int], edges: Dict[int, List[int]]) -> List[int]:
    indeg = {n: 0 for n in nodes}
    for src in nodes:
        for dst in edges.get(src, []):
            indeg[dst] = indeg.get(dst, 0) + 1
    q = deque(sorted(n for n in nodes if indeg.get(n, 0) == 0))
    order: List[int] = []
    while q:
        v = q.popleft()
        order.append(v)
        for w in sorted(edges.get(v, [])):
            indeg[w] -= 1
            if indeg[w] == 0:
                q.append(w)
    leftover = [n for n in nodes if n not in set(order)]
    return order + sorted(leftover)


def compute_levels(nodes: List[int], edges: Dict[int, List[int]]) -> Dict[int, int]:
    order = topo_order(nodes, edges)
    preds = build_preds(nodes, edges)
    levels: Dict[int, int] = {}
    for n in order:
        ps = preds.get(n, [])
        levels[n] = 0 if not ps else max(levels.get(p, 0) for p in ps) + 1
    for n in nodes:
        levels.setdefault(n, 0)
    return levels


def build_layers(nodes: List[int], levels: Dict[int, int]) -> Dict[int, List[int]]:
    layers: Dict[int, List[int]] = {}
    for n in nodes:
        layers.setdefault(levels[n], []).append(n)
    for k in layers:
        layers[k].sort()
    return layers


def bary(node: int, neighbors: Iterable[int], positions: Dict[int, int], fallback: int) -> float:
    pts = [positions[m] for m in neighbors if m in positions]
    return mean(pts) if pts else float(fallback)


def reduce_crossings(nodes: List[int], edges: Dict[int, List[int]],
                     levels: Dict[int, int]) -> Dict[int, List[int]]:
    preds = build_preds(nodes, edges)
    layers = build_layers(nodes, levels)
    max_lvl = max(layers, default=0)
    for _ in range(8):
        for lvl in range(1, max_lvl + 1):
            prev_pos = {n: i for i, n in enumerate(layers.get(lvl - 1, []))}
            cur_pos = {n: i for i, n in enumerate(layers.get(lvl, []))}
            layers[lvl].sort(key=lambda n: (bary(n, preds.get(n, []), prev_pos, cur_pos[n]), n))
        for lvl in range(max_lvl - 1, -1, -1):
            next_pos = {n: i for i, n in enumerate(layers.get(lvl + 1, []))}
            cur_pos = {n: i for i, n in enumerate(layers.get(lvl, []))}
            layers[lvl].sort(key=lambda n: (bary(n, edges.get(n, []), next_pos, cur_pos[n]), n))
    return layers


def find_trunk(start: int, edges: Dict[int, List[int]]) -> Tuple[Set[int], Set[Tuple[int, int]]]:
    """Greedy walk: always take the lowest target page."""
    tn: Set[int] = {start}
    te: Set[Tuple[int, int]] = set()
    cur = start
    seen = {start}
    while True:
        ts = sorted(edges.get(cur, []))
        if not ts:
            break
        nxt = ts[0]
        te.add((cur, nxt))
        if nxt in seen:
            break
        tn.add(nxt)
        seen.add(nxt)
        cur = nxt
    return tn, te


def compute_positions(nodes: List[int], edges: Dict[int, List[int]]):
    levels = compute_levels(nodes, edges)
    layers = reduce_crossings(nodes, edges, levels)
    positions: Dict[int, Tuple[int, int]] = {}
    max_sz = max((len(v) for v in layers.values()), default=0)
    for lvl in sorted(layers):
        row = layers[lvl]
        height = max(0, (len(row) - 1) * ROW_GAP)
        top = MARGIN_Y + ((max_sz - 1) * ROW_GAP - height) // 2
        for i, n in enumerate(row):
            positions[n] = (MARGIN_X + lvl * LAYER_GAP, top + i * ROW_GAP)
    width = MARGIN_X * 2 + max(levels.values(), default=0) * LAYER_GAP + NODE_W + 40
    height = MARGIN_Y * 2 + max(0, max_sz - 1) * ROW_GAP + NODE_H + 20
    return positions, width, height


def render_svg(graph: dict) -> str:
    nodes = sorted(n["id"] for n in graph["nodes"])
    edges: Dict[int, List[int]] = {n["id"]: [c["target"] for c in n["choices"]] for n in graph["nodes"]}
    # Ensure every destination also appears as a node (tolerate dangling refs)
    for src, dsts in list(edges.items()):
        for d in dsts:
            if d not in edges:
                edges[d] = []
    nodes = sorted(set(nodes) | set(edges.keys()))

    terminals = {n["id"] for n in graph["nodes"] if n.get("is_terminal") or not n.get("choices")}
    start = graph.get("start_page") or (nodes[0] if nodes else None)
    trunk_n, trunk_e = (set(), set()) if start is None else find_trunk(start, edges)

    positions, width, height = compute_positions(nodes, edges)

    lines: List[str] = []
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">')
    lines.append('<defs>')
    lines.append('<marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">')
    lines.append('<polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />')
    lines.append('</marker>')
    lines.append('</defs>')
    lines.append(f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff" />')

    for src in nodes:
        if src not in positions:
            continue
        x1, y1 = positions[src]
        for dst in edges.get(src, []):
            if dst not in positions:
                continue
            x2, y2 = positions[dst]
            sx, sy = x1 + NODE_W, y1 + NODE_H // 2
            ex, ey = x2, y2 + NODE_H // 2
            b1 = sx + max(24, (ex - sx) * 0.35)
            b2 = ex - max(24, (ex - sx) * 0.35)
            d = f'M {sx} {sy} C {b1:.1f} {sy}, {b2:.1f} {ey}, {ex} {ey}'
            is_trunk = (src, dst) in trunk_e
            stroke = TRUNK_EDGE_STROKE if is_trunk else DEFAULT_EDGE_STROKE
            sw = "2.6" if is_trunk else "1.4"
            op = "0.95" if is_trunk else "0.85"
            lines.append(f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" marker-end="url(#arrow)" />')

    for n in nodes:
        if n not in positions:
            continue
        x, y = positions[n]
        label = html.escape(str(n))
        if n in trunk_n:
            fill, stroke, sw = TRUNK_NODE_FILL, TRUNK_NODE_STROKE, "2"
        elif n in terminals:
            fill, stroke, sw = TERMINAL_NODE_FILL, TERMINAL_NODE_STROKE, "1.6"
        else:
            fill, stroke, sw = DEFAULT_NODE_FILL, DEFAULT_NODE_STROKE, "1.2"
        lines.append(f'<rect x="{x}" y="{y}" rx="8" ry="8" width="{NODE_W}" height="{NODE_H}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" />')
        lines.append(f'<text x="{x + NODE_W/2}" y="{y + NODE_H/2 + 4}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="{FONT_SIZE}" fill="#0f172a">{label}</text>')

    lines.append('</svg>')
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Render graph.json to SVG.")
    p.add_argument("--book-dir", type=Path, required=True)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    graph_path = args.book_dir / "graph.json"
    if not graph_path.exists():
        print(f"Missing {graph_path}", file=sys.stderr)
        sys.exit(1)
    graph = load_graph(args.book_dir)
    svg = render_svg(graph)
    (args.book_dir / "graph.svg").write_text(svg, encoding="utf-8")
    print(f"[{graph.get('slug','?')}] svg: {args.book_dir / 'graph.svg'}")


if __name__ == "__main__":
    main()
