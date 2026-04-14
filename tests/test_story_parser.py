from pathlib import Path
from web.story_parser import (
    extract_links,
    is_terminal,
    normalize_page_token,
    parse_pages,
    suggest_graph_delta,
)


def test_extract_links_variations():
    texts = {
        "tum to page 4": [4],
        "turn to page 22": [22],
        "go to page 5": [5],
        "return to page 12": [12],
        "follow her to page 8": [8],
    }
    for text, expected in texts.items():
        assert extract_links(text) == expected, f"Failed for: {text}"


def test_extract_links_ocr_errors():
    assert normalize_page_token("O1") == 1
    assert normalize_page_token("l2") == 12
    assert normalize_page_token("S3") == 53
    assert extract_links("turn to page O1") == [1]
    assert extract_links("turn to page l2") == [12]
    assert extract_links("turn to page S3") == [53]


def test_is_terminal_variations():
    assert is_terminal("The End") is True
    assert is_terminal("END STORY") is True
    assert is_terminal("Story Ends") is True
    assert is_terminal("THE END") is True
    assert is_terminal("The end of the car.") is False
    assert is_terminal("Page 20\n\nThe end of the world.") is False


def test_suggest_graph_delta(tmp_path):
    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    (pages_dir / "02-CoT.txt").write_text("Page 2\n\nturn to page 4", encoding="utf-8")
    (pages_dir / "03-CoT.txt").write_text("Page 3\n\nThe End", encoding="utf-8")
    (pages_dir / "04-CoT.txt").write_text("Page 4\n\nThe End", encoding="utf-8")

    current_graph = {
        "nodes": [{"id": "P2", "label": "2", "page": 2}, {"id": "P3", "label": "3", "page": 3}],
        "edges": [{"source": "P2", "target": "P3"}],
    }
    delta = suggest_graph_delta(pages_dir, current_graph)
    assert {"source": 2, "target": 4} in delta["suggested_new_edges"]
    assert {"source": 2, "target": 3} in delta["orphan_edges"]
    assert 3 in delta["terminals"]


def test_parse_pages():
    pages = parse_pages(Path("output/cot-pages-ocr-v2"))
    assert len(pages) == 111
    assert 2 in pages
    assert 3 in pages
