import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from web import main as main_module

# Create a temp environment per module
@pytest.fixture(scope="module")
def client(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("cyoa_test")
    orig_pages = Path("output/cot-pages-ocr-v2")
    orig_mmd = Path("output/cot-story-graph.mmd")
    orig_meta = Path("output/pages-meta.json")

    # Copy real data into temp
    pages_dir = tmp / "cot-pages-ocr-v2"
    shutil.copytree(orig_pages, pages_dir)
    mmd_path = tmp / "cot-story-graph.mmd"
    shutil.copy2(orig_mmd, mmd_path)
    meta_path = tmp / "pages-meta.json"
    if orig_meta.exists():
        shutil.copy2(orig_meta, meta_path)

    # Patch module paths
    orig_cot = main_module.COT_PAGES_DIR
    orig_mmd = main_module.MMD_PATH
    orig_meta_path = main_module.META_PATH
    orig_output = main_module.OUTPUT_DIR
    orig_stories = main_module.STORIES_DIR
    orig_svg = main_module.SVG_PATH
    main_module.COT_PAGES_DIR = pages_dir
    main_module.MMD_PATH = mmd_path
    main_module.META_PATH = meta_path
    main_module.OUTPUT_DIR = tmp
    main_module.STORIES_DIR = tmp / "cot-stories"
    main_module.SVG_PATH = tmp / "cot-story-graph.svg"

    # Reload meta from temp
    main_module.META_PATH.unlink(missing_ok=True)

    from web.main import app
    tc = TestClient(app)
    yield tc

    # Restore paths
    main_module.COT_PAGES_DIR = orig_cot
    main_module.MMD_PATH = orig_mmd
    main_module.META_PATH = orig_meta_path
    main_module.OUTPUT_DIR = orig_output
    main_module.STORIES_DIR = orig_stories
    main_module.SVG_PATH = orig_svg


def test_get_graph_returns_mmd_data(client):
    r = client.get("/api/graph")
    assert r.status_code == 200
    data = r.json()
    assert len(data["nodes"]) >= 100
    assert len(data["edges"]) >= 100
    p2 = next((n for n in data["nodes"] if n["id"] == "P2"), None)
    assert p2 is not None
    assert p2["hasText"] is True


def test_get_pages_returns_all_pages(client):
    r = client.get("/api/pages")
    assert r.status_code == 200
    data = r.json()
    pages_dir = main_module.COT_PAGES_DIR
    assert len(data) == len(list(pages_dir.glob("*-CoT.txt")))


def test_get_page_text_and_suggestions(client):
    r = client.get("/api/pages/3")
    assert r.status_code == 200
    data = r.json()
    assert data["page"] == 3
    assert "Page 3" in data["text"]

    r2 = client.get("/api/pages/3/suggestions")
    assert r2.status_code == 200
    s = r2.json()
    assert s["suggested_edges"] == [4, 5]
    assert s["is_terminal"] is False


def test_save_page_does_not_mutate_mmd(client):
    mmd_before = main_module.MMD_PATH.read_text(encoding="utf-8")
    r = client.post("/api/pages/999", data={"text": "Page 999\n\nturn to page 998"})
    assert r.status_code == 200
    mmd_after = main_module.MMD_PATH.read_text(encoding="utf-8")
    assert mmd_before == mmd_after
    # cleanup
    (main_module.COT_PAGES_DIR / "999-CoT.txt").unlink(missing_ok=True)


def test_add_and_remove_edge_mutates_mmd(client):
    r = client.post("/api/graph/edges", json={"source": 999, "target": 998})
    assert r.status_code == 200

    r2 = client.get("/api/graph")
    data = r2.json()
    assert any(e["source"] == "P999" and e["target"] == "P998" for e in data["edges"])

    r3 = client.request("delete", "/api/graph/edges", json={"source": 999, "target": 998})
    assert r3.status_code == 200

    r4 = client.get("/api/graph")
    data2 = r4.json()
    assert not any(e["source"] == "P999" and e["target"] == "P998" for e in data2["edges"])


def test_rebuild_preview_vs_confirm(client):
    r = client.post("/api/graph/rebuild", json={"confirm": False})
    assert r.status_code == 200
    data = r.json()
    assert data["confirmed"] is False
    assert "delta" in data

    mmd_before = main_module.MMD_PATH.read_text(encoding="utf-8")
    r2 = client.post("/api/graph/rebuild", json={"confirm": True})
    assert r2.status_code == 200
    mmd_after = main_module.MMD_PATH.read_text(encoding="utf-8")
    assert mmd_before != mmd_after
    # Ensure it still parses
    r3 = client.get("/api/graph")
    assert r3.status_code == 200


def test_import_returns_diff_without_mmd_mutation(client):
    mmd_before = main_module.MMD_PATH.read_text(encoding="utf-8")
    files = {
        "files": ("999-CoT.txt", b"Page 999\n\nturn to page 2", "text/plain")
    }
    r = client.post("/api/import", files=files)
    assert r.status_code == 200
    data = r.json()
    assert "saved" in data
    assert "delta" in data
    mmd_after = main_module.MMD_PATH.read_text(encoding="utf-8")
    assert mmd_before == mmd_after
    # cleanup
    (main_module.COT_PAGES_DIR / "999-CoT.txt").unlink(missing_ok=True)


def test_meta_crud(client):
    r = client.post(
        "/api/pages/3/meta",
        json={"isEnding": True, "x": 50.0, "y": 100.0, "tags": ["foo"]},
    )
    assert r.status_code == 200

    r2 = client.get("/api/graph")
    data = r2.json()
    n3 = next((n for n in data["nodes"] if n["page"] == 3), None)
    assert n3["isEnding"] is True
    assert n3["x"] == 50.0
    assert "foo" in n3["tags"]

    client.post("/api/pages/3/meta", json={"isEnding": False})


def test_add_node_endpoint(client):
    r = client.post("/api/graph/nodes", json={"page": 8888})
    assert r.status_code == 200
    data = r.json()
    assert data["added"]["id"] == "P8888"

    r2 = client.get("/api/graph")
    graph = r2.json()
    assert any(n["id"] == "P8888" for n in graph["nodes"])

    # cleanup: we can't delete nodes via API yet, but that's okay for tests


def test_save_layout_endpoint(client):
    r = client.post(
        "/api/graph/layout",
        json={"positions": {"3": {"x": 12.5, "y": 34.7}}},
    )
    assert r.status_code == 200
    assert r.json()["saved"] == 1

    r2 = client.get("/api/graph")
    n3 = next((n for n in r2.json()["nodes"] if n["page"] == 3), None)
    assert n3["x"] == 12.5
    assert n3["y"] == 34.7


def test_suggestions_include_matches(client):
    r = client.get("/api/pages/3/suggestions")
    assert r.status_code == 200
    data = r.json()
    assert "matches" in data
    assert len(data["matches"]) >= 2
    for m in data["matches"]:
        assert "page" in m
        assert "match" in m
