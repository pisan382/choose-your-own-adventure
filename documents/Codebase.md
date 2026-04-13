# Codebase Notes

## Purpose

This workspace extracts text from the scanned PDF of The Cave of Time, builds a story graph from the extracted pages, writes all possible bounded story paths, and renders the graph as SVG.

## Canonical Source Of Truth

The canonical extracted page set is:
- output/cot-pages-ocr-v2

Do not use the older cot-pages extraction workflow. It had bad OCR and was removed.

## Important PDF Mapping

The scan is a two-page spread layout.

Story start mapping:
- PDF page 8 contains story page 2 on the left and story page 3 on the right
- PDF page 9 contains story page 4 on the left and story page 5 on the right

The story begins on story page 2 with:
- "You've hiked through Snake Canyon once before ..."

Do not confuse story page numbers with PDF page numbers.

## Current Scripts

Canonical scripts in scripts/:
- reextract_cot_ocr_split.py
- build_story_graph.py
- write_all_stories.py
- render_story_graph_svg.py

Superseded scripts were deleted:
- extract_cot.py
- reextract_cot_spreads.py

## What Each Script Does

### reextract_cot_ocr_split.py

Re-extracts story pages from the PDF using OCR on left/right halves of each PDF spread page.

Typical command:

```bash
python3 scripts/reextract_cot_ocr_split.py \
  --pdf samples/the-cave-of-time.pdf \
  --pdf-start-page 8 \
  --pdf-end-page 66 \
  --story-start-page 2 \
  --output-dir output/cot-pages-ocr-v2
```

### build_story_graph.py

Builds Mermaid graph output from the corrected OCR page files.

Typical command:

```bash
python3 scripts/build_story_graph.py \
  --pages-dir output/cot-pages-ocr-v2 \
  --output output/cot-story-graph.mmd
```

Notes:
- Reads explicit "turn to page X" choices from page text.
- Adds sequential continuation edges for pages that continue onto the next numbered page before any explicit choice appears.

### write_all_stories.py

Writes all possible bounded stories from the graph.

Typical command:

```bash
python3 scripts/write_all_stories.py \
  --graph output/cot-story-graph.mmd \
  --pages-dir output/cot-pages-ocr-v2 \
  --start-page 2 \
  --max-decisions 20 \
  --output-dir output/cot-stories
```

Important behavior:
- Starts from story page 2
- Stops on cycles
- Stops if decision points exceed 20
- Clears old story-*.txt files in the target output directory before writing new ones

### render_story_graph_svg.py

Renders the Mermaid graph to SVG without external layout tools.

Typical command:

```bash
python3 scripts/render_story_graph_svg.py \
  --graph output/cot-story-graph.mmd \
  --output output/cot-story-graph.svg
```

Current visual behavior:
- Uses a layered Sugiyama-style layout with iterative barycenter ordering
- Colors terminal pages differently
- Highlights the main trunk from page 2

## Current Canonical Outputs

Keep these:
- output/cot-pages-ocr-v2
- output/cot-story-graph.mmd
- output/cot-story-graph.svg
- output/cot-stories

These older directories were deleted because they were exploratory or obsolete:
- output/cot-pages
- output/cot-pages-reextract
- output/cot-stories-from-page-02
- output/cot-stories-start10
- output/tmp

## Current Known State

At the end of this session:
- The corrected OCR v2 extraction produced story pages in output/cot-pages-ocr-v2
- The graph was rebuilt from OCR v2 pages and saved to output/cot-story-graph.mmd
- The bounded story writer generated 45 stories into output/cot-stories
- The graph SVG was rendered to output/cot-story-graph.svg

## Caveats

OCR is improved but not perfect.
- Some pages still have minor OCR noise
- Page continuations across spreads are important; graph construction relies on sequential edges when no explicit choice appears
- Story page numbers, not PDF page numbers, control graph edges and story traversal

## Next-Time Guidance

When resuming work:
1. Read this file first.
2. Treat output/cot-pages-ocr-v2 as the current source text.
3. If extraction quality needs improvement, update reextract_cot_ocr_split.py rather than rebuilding older workflows.
4. If graph or story outputs need regeneration, rerun build_story_graph.py, write_all_stories.py, and render_story_graph_svg.py in that order.

## Web Architecture Update (Apr 12, 2026)

The project now has a web product with two parts:
- Story Reader: play through The Cave of Time in browser.
- Authoring Tool: create/edit branching stories with a live graph.

### Architecture

- Frontend:
  - React apps (via CDN + Babel) under web/.
  - Landing page at web/index.html.
  - Reader app at web/reader/.
  - Authoring app at web/author/.
