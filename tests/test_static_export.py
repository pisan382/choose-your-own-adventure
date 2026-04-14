from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import web.main as mm


@pytest.fixture
def client(tmp_path):
    orig_output = mm.OUTPUT_DIR
    orig_stories = mm.STORIES_DIR
    orig_svg = mm.SVG_PATH
    mm.OUTPUT_DIR = tmp_path
    mm.STORIES_DIR = tmp_path / "cot-stories"
    mm.SVG_PATH = tmp_path / "cot-story-graph.svg"
    from web.main import app
    yield TestClient(app)
    mm.OUTPUT_DIR = orig_output
    mm.STORIES_DIR = orig_stories
    mm.SVG_PATH = orig_svg


def test_static_export_generates_dist(client):
    r = client.post("/api/export")
    assert r.status_code == 200
    data = r.json()
    assert data["exported"] is True
    dist = Path(data["dist"])
    assert dist.exists()
    index = dist / "index.html"
    assert index.exists()
    svg = Path(data["svg"])
    assert svg.exists()
    zip_file = Path(data["zip"])
    assert zip_file.exists()


def test_static_reader_html_has_verified_links_only(client):
    r = client.post("/api/export")
    assert r.status_code == 200
    dist = Path(r.json()["dist"])
    page3 = dist / "page-3.html"
    assert page3.exists()
    html = page3.read_text(encoding="utf-8")

    # Get MMD edges for page 3
    from web.mmd_loader import load_graph
    graph = load_graph(Path("output/cot-story-graph.mmd"))
    mmd_targets = set()
    for edge in graph["edges"]:
        if edge["source"] == "P3":
            mmd_targets.add(int(edge["target"][1:]))

    import re
    links = re.findall(r'href="page-(\d+)\.html"', html)
    link_targets = set(int(x) for x in links)
    # All link targets should be in MMD edges (or restart/home links)
    for t in link_targets:
        if t == 2:  # restart link
            continue
        assert t in mmd_targets, f"Page 3 HTML links to {t} which is not in MMD edges"
