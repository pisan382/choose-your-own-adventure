import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest
import requests
from playwright.sync_api import Page, expect


@pytest.fixture(scope="module")
def live_server_url(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("cyoa_int")
    orig_pages = Path("output/cot-pages-ocr-v2")
    orig_mmd = Path("output/cot-story-graph.mmd")
    pages_dir = tmp / "cot-pages-ocr-v2"
    shutil.copytree(orig_pages, pages_dir)
    mmd_path = tmp / "cot-story-graph.mmd"
    shutil.copy2(orig_mmd, mmd_path)
    meta_path = tmp / "pages-meta.json"

    port = 8766
    env = {
        **dict(__import__("os").environ),
        "CYOA_TEST_PAGES_DIR": str(pages_dir),
        "CYOA_TEST_MMD_PATH": str(mmd_path),
        "CYOA_TEST_META_PATH": str(meta_path),
        "CYOA_TEST_OUTPUT_DIR": str(tmp),
    }
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "web.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd="/home/cssuwbstudent/vincent/CYOA/choose-your-own-adventure",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
    )
    time.sleep(3)
    url = f"http://127.0.0.1:{port}"
    yield url
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


def _set_viewport(page: Page):
    page.set_viewport_size({"width": 1280, "height": 800})


def test_graph_to_reader_navigation(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/graph.html")
    page.wait_for_timeout(1500)

    with page.expect_popup() as popup_info:
        page.evaluate("() => { window.cy.getElementById('P3').emit('dbltap'); }")
    popup = popup_info.value
    popup.wait_for_load_state()
    assert "reader.html" in popup.url
    assert "#3" in popup.url


def test_export_runs_canonical_scripts(live_server_url):
    r = requests.post(f"{live_server_url}/api/export")
    assert r.status_code == 200
    data = r.json()
    assert Path(data["svg"]).exists()
    assert Path(data["stories"]).exists()
    stories = list(Path(data["stories"]).glob("story-*.txt"))
    assert len(stories) > 0
    assert Path(data["zip"]).exists()


def test_path_explorer_lists_stories(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/paths.html")
    page.wait_for_timeout(500)
    expect(page.locator("#stats")).to_contain_text("Total paths:")
    rows = page.locator(".path-row")
    assert rows.count() >= 1

    with page.expect_popup() as popup_info:
        rows.first.click()
    popup = popup_info.value
    popup.wait_for_load_state()
    assert "reader.html" in popup.url


def test_round_trip_mmd_preserve_after_edits(live_server_url):
    # Add and remove edge
    r1 = requests.post(f"{live_server_url}/api/graph/edges", json={"source": 999, "target": 998})
    assert r1.status_code == 200

    r2 = requests.delete(f"{live_server_url}/api/graph/edges", json={"source": 999, "target": 998})
    assert r2.status_code == 200

    # Rebuild confirm
    r3 = requests.post(f"{live_server_url}/api/graph/rebuild", json={"confirm": True})
    assert r3.status_code == 200

    # Fetch final graph and validate structure
    r4 = requests.get(f"{live_server_url}/api/graph")
    graph = r4.json()
    ids = [n["id"] for n in graph["nodes"]]
    assert len(ids) == len(set(ids))
    node_set = set(ids)
    for e in graph["edges"]:
        assert e["source"] in node_set
        assert e["target"] in node_set
