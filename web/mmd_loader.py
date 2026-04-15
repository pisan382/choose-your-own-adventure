"""Parse and write Mermaid graph files for the CYOA story graph."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

NODE_DEF_RE = re.compile(r'^\s*(P\d+)\[("[^"]*")\]\s*$')
EDGE_RE = re.compile(r'^\s*(P\d+)\s*-->\s*(P\d+)\s*$')


def load_graph(mmd_path: Path) -> Dict:
    """Parse a Mermaid graph TD file into a JSON-friendly dict.

    Returns:
        {
            "nodes": [{"id": "P2", "label": "2", "page": 2}, ...],
            "edges": [{"source": "P2", "target": "P3"}, ...]
        }
    """
    nodes: List[Dict] = []
    edges: List[Dict] = []
    seen_nodes: Set[str] = set()

    text = mmd_path.read_text(encoding="utf-8", errors="ignore")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.lower().startswith("graph "):
            continue

        node_match = NODE_DEF_RE.match(line)
        if node_match:
            node_id = node_match.group(1)
            label_raw = node_match.group(2)
            label = label_raw.strip('"')
            if node_id not in seen_nodes:
                seen_nodes.add(node_id)
                page_num = int(node_id[1:])
                nodes.append({"id": node_id, "label": label, "page": page_num})
            continue

        edge_match = EDGE_RE.match(line)
        if edge_match:
            source = edge_match.group(1)
            target = edge_match.group(2)
            edges.append({"source": source, "target": target})
            if source not in seen_nodes:
                seen_nodes.add(source)
                page_num = int(source[1:])
                nodes.append({"id": source, "label": str(page_num), "page": page_num})
            if target not in seen_nodes:
                seen_nodes.add(target)
                page_num = int(target[1:])
                nodes.append({"id": target, "label": str(page_num), "page": page_num})
            continue

    return {"nodes": nodes, "edges": edges}


def save_graph(mmd_path: Path, graph: Dict) -> None:
    """Write a graph dict back to a Mermaid graph TD file."""
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    # Build node definitions
    node_lines: List[str] = []
    for node in sorted(nodes, key=lambda n: int(re.sub(r"[^0-9]", "", n["id"]))):
        label = node.get("label", node["id"])
        node_lines.append(f'  {node["id"]}["{label}"]')

    # Build edges
    edge_lines: List[str] = []
    for edge in edges:
        edge_lines.append(f'  {edge["source"]} --> {edge["target"]}')

    lines = ["graph TD"] + node_lines + edge_lines
    mmd_path.parent.mkdir(parents=True, exist_ok=True)
    mmd_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
