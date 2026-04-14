import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture(scope="module")
def live_server_url(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("cyoa_frontend")
    orig_pages = Path("output/cot-pages-ocr-v2")
    orig_mmd = Path("output/cot-story-graph.mmd")

    pages_dir = tmp / "cot-pages-ocr-v2"
    shutil.copytree(orig_pages, pages_dir)
    mmd_path = tmp / "cot-story-graph.mmd"
    shutil.copy2(orig_mmd, mmd_path)
    meta_path = tmp / "pages-meta.json"

    port = 8765
    python = sys.executable
    env = {
        **dict(subprocess.os.environ),
        "CYOA_TEST_PAGES_DIR": str(pages_dir),
        "CYOA_TEST_MMD_PATH": str(mmd_path),
        "CYOA_TEST_META_PATH": str(meta_path),
    }
    proc = subprocess.Popen(
        [python, "-m", "uvicorn", "web.main:app", "--host", "127.0.0.1", "--port", str(port)],
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


def test_graph_loads_all_nodes(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/graph.html")
    page.wait_for_timeout(1500)
    nodes_count = page.evaluate("() => window.cy.nodes().length")
    assert nodes_count >= 100
    edges_count = page.evaluate("() => window.cy.edges().length")
    assert edges_count >= 100


def test_click_node_opens_side_panel(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/graph.html")
    page.wait_for_timeout(1500)
    page.evaluate("() => { window.cy.getElementById('P3').emit('tap'); }")
    page.wait_for_timeout(300)
    panel = page.locator("#side-panel")
    expect(panel).not_to_have_class("hidden")
    expect(page.locator("#panel-page")).to_have_text("3")


def test_save_text_does_not_auto_add_edge(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/graph.html")
    page.wait_for_timeout(1500)
    page.evaluate("() => { window.cy.getElementById('P3').emit('tap'); }")
    page.wait_for_timeout(300)

    before = page.evaluate("() => window.cy.edges().length")
    textarea = page.locator("#panel-text")
    textarea.fill("Page 3\n\nturn to page 200")
    page.locator("#btn-save-text").click()
    page.wait_for_timeout(500)

    after = page.evaluate("() => window.cy.edges().length")
    assert after == before
    # Suggestions should show the new match (200 is <= 300 so parser accepts it)
    expect(page.locator("#panel-suggestions")).to_contain_text("Page 200")

    # Restore text
    textarea.fill("Page 3\n\nturn to page 4\n\nturn to page 5")
    page.locator("#btn-save-text").click()
    page.wait_for_timeout(500)


def test_manual_add_edge_in_graph(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/graph.html")
    page.wait_for_timeout(1500)
    page.evaluate("() => { window.cy.getElementById('P3').emit('tap'); }")
    page.wait_for_timeout(300)

    page.locator("#new-edge-target").fill("9999")
    page.locator("#btn-add-edge").click()
    page.wait_for_timeout(500)

    has_edge = page.evaluate("() => window.cy.edges().some(e => e.data('source') === 'P3' && e.data('target') === 'P9999')")
    assert has_edge is True

    # cleanup via API from browser context
    page.evaluate("async () => { await fetch('/api/graph/edges', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({source:3,target:9999}) }); }")


def test_manual_terminal_toggle(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/graph.html")
    page.wait_for_timeout(1500)
    page.evaluate("() => { window.cy.getElementById('P3').emit('tap'); }")
    page.wait_for_timeout(300)

    page.locator("#chk-ending").check()
    page.locator("#btn-save-meta").click()
    page.wait_for_timeout(500)

    is_terminal = page.evaluate("() => window.cy.getElementById('P3').hasClass('terminal')")
    assert is_terminal is True

    # restore
    page.locator("#chk-ending").uncheck()
    page.locator("#btn-save-meta").click()
    page.wait_for_timeout(500)

    is_terminal2 = page.evaluate("() => window.cy.getElementById('P3').hasClass('terminal')")
    assert is_terminal2 is False


def test_rebuild_preview_modal(page: Page, live_server_url):
    _set_viewport(page)
    page.goto(f"{live_server_url}/graph.html")
    page.wait_for_timeout(1500)

    page.locator("#btn-rebuild").click()
    page.wait_for_timeout(500)

    modal = page.locator("#rebuild-modal")
    expect(modal).not_to_have_class("hidden")
    expect(page.locator("#rebuild-body")).to_contain_text("New edges:")

    # Cancel
    page.locator("#btn-rebuild-cancel").click()
    page.wait_for_timeout(200)
    expect(modal).to_have_class("modal hidden")