- Backend:
  - Node.js + Express server at backend/server.js.
  - Serves static files from web/.
  - Provides JSON APIs for pages/graph and author save.
  - Provides a PDF upload endpoint.
- Data flow:
  - Source inputs remain read-only in output/.
  - Web runtime uses derived files in web/data/.
  - Conversion script: scripts/build_web_data.js.

### Web Data Contract

- web/data/pages.json
  - Contains all page text keyed by page number.
  - Includes parsed choices where detectable.
- web/data/graph.json
  - Contains adjacency and incoming-edge maps.
  - Drives reader navigation and author graph rendering.
- web/data/validation-report.json
  - Reports graph/page mismatches.

### APIs (Backend)

- GET /api/pages
  - Returns pages.json.
- GET /api/graph
  - Returns graph.json.
- POST /api/author/save
  - Saves authored state to web/data/authored-story.json.
- POST /api/upload/pdf
  - Uploads PDF to web/uploads/ for author workflows.

### Reader Strategy

- Start from page 2 when available.
- Show current page text.
- Pull next options from graph adjacency.
- Render choices as buttons.
- Track in-session path history.
- Handle dead ends and missing pages gracefully.

### Authoring Strategy

- In-browser model of nodes (id/title/text/choices).
- Node CRUD and choice CRUD.
- Live graph rendering with click-to-edit node selection.
- Node state analysis:
  - unfinished: no outgoing edges and not marked ending.
  - terminal: ending node with no outgoing edges.
  - convergence: multiple incoming edges.
- Similar ending grouping via text overlap (Jaccard-like heuristic).
- JSON import/export for portability.
- PDF import using client-side PDF.js text extraction (start/extension modes).

### Implementation Approach Used

1. Build deterministic converter first so both apps share one data contract.
2. Implement Reader first as a quick functional vertical slice.
3. Implement Authoring with graph-first UX and node insight panel.
4. Add backend persistence/upload endpoints to satisfy Node backend requirement.
5. Keep output/ artifacts untouched and derive web/data outputs from them.
6. Add deployment automation for static web publishing.

### New/Updated Files (Web Stack)

- package.json
- package-lock.json
- .gitignore
- backend/server.js
- scripts/build_web_data.js
- web/index.html
- web/reader/index.html
- web/reader/reader.js
- web/reader/style.css
- web/author/index.html
- web/author/author.js
- web/author/style.css
- web/data/pages.json
- web/data/graph.json
- web/data/validation-report.json
- .github/workflows/deploy-pages.yml

### Verification Snapshot

- node scripts/build_web_data.js:
  - pages: 111
  - graph nodes: 111
  - graph edges: 108
  - validation: no missing references
- Backend smoke test:
  - /api/pages -> 200
  - /api/graph -> 200

## Web Architecture Update (Apr 13, 2026)

This update focused on finishing the current feature backlog while preserving the existing architecture split (read-only source artifacts in output/, derived runtime data in web/data/, browser-first authoring UX, optional Node backend APIs).

### What Changed

- Author graph viewport and scale behavior were upgraded:
  - Larger virtual graph canvas and larger visible graph panel.
  - Explicit controls: zoom in, zoom out, reset, fit-all.
  - Interaction controls: mouse-wheel zoom and drag-to-pan.
- Author issue-spotting was strengthened:
  - Overlapping ending detection is now surfaced directly in both node list badges and graph node styling.
  - Existing unfinished/terminal/convergence signals were preserved.
- Author save/upload flow was hardened for both hosted static and backend modes:
  - Save to server added via POST /api/author/save.
  - PDF import now attempts backend upload via POST /api/upload/pdf, but gracefully continues when backend endpoints are unavailable (static Pages context).
  - Local save and JSON import/export remain first-class and unchanged.
- Reader UX was refined without changing core graph traversal:
  - Added in-app "Back One Choice" behavior using tracked path state.
  - Added source badge indicating whether data is from local draft or web/data.
- Deployment/documentation was clarified:
  - README now includes the live Pages URL and centralized documents references.
  - Legacy static Pages workflow is manual-only to avoid competing push-triggered deployments with deploy-pages.yml.

### Files Updated In This Pass

- web/author/author.js
- web/author/style.css
- web/reader/reader.js
- web/reader/style.css
- .github/workflows/static.yml
- README.md
- documents/ToDo.md

### Approach Notes

1. Keep the existing data contract and derived-data pipeline intact (no schema changes to web/data/pages.json or web/data/graph.json).
2. Prioritize usability upgrades in the authoring graph with minimal disruption to current React-in-browser architecture.
3. Treat backend APIs as optional capability in production static hosting contexts; maintain graceful fallbacks.
4. Preserve current OCR/graph/story generation pipeline as canonical and avoid reintroducing deprecated extraction flows.
