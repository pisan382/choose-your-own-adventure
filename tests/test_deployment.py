import subprocess
import sys
import time
from pathlib import Path

import pytest
import requests


def test_dev_server_starts_and_serves_static(tmp_path):
    port = 8767
    import web.main as mm
    orig_output = mm.OUTPUT_DIR
    orig_stories = mm.STORIES_DIR
    orig_svg = mm.SVG_PATH
    mm.OUTPUT_DIR = tmp_path
    mm.STORIES_DIR = tmp_path / "cot-stories"
    mm.SVG_PATH = tmp_path / "cot-story-graph.svg"

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "web.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd="/home/cssuwbstudent/vincent/CYOA/choose-your-own-adventure",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        time.sleep(3)
        r = requests.get(f"http://127.0.0.1:{port}/reader.html")
        assert r.status_code == 200
        assert "CYOA Reader" in r.text
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        mm.OUTPUT_DIR = orig_output
        mm.STORIES_DIR = orig_stories
        mm.SVG_PATH = orig_svg


def test_static_dist_no_server_needed(tmp_path):
    import web.main as mm
    orig_output = mm.OUTPUT_DIR
    orig_stories = mm.STORIES_DIR
    orig_svg = mm.SVG_PATH
    mm.OUTPUT_DIR = tmp_path
    mm.STORIES_DIR = tmp_path / "cot-stories"
    mm.SVG_PATH = tmp_path / "cot-story-graph.svg"

    # Use TestClient to trigger export (doesn't need running server)
    from fastapi.testclient import TestClient
    from web.main import app
    client = TestClient(app)
    r = client.post("/api/export")
    assert r.status_code == 200
    dist = Path(r.json()["dist"])

    port = 8768
    http_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        cwd=str(dist),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        time.sleep(1)
        # Open a generated page
        r2 = requests.get(f"http://127.0.0.1:{port}/page-3.html")
        assert r2.status_code == 200
        # Verify it contains expected content without needing API calls
        assert "The Cave of Time" in r2.text
        # Make sure there are no absolute /api/ links in the static HTML
        assert "/api/" not in r2.text
    finally:
        http_proc.terminate()
        try:
            http_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            http_proc.kill()
        mm.OUTPUT_DIR = orig_output
        mm.STORIES_DIR = orig_stories
        mm.SVG_PATH = orig_svg
