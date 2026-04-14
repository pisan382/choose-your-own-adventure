"""FastAPI backend for the CYOA web interface."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from web.mmd_loader import load_graph, save_graph
from web.story_parser import (
    extract_links_with_matches,
    is_terminal,
    parse_pages,
    suggest_edges,
    suggest_graph_delta,
)

app = FastAPI(title="CYOA Web Interface")

import os

PROJECT_ROOT = Path(__file__).parent.parent
if os.environ.get("CYOA_TEST_PAGES_DIR"):
    COT_PAGES_DIR = Path(os.environ["CYOA_TEST_PAGES_DIR"])
    MMD_PATH = Path(os.environ.get("CYOA_TEST_MMD_PATH", str(PROJECT_ROOT / "output" / "cot-story-graph.mmd")))
    META_PATH = Path(os.environ.get("CYOA_TEST_META_PATH", str(PROJECT_ROOT / "output" / "pages-meta.json")))
    OUTPUT_DIR = Path(os.environ.get("CYOA_TEST_OUTPUT_DIR", str(PROJECT_ROOT / "output")))
else:
    COT_PAGES_DIR = PROJECT_ROOT / "output" / "cot-pages-ocr-v2"
    MMD_PATH = PROJECT_ROOT / "output" / "cot-story-graph.mmd"
    META_PATH = PROJECT_ROOT / "output" / "pages-meta.json"
    OUTPUT_DIR = PROJECT_ROOT / "output"

STORIES_DIR = OUTPUT_DIR / "cot-stories"
SVG_PATH = OUTPUT_DIR / "cot-story-graph.svg"

# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------

def load_meta() -> Dict:
    if META_PATH.exists():
        try:
            return json.loads(META_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {}


def save_meta(meta: Dict) -> None:
    META_PATH.parent.mkdir(parents=True, exist_ok=True)
    META_PATH.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


def ensure_meta() -> Dict:
    meta = load_meta()
    changed = False
    pages = parse_pages(COT_PAGES_DIR)
    for page_num in pages:
        key = str(page_num)
        if key not in meta:
            meta[key] = {}
            changed = True
        # Auto-detect terminal if not manually set
        if "isEnding" not in meta[key]:
            text = pages[page_num]
            meta[key]["isEnding"] = is_terminal(text)
            changed = True
    if changed:
        save_meta(meta)
    return meta


def get_page_meta(page_num: int, meta: Optional[Dict] = None) -> Dict:
    if meta is None:
        meta = ensure_meta()
    return meta.get(str(page_num), {})


def set_page_meta(page_num: int, updates: Dict) -> Dict:
    meta = ensure_meta()
    key = str(page_num)
    if key not in meta:
        meta[key] = {}
    meta[key].update(updates)
    save_meta(meta)
    return meta[key]

# ---------------------------------------------------------------------------
# Graph helpers
# ---------------------------------------------------------------------------

def get_mmd_graph() -> Dict:
    if not MMD_PATH.exists():
        return {"nodes": [], "edges": []}
    return load_graph(MMD_PATH)


def save_mmd_graph(graph: Dict) -> None:
    save_graph(MMD_PATH, graph)


def enrich_graph(graph: Dict) -> Dict:
    """Enrich MMD graph with metadata and union in orphan text pages."""
    meta = ensure_meta()
    pages = parse_pages(COT_PAGES_DIR)

    # Build node map
    node_map: Dict[str, Dict] = {}
    for node in graph.get("nodes", []):
        node_map[node["id"]] = node

    # Add orphan pages (have text but not in MMD)
    for page_num in pages:
        node_id = f"P{page_num}"
        if node_id not in node_map:
            node_map[node_id] = {"id": node_id, "label": str(page_num), "page": page_num}

    # Enrich all nodes with metadata
    nodes = []
    for node_id in sorted(node_map, key=lambda nid: int(nid[1:])):
        node = node_map[node_id]
        page_num = node["page"]
        pm = get_page_meta(page_num, meta)
        node["isEnding"] = pm.get("isEnding", False)
        node["x"] = pm.get("x", None)
        node["y"] = pm.get("y", None)
        node["tags"] = pm.get("tags", [])
        node["hasText"] = page_num in pages
        nodes.append(node)

    # Enrich edges with target existence
    edges = []
    for edge in graph.get("edges", []):
        try:
            dst_page = int(edge["target"][1:])
        except (ValueError, IndexError):
            dst_page = None
        enriched = dict(edge)
        enriched["targetExists"] = dst_page in pages if dst_page else False
        edges.append(enriched)

    return {"nodes": nodes, "edges": edges}

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class EdgePayload(BaseModel):
    source: int
    target: int


class RebuildPayload(BaseModel):
    confirm: bool = False


class MetaPayload(BaseModel):
    isEnding: Optional[bool] = None
    x: Optional[float] = None
    y: Optional[float] = None
    tags: Optional[List[str]] = None


class NodePayload(BaseModel):
    page: int


class LayoutPayload(BaseModel):
    positions: Dict[str, Dict[str, float]]

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/graph")
def api_graph():
    graph = get_mmd_graph()
    return enrich_graph(graph)


@app.get("/api/pages")
def api_pages():
    pages = parse_pages(COT_PAGES_DIR)
    meta = ensure_meta()
    graph = get_mmd_graph()

    # Build outgoing map from MMD
    outgoing: Dict[int, List[int]] = {}
    for edge in graph.get("edges", []):
        try:
            src = int(edge["source"][1:])
            dst = int(edge["target"][1:])
        except (ValueError, IndexError):
            continue
        outgoing.setdefault(src, []).append(dst)

    result = []
    for page_num in sorted(pages):
        pm = get_page_meta(page_num, meta)
        result.append({
            "page": page_num,
            "hasText": True,
            "isEnding": pm.get("isEnding", False),
            "outgoing": sorted(set(outgoing.get(page_num, []))),
            "tags": pm.get("tags", []),
        })
    return result


@app.get("/api/pages/{page_num}")
def api_page(page_num: int):
    path = COT_PAGES_DIR / f"{page_num:02d}-CoT.txt"
    if not path.exists():
        path = COT_PAGES_DIR / f"{page_num}-CoT.txt"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Page not found")
    return {"page": page_num, "text": path.read_text(encoding="utf-8", errors="ignore")}


@app.get("/api/pages/{page_num}/suggestions")
def api_page_suggestions(page_num: int):
    path = COT_PAGES_DIR / f"{page_num:02d}-CoT.txt"
    if not path.exists():
        path = COT_PAGES_DIR / f"{page_num}-CoT.txt"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Page not found")
    text = path.read_text(encoding="utf-8", errors="ignore")
    pages = parse_pages(COT_PAGES_DIR)
    page_set = set(pages.keys())
    suggested = suggest_edges(text, page_set)
    matches = extract_links_with_matches(text)
    return {
        "page": page_num,
        "suggested_edges": suggested,
        "matches": matches,
        "is_terminal": is_terminal(text),
    }


@app.post("/api/pages/{page_num}")
def api_save_page(page_num: int, text: str = Form(...)):
    path = COT_PAGES_DIR / f"{page_num:02d}-CoT.txt"
    if not path.exists():
        path = COT_PAGES_DIR / f"{page_num}-CoT.txt"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

    # Refresh metadata auto-detect if not manually overridden
    meta = ensure_meta()
    key = str(page_num)
    if key not in meta:
        meta[key] = {}
    # Only overwrite auto-detected terminal if user hasn't manually set it
    if "isEnding" not in meta[key] or meta[key].get("isEndingAuto", True):
        meta[key]["isEnding"] = is_terminal(text)
        meta[key]["isEndingAuto"] = True
        save_meta(meta)

    pages = parse_pages(COT_PAGES_DIR)
    page_set = set(pages.keys())
    suggested = suggest_edges(text, page_set)
    return {
        "page": page_num,
        "saved": True,
        "suggested_edges": suggested,
        "is_terminal": is_terminal(text),
    }


@app.post("/api/pages/{page_num}/meta")
def api_save_meta(page_num: int, payload: MetaPayload):
    updates: Dict = {}
    if payload.isEnding is not None:
        updates["isEnding"] = payload.isEnding
        updates["isEndingAuto"] = False
    if payload.x is not None:
        updates["x"] = payload.x
    if payload.y is not None:
        updates["y"] = payload.y
    if payload.tags is not None:
        updates["tags"] = payload.tags
    result = set_page_meta(page_num, updates)
    return {"page": page_num, "meta": result}


@app.post("/api/graph/edges")
def api_add_edge(payload: EdgePayload):
    graph = get_mmd_graph()
    source_id = f"P{payload.source}"
    target_id = f"P{payload.target}"

    # Ensure nodes exist
    existing_ids = {n["id"] for n in graph.get("nodes", [])}
    if source_id not in existing_ids:
        graph["nodes"].append({"id": source_id, "label": str(payload.source), "page": payload.source})
    if target_id not in existing_ids:
        graph["nodes"].append({"id": target_id, "label": str(payload.target), "page": payload.target})

    # Add edge if not present
    edge = {"source": source_id, "target": target_id}
    if edge not in graph.get("edges", []):
        graph.setdefault("edges", []).append(edge)

    save_mmd_graph(graph)
    return {"added": edge}


@app.post("/api/graph/nodes")
def api_add_node(payload: NodePayload):
    graph = get_mmd_graph()
    node_id = f"P{payload.page}"
    existing_ids = {n["id"] for n in graph.get("nodes", [])}
    if node_id not in existing_ids:
        graph["nodes"].append({"id": node_id, "label": str(payload.page), "page": payload.page})
        save_mmd_graph(graph)
    return {"added": {"id": node_id, "label": str(payload.page), "page": payload.page}}


@app.post("/api/graph/layout")
def api_save_layout(payload: LayoutPayload):
    meta = ensure_meta()
    for page_str, pos in payload.positions.items():
        if page_str not in meta:
            meta[page_str] = {}
        if "x" in pos:
            meta[page_str]["x"] = pos["x"]
        if "y" in pos:
            meta[page_str]["y"] = pos["y"]
    save_meta(meta)
    return {"saved": len(payload.positions)}


@app.delete("/api/graph/edges")
def api_remove_edge(payload: EdgePayload):
    graph = get_mmd_graph()
    source_id = f"P{payload.source}"
    target_id = f"P{payload.target}"
    original_len = len(graph.get("edges", []))
    graph["edges"] = [
        e for e in graph.get("edges", [])
        if not (e.get("source") == source_id and e.get("target") == target_id)
    ]
    if len(graph["edges"]) == original_len:
        raise HTTPException(status_code=404, detail="Edge not found")
    save_mmd_graph(graph)
    return {"removed": {"source": source_id, "target": target_id}}


@app.post("/api/graph/rebuild")
def api_rebuild(payload: RebuildPayload):
    graph = get_mmd_graph()
    delta = suggest_graph_delta(COT_PAGES_DIR, graph)

    if payload.confirm:
        # Build new graph from suggestions
        pages = parse_pages(COT_PAGES_DIR)
        page_set = set(pages.keys())
        new_edges: List[Dict] = []
        node_ids: set[str] = set()
        for e in delta["suggested_new_edges"]:
            src_id = f"P{e['source']}"
            dst_id = f"P{e['target']}"
            new_edges.append({"source": src_id, "target": dst_id})
            node_ids.add(src_id)
            node_ids.add(dst_id)
        # Keep orphan nodes from current graph if they have text
        for node in graph.get("nodes", []):
            node_ids.add(node["id"])

        nodes: List[Dict] = []
        for nid in sorted(node_ids, key=lambda x: int(x[1:])):
            page_num = int(nid[1:])
            nodes.append({"id": nid, "label": str(page_num), "page": page_num})

        save_mmd_graph({"nodes": nodes, "edges": new_edges})
        return {"confirmed": True, "delta": delta}

    return {"confirmed": False, "delta": delta}


@app.post("/api/import")
async def api_import(files: List[UploadFile]):
    saved_names: List[str] = []
    for upload in files:
        if upload.filename is None:
            continue
        if not upload.filename.endswith("-CoT.txt"):
            continue
        dest = COT_PAGES_DIR / upload.filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = await upload.read()
        dest.write_bytes(content)
        saved_names.append(upload.filename)

    graph = get_mmd_graph()
    delta = suggest_graph_delta(COT_PAGES_DIR, graph)
    return {"saved": saved_names, "delta": delta}


@app.post("/api/export")
def api_export():
    # Ensure canonical outputs are up to date
    # NOTE: we do NOT run build_story_graph.py here because MMD is canonical.
    scripts = [
        ("render_story_graph_svg.py", ["--graph", str(MMD_PATH), "--output", str(SVG_PATH)]),
        ("write_all_stories.py", [
            "--graph", str(MMD_PATH),
            "--pages-dir", str(COT_PAGES_DIR),
            "--start-page", "2",
            "--max-decisions", "20",
            "--output-dir", str(STORIES_DIR),
        ]),
    ]
    script_dir = PROJECT_ROOT / "scripts"
    for script_name, args in scripts:
        script_path = script_dir / script_name
        if script_path.exists():
            subprocess.run(["python3", str(script_path)] + args, check=True)

    # Create static dist for reader mode
    dist_dir = OUTPUT_DIR / "dist"
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    dist_dir.mkdir(parents=True, exist_ok=True)

    static_src = Path(__file__).parent / "static"
    if static_src.exists():
        for f in static_src.iterdir():
            if f.is_file():
                shutil.copy2(f, dist_dir / f.name)
            elif f.is_dir():
                shutil.copytree(f, dist_dir / f.name, dirs_exist_ok=True)

    # Pre-render each page into a standalone HTML file
    graph = get_mmd_graph()
    pages = parse_pages(COT_PAGES_DIR)
    meta = ensure_meta()

    # Build outgoing map
    outgoing_map: Dict[int, List[int]] = {}
    for edge in graph.get("edges", []):
        try:
            src = int(edge["source"][1:])
            dst = int(edge["target"][1:])
        except (ValueError, IndexError):
            continue
        outgoing_map.setdefault(src, []).append(dst)

    choice_re = re.compile(
        r"\b(?:turn|tum|go|follow|take|return)\b[^\n]{0,120}?\b(?:to|ta|io)\b[^\n]{0,20}?"
        r"(?:page|poge|p\.)\s*([0-9]{1,3})",
        flags=re.IGNORECASE,
    )

    for page_num, text in pages.items():
        outgoing = sorted(set(outgoing_map.get(page_num, [])))
        pm = get_page_meta(page_num, meta)
        is_ending = pm.get("isEnding", False)

        # Linkify text
        outgoing_set = set(outgoing)
        lines = text.splitlines()
        content_lines = []
        extra_links = []

        for line in lines:
            replaced = False
            for m in choice_re.finditer(line):
                target = int(m.group(1))
                if target in outgoing_set:
                    content_lines.append(f'<a class="choice-link" href="page-{target}.html">{line.strip()}</a>')
                    replaced = True
                    break
            if not replaced:
                content_lines.append(line)

        # Extra MMD edges not matched by regex
        linked_set = set()
        for line in content_lines:
            if 'choice-link' in line:
                m = re.search(r'page-(\d+)\.html', line)
                if m:
                    linked_set.add(int(m.group(1)))

        for target in outgoing:
            if target not in linked_set:
                extra_links.append(f'<a class="choice-link" href="page-{target}.html">Go to page {target}</a>')

        terminal_html = ''
        if is_ending:
            terminal_html = '<div id="terminal-overlay"><h2>The End</h2><a class="choice-link" href="page-2.html">Start Over</a></div>'
        elif not outgoing:
            next_page = page_num + 1
            if next_page in pages:
                extra_links.append(f'<a class="choice-link" href="page-{next_page}.html">Continue to page {next_page}</a>')

        content_joined = "\n".join(content_lines)
        links_joined = "\n".join(extra_links)

        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page {page_num}</title>
  <link rel="stylesheet" href="reader.css">
</head>
<body>
  <header><h1>The Cave of Time</h1><div class="controls"><a class="choice-link" href="page-2.html">Restart</a><span>Page {page_num}</span></div></header>
  <main>
    <article id="page-content" style="white-space: pre-wrap;">{content_joined}</article>
    <div id="choices">{links_joined}</div>
    {terminal_html}
  </main>
  <footer><a href="index.html">Home</a></footer>
</body>
</html>'''
        (dist_dir / f"page-{page_num}.html").write_text(html, encoding="utf-8")

    # Create index.html that redirects to page-2.html
    index_html = '''<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0; url=page-2.html"></head>
<body><p><a href="page-2.html">Start reading</a></p></body>
</html>'''
    (dist_dir / "index.html").write_text(index_html, encoding="utf-8")

    # Zip everything up
    import zipfile
    zip_path = OUTPUT_DIR / "cyoa-export.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in dist_dir.rglob('*'):
            zf.write(f, f"dist/{f.relative_to(dist_dir)}")
        for f in COT_PAGES_DIR.glob('*-CoT.txt'):
            zf.write(f, f"cot-pages-ocr-v2/{f.name}")
        zf.write(MMD_PATH, "cot-story-graph.mmd")
        if SVG_PATH.exists():
            zf.write(SVG_PATH, "cot-story-graph.svg")

    return {
        "exported": True,
        "dist": str(dist_dir.resolve()),
        "zip": str(zip_path.resolve()),
        "mmd": str(MMD_PATH.resolve()),
        "svg": str(SVG_PATH.resolve()),
        "stories": str(STORIES_DIR.resolve()),
    }

@app.get("/api/paths")
def api_paths():
    graph = get_mmd_graph()
    edges_map: Dict[str, List[str]] = {}
    for e in graph.get("edges", []):
        edges_map.setdefault(e["source"], []).append(e["target"])

    node_map = {n["id"]: n for n in graph.get("nodes", [])}
    paths: List[List[int]] = []
    max_depth = 20

    def dfs(node_id: str, path: List[int], visited: Set[str]):
        page = int(node_id[1:])
        new_path = path + [page]
        node = node_map.get(node_id, {})
        outs = edges_map.get(node_id, [])

        if node.get("isEnding") or not outs or len(new_path) > max_depth:
            paths.append(new_path)
            return

        for next_id in outs:
            if next_id in visited:
                paths.append(new_path + [int(next_id[1:])])
            else:
                dfs(next_id, new_path, visited | {node_id})

    if "P2" in node_map or "P2" in edges_map:
        dfs("P2", [], set())

    return {"paths": paths}

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
