import pytest
from pathlib import Path
from web.mmd_loader import load_graph, save_graph


def test_load_graph_parses_existing_mmd():
    mmd_path = Path("output/cot-story-graph.mmd")
    graph = load_graph(mmd_path)
    assert len(graph["nodes"]) >= 100
    assert len(graph["edges"]) >= 100
    for node in graph["nodes"]:
        assert "id" in node
        assert "label" in node
        assert "page" in node
    for edge in graph["edges"]:
        assert "source" in edge
        assert "target" in edge


def test_save_graph_roundtrip(tmp_path):
    mmd_path = tmp_path / "test.mmd"
    original = {
        "nodes": [
            {"id": "P2", "label": "2", "page": 2},
            {"id": "P3", "label": "3", "page": 3},
        ],
        "edges": [
            {"source": "P2", "target": "P3"},
        ],
    }
    save_graph(mmd_path, original)
    reloaded = load_graph(mmd_path)
    assert reloaded["nodes"] == original["nodes"]
    assert reloaded["edges"] == original["edges"]


def test_load_graph_missing_file(tmp_path):
    mmd_path = tmp_path / "nonexistent.mmd"
    # load_graph will raise FileNotFoundError; main.py handles this
    with pytest.raises(FileNotFoundError):
        load_graph(mmd_path)
