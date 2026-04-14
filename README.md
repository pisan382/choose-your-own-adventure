# Choose Your Own Adventure — Web Interface

A web-based authoring tool and reader for branching CYOA stories. Built for *The Cave of Time* and extensible to any similarly structured story.

## What You Get

- **Reader Mode** — Read the story page by page with clickable choices.
- **Graph Authoring Tool** — Visualize and edit the story graph using Cytoscape.js.
- **Path Explorer** — Browse every possible story path from start to finish.
- **Static Export** — Generate a zip of plain HTML pages that require no server.
- **MMD-First Architecture** — `cot-story-graph.mmd` is the canonical source of truth for all links.

## Project Structure

```
.
├── output/
│   ├── cot-pages-ocr-v2/      # Canonical story text pages
│   ├── cot-story-graph.mmd    # Canonical Mermaid graph (source of truth)
│   ├── cot-story-graph.svg    # Rendered SVG of the graph
│   ├── cot-stories/           # All complete story paths
│   └── pages-meta.json        # Layout positions & manual overrides
├── scripts/                   # Python extraction & generation scripts
├── web/                       # FastAPI backend + static frontend
│   ├── main.py                # FastAPI app
│   ├── mmd_loader.py          # MMD parser / writer
│   ├── story_parser.py        # Text parsing suggestion engine
│   └── static/                # HTML/CSS/JS frontend
│       ├── reader.html        # Story reader SPA
│       ├── graph.html         # Interactive graph editor
│       └── paths.html         # Path explorer
├── tests/                     # Full pytest + Playwright test suite
├── README.md                  # This file
├── Caddyfile.sample           # Sample reverse-proxy config
├── Brainstorm.md              # Design ideas & open questions
└── ToDo.md                    # Implementation plan & test checklist
```

## Quick Start (Development)

### 1. Install Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn python-multipart
pip install pytest httpx playwright pytest-playwright
python3 -m playwright install chromium
```

### 2. Run the Development Server

```bash
uvicorn web.main:app --host 127.0.0.1 --port 8000 --reload
```

Then open:
- **Reader:** `http://localhost:8000/reader.html`
- **Graph Editor:** `http://localhost:8000/graph.html`
- **Path Explorer:** `http://localhost:8000/paths.html`

## How It Works

### MMD Is Canonical

The file `output/cot-story-graph.mmd` is the **only** source of truth for which pages link to which. When you edit text, the parser shows suggestions, but **you must explicitly approve** new edges before the MMD is updated.

### Reading a Story

1. Open `reader.html#2` to start at page 2.
2. Click choice links to navigate.
3. Use `1`, `2`, `3` keyboard shortcuts to pick the first, second, or third choice.
4. Terminal pages show a styled "The End" overlay.

### Editing the Graph

1. Open `graph.html`.
2. Click a node to see its text, MMD edges, and parser suggestions.
3. Click **Add Edge** (or shift-click another node) to connect pages.
4. Click **Remove** on an existing edge to delete it.
5. Drag nodes and click **Save Positions** to persist the layout.
6. Click **Rebuild from Text** to preview replacing the graph with parser output.

### Importing New Pages

Drag `.txt` files directly onto the graph canvas. The system uploads them and shows a diff report. You can add edges one by one or confirm a full rebuild.

### Exporting

Click **Export** in the graph toolbar (or `POST /api/export`). This:
- Regenerates `cot-story-graph.svg`
- Regenerates all story paths in `cot-stories/`
- Pre-renders a static site in `output/dist/`
- Creates `output/cyoa-export.zip`

## Running Tests

All tests run in isolated temp directories and do not mutate your real `output/` folder.

```bash
python3 -m pytest tests/ -v
```

**Current status:** 37 tests passing (backend unit, frontend Playwright, integration, deployment).

## Deployment

### Option A: Full Stack (Authoring + Reader)

Run uvicorn behind a reverse proxy (Caddy or nginx).

Example with the provided sample config:

```bash
# Terminal 1: start the app
uvicorn web.main:app --host 127.0.0.1 --port 8000

# Terminal 2: start Caddy
caddy run --config Caddyfile.sample
```

See `Caddyfile.sample` for a working reverse-proxy setup.

### Option B: Static Hosting (Reader Only)

After running export:

```bash
cd output/dist
python3 -m http.server 8080
```

Then open `http://localhost:8080`. No Python backend is required.

## Regenerating Canonical Assets

If you modify the raw page text files, you can regenerate the downstream artifacts:

```bash
# Rebuild MMD from text (optional; MMD is normally edited via the graph UI)
python3 scripts/build_story_graph.py \
  --pages-dir output/cot-pages-ocr-v2 \
  --output output/cot-story-graph.mmd

# Render SVG
python3 scripts/render_story_graph_svg.py \
  --graph output/cot-story-graph.mmd \
  --output output/cot-story-graph.svg

# Write all bounded stories
python3 scripts/write_all_stories.py \
  --graph output/cot-story-graph.mmd \
  --pages-dir output/cot-pages-ocr-v2 \
  --start-page 2 \
  --max-decisions 20 \
  --output-dir output/cot-stories
```

## Notes

- Page numbers are derived from filenames (`02-CoT.txt` → page `2`).
- The parser handles OCR artifacts such as `tum` → `turn` and normalizes corrupted digits (`O` → `0`, `l` → `1`, etc.).
- Terminal detection recognizes `The End`, `End Story`, `Story Ends`, and `THE END`.
