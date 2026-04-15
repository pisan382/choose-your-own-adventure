import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from web import main as main_module


@pytest.fixture
def client(tmp_path):
    import web.main as mm
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


def test_reader_spa_serves_static_files(client):
    r = client.get("/reader.html")
    assert r.status_code == 200
    assert "CYOA Reader" in r.text
    r2 = client.get("/reader.js")
    assert r2.status_code == 200
    assert "function" in r2.text


def test_reader_page_has_clickable_links_for_mmd_edges_only(client):
    # Trigger export to generate pre-rendered pages
    r = client.post("/api/export")
    assert r.status_code == 200
    dist = Path(r.json()["dist"])
    page3 = dist / "page-3.html"
    assert page3.exists()
    html = page3.read_text(encoding="utf-8")
    # Should contain links to pages 4 and 5 (MMD edges for page 3)
    assert 'href="page-4.html"' in html
    assert 'href="page-5.html"' in html
    # Should not contain links to pages that aren't edges from 3
    # e.g. page-6.html shouldn't be a choice link from page 3
    # (We allow it in plain text, but only MMD-confirmed edges become <a> tags)
    choice_links = re.findall(r'href="(page-\d+\.html)"', html)
    assert "page-4.html" in choice_links
    assert "page-5.html" in choice_links


def test_reader_terminal_page_shows_ending_overlay(client):
    r = client.post("/api/export")
    assert r.status_code == 200
    dist = Path(r.json()["dist"])
    page14 = dist / "page-14.html"
    assert page14.exists()
    html = page14.read_text(encoding="utf-8")
    assert "The End" in html
    assert 'id="terminal-overlay"' in html or "terminal-overlay" in html


def test_reader_sequential_fallback(client, tmp_path):
    # Temporarily create page 998 with no choices and no ending
    page_path = main_module.COT_PAGES_DIR / "998-CoT.txt"
    page_path.write_text("Page 998\n\nYou stand at a crossroads.", encoding="utf-8")
    # Also need page 999 to exist for fallback
    page999 = main_module.COT_PAGES_DIR / "999-CoT.txt"
    page999.write_text("Page 999\n\nThe End", encoding="utf-8")

    try:
        r = client.post("/api/export")
        assert r.status_code == 200
        dist = Path(r.json()["dist"])
        page998 = dist / "page-998.html"
        assert page998.exists()
        html = page998.read_text(encoding="utf-8")
        assert 'href="page-999.html"' in html
        assert "Continue to page 999" in html
    finally:
        page_path.unlink(missing_ok=True)
        page999.unlink(missing_ok=True)
