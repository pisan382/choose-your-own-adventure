---

## Implementation Plan: HTML-Based CYOA Web Interface

This plan focuses on delivering an **HTML-based website** with a strong emphasis on **Idea 2 (Interactive Graph View)**, fully accounting for the phrasing and ending variations described in Idea 1b. The stack is intentionally lightweight: a Python backend serving a vanilla-JS (or petite-vue/Alpine.js) frontend, keeping deployment simple and the graph fast.

**Critical architectural decision:** `cot-story-graph.mmd` is the **canonical source of truth for edges**. The text parser (`story_parser.py`) is used only as a **suggestion engine** — to hint at links when new pages are imported or edited, and to validate against the graph. The MMD file is never overwritten automatically by parsing; it is updated only through explicit author actions in the graph UI or via a manual "Rebuild from Text" command.

### Tech Stack Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Backend** | Python **FastAPI** (or Flask) | Reuses existing `build_story_graph.py` logic directly; easy JSON API; single-file or small-module deployment. |
| **Frontend** | Vanilla ES6+ JavaScript modules, optional **Petite Vue** or **Alpine.js** for reactivity | No build step required; works as a pure HTML site; easy to statically export later. |
| **Graph Engine** | **Cytoscape.js** | Handles 100+ nodes smoothly, excellent built-in layouts (Dagre for hierarchical graphs), pure JS, no React dependency. |
| **Styling** | Plain CSS + a tiny normalize sheet | Keeps the project framework-agnostic and easy to theme. |
| **Data Storage** | Filesystem (`cot-story-graph.mmd` + `cot-pages-ocr-v2/`) + a small JSON metadata file (`pages-meta.json`) | **MMD is canonical for links.** Text files are canonical for page content. JSON stores layout positions and manual overrides (e.g. `isEnding`, `x/y`, `tags`). |

---

### Phase 1: Backend API — MMD-Centric Architecture

**Goal:** Build an API where the graph edges come from `cot-story-graph.mmd`, and parsing is strictly advisory.

1. **Create `mmd_loader.py` — MMD parser & writer:**
   - **`load_graph(mmd_path)`:** Parse `graph TD` Mermaid syntax into a clean JSON structure (`nodes`, `edges`). This becomes the *only* source of truth for edges served by `/api/graph`.
   - **`save_graph(mmd_path, graph_json)`:** Write the in-memory graph back to `cot-story-graph.mmd` in canonical Mermaid format. This is called only when the author explicitly modifies the graph (add/delete edge, rebuild, etc.).

2. **Refactor `build_story_graph.py` into `story_parser.py` (suggestion engine only):**
   - Extract `parse_pages()`, `extract_links()`, and terminal detection.
   - Expand terminal detection to: `The End`, `THE END`, `End Story`, `Story Ends`, `End.` (trailing), plus manual `isEnding` flag.
   - Keep the OCR-resilient regex but expose it as a utility: `suggest_edges(page_text) → List[int]`.
   - **`suggest_graph_delta(pages_dir, current_graph)`:** Run the parser over all text files and return a diff report:
     - *Suggested new edges* (found in text but missing in MMD).
     - *Orphan edges* (in MMD but not found in text — possibly intentional).
     - *New terminals* detected.
     - *Broken links* (edges pointing to non-existent pages).

3. **Create FastAPI app (`main.py`) with endpoints:**
   - `GET /api/graph` → returns graph JSON **parsed directly from `cot-story-graph.mmd`**. Nodes are unioned with pages found in `cot-pages-ocr-v2/` (so pages with text but no edges yet still appear, dashed).
   - `GET /api/pages` → list pages from `cot-pages-ocr-v2/`, enriched with metadata (`isEnding`, tags). **Outgoing links come from the MMD graph, not from parsing.**
   - `GET /api/pages/{page_num}` → raw text.
   - `GET /api/pages/{page_num}/suggestions` → runs `story_parser.py` on *just this page* and returns the parser-suggested edges and terminal flag. Used by the side panel to show "Parser found these links."
   - `POST /api/pages/{page_num}` → saves text to disk **only**. Does **not** touch the MMD. Returns the saved text and the current parser suggestions.
   - `POST /api/pages/{page_num}/meta` → updates `pages-meta.json` overrides (`isEnding`, `x`, `y`, `tags`).
   - `POST /api/graph/edges` → body `{source, target}` or `{source, target, action}`; adds edge to MMD and saves it. This is how new links are committed.
   - `DELETE /api/graph/edges` → removes edge from MMD and saves it.
   - `POST /api/graph/rebuild` → runs `story_parser.py` over **all** pages, computes a suggested graph, and presents a preview diff. The author must confirm (via a follow-up `POST /api/graph/rebuild/confirm`) before the MMD is actually overwritten.
   - `POST /api/import` → uploads new `.txt` files, writes them to `cot-pages-ocr-v2/`, then runs `suggest_graph_delta()` to produce a diff report against the current MMD. The MMD is **not** changed until the author clicks individual "Add to Graph" actions or runs **Rebuild**.
   - `POST /api/export` → runs `write_all_stories.py` and `render_story_graph_svg.py` (using the canonical MMD), then generates a static `dist/` reader site and zips everything.

4. **Metadata JSON (`output/pages-meta.json`):**
   - Stores node positions (`x`, `y`) so Cytoscape layouts survive reloads.
   - Stores manual `isEnding` and `tags`.
   - Does **not** store edges — edges live in the MMD file.

---

### Phase 2: Reader Mode (Static-Friendly SPA)

**Goal:** Read the story using the **MMD graph** to determine which choices are clickable.

1. **HTML shell (`/static/reader.html`):**
   - Simple book-like layout with header, page text area, and footer breadcrumb.

2. **JavaScript renderer (`reader.js`):**
   - Fetch page text and the page's **outgoing edges from `/api/graph`** (or from a cached JSON blob in static mode).
   - Render the text. To linkify choices, do **not** rely solely on regex. Instead:
     1. Use regex to find candidate choice lines.
     2. For each candidate, check if the referenced page number appears in the MMD edge list for this page.
     3. Only turn it into a `<a href="/read/X">` if the MMD confirms the edge exists.
   - If no MMD edges exist and the page is not marked as an ending, show the sequential fallback link: *"Continue to page {n+1}"*.
   - Terminal pages (marked red in metadata or detected by parser) get a styled "The End" overlay.

3. **Static export:**
   - Pre-render every page using the canonical MMD edge list, producing plain HTML with verified links only.

---

### Phase 3: Interactive Graph Authoring Tool (The Core Feature)

**Goal:** A full-page graph editor where authors manipulate the **canonical MMD graph** directly. Parsing is used for hints, not for automatic graph mutation.

1. **HTML shell (`/static/graph.html`):**
   - Full-screen Cytoscape canvas.
   - Floating toolbar: layout controls, "Add Node", "Rebuild from Text", "Upload Pages", "Export".
   - Right-side collapsible panel for text editing and metadata.

2. **Graph initialization (`graph.js`):**
   - Fetch `/api/graph` (which reads the MMD) and populate Cytoscape.
   - Visual styles:
     - **Blue fill** = start page / main trunk.
     - **Red fill** = terminal (`isEnding == true`).
     - **Gray fill** = normal story page.
     - **Dashed border** = page has a text file but **no edges** in the MMD yet (orphan page).
     - **Dashed node** = placeholder (edge exists in MMD but no text file yet).
   - Layout positions loaded from `pages-meta.json`; fallback to Dagre layout.

3. **Node selection & side-panel editing:**
   - Click a node to open the side panel.
   - Panel contents:
     - `<textarea>` with the page text (editable if file exists).
     - **MMD Outgoing Edges** list (from the MMD graph) with "Remove" buttons and target-page jump links.
     - **Parser Suggestions** section: calls `GET /api/pages/{page_num}/suggestions` and shows detected links. For each suggested link not yet in the MMD, show an **"Add Edge"** button that POSTs to `/api/graph/edges`.
     - **"Mark as Ending"** checkbox.
   - Saving the text (`POST /api/pages/{page_num}`) only writes the `.txt` file. The graph does **not** auto-update. Instead, the suggestions section refreshes, and the author manually approves any new edges.

4. **Graph manipulation features:**
   - **Add Edge:** Shift-click target after selecting source, or use the side-panel "Add Edge" input. POSTs to `/api/graph/edges` and re-renders the edge from the MMD.
   - **Delete Edge:** Click an edge and press Delete, or use the side-panel remove button. Calls `DELETE /api/graph/edges`.
   - **Add Node:** Toolbar button creates a new page number node in the MMD (no edges yet).
   - **Re-layout & Save Positions:** Buttons to run Dagre and persist `(x, y)` back to `/api/pages/{page_num}/meta`.

5. **Upload & suggestion workflow:**
   - Drag-and-drop `.txt` files → `POST /api/import`.
   - The response shows a **suggestion diff** (not an auto-sync):
     - *Parser suggests 3 new edges*
     - *2 pages have no edges yet*
     - *1 broken link detected (MMD references page 99, but file missing)*
   - The author can:
     1. Click **"Apply Suggestion"** on individual edges to add them to the MMD one by one.
     2. Click **"Rebuild Graph from Text"** to see a full preview of replacing the entire MMD with parser output, then confirm.

6. **Handling text variations explicitly:**
   - The side panel shows the raw regex matches (e.g. *"Matched: `tum to page 4`, `turn to page 22`"*).
   - If a match is wrong, the author simply ignores it — the MMD is not affected.
   - If the parser misses a phrase, the author can manually add the edge in the graph, or tweak the regex in a settings modal and re-run suggestions.

---

### Phase 4: Polish, Export, and Integration

**Goal:** Tie reader and graph together, ensuring the MMD remains the canonical backbone.

1. **Navigation between modes:**
   - Double-click a graph node → open Reader Mode for that page.
   - Reader Mode "Edit in Graph" button → select that node in the graph view.

2. **Export pipeline:**
   - `/api/export`:
     - Runs `render_story_graph_svg.py` and `write_all_stories.py` from the canonical MMD.
     - Generates the static `dist/` reader site using MMD-verified links.
     - Zips `dist/` + `cot-pages-ocr-v2/` + `cot-story-graph.mmd` + `cot-story-graph.svg`.

3. **Path Explorer:**
   - Reads `output/cot-stories/` (generated from the MMD) and lists complete paths as clickable sequences.

4. **Quality checks:**
   - Unit tests for `mmd_loader.py` (round-trip parse/write preserves edges).
   - Unit tests for `story_parser.py` with edge-case phrasings (`tum`, `turn`, `go to page`, `End Story`).
   - Integration test: modify a page text, verify `/api/graph` is unchanged, then add an edge via `/api/graph/edges`, verify `/api/graph` now includes it.

---

### Phase 5: Deployment Options

**Development:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn
uvicorn main:app --reload
```
Open `http://localhost:8000/static/index.html`.

**Static hosting (Reader Mode only):**
- Run the export script, then serve the `dist/` folder with any static host (GitHub Pages, Netlify, etc.).

**Full authoring tool hosting:**
- Deploy the FastAPI app behind a lightweight reverse proxy (e.g. `nginx` or `caddy`).
- No database required; ensure `output/`, `cot-pages-ocr-v2/`, and `cot-story-graph.mmd` are writable.

---

### Summary of Deliverables by Phase

| Phase | Deliverable |
|-------|-------------|
| 1 | `mmd_loader.py`, `story_parser.py`, `main.py` (FastAPI), `/api/graph` reading MMD, suggestion endpoints |
| 2 | `reader.html`, `reader.js`, static pre-rendering using MMD edges |
| 3 | `graph.html`, `graph.js`, Cytoscape integration with MMD-centric editing, suggestion side panel |
| 4 | Export endpoint, Path Explorer, navigation between modes, tests |
| 5 | README with run instructions, sample deployment configs |

This plan keeps the implementation **simple, HTML-centric, and tightly integrated** with the existing Python extraction pipeline, while making `cot-story-graph.mmd` the immutable backbone of the interactive graph experience.
<<<<<<< HEAD
=======

---

## Tests to Add and Pass (By Phase)

This section documents the required tests for each phase. They should be added as the phase is implemented (or retroactively for already-implemented phases) and must all pass before moving to the next phase.

---

### Phase 1: Backend API — Tests

*Phase 1 is already implemented; these tests should be added now to lock in behavior.*

#### `tests/test_mmd_loader.py`

1. **`test_load_graph_parses_existing_mmd()`**
   - Load `output/cot-story-graph.mmd`.
   - Assert that the returned dict contains at least 100 nodes and 100 edges.
   - Assert every node has keys: `id`, `label`, `page`.
   - Assert every edge has keys: `source`, `target`.

2. **`test_save_graph_roundtrip()`**
   - Create a temp MMD file with a known graph (e.g. nodes `P2`, `P3`; edge `P2 --> P3`).
   - Save it with `save_graph()`, reload it with `load_graph()`.
   - Assert the reloaded graph matches the original exactly.

3. **`test_load_graph_missing_file()`**
   - Call `load_graph()` on a non-existent path.
   - Assert it returns `{"nodes": [], "edges": []}` (or raises a clean exception handled by the caller).

#### `tests/test_story_parser.py`

4. **`test_extract_links_variations()`**
   - Feed texts containing `tum to page 4`, `turn to page 22`, `go to page 5`, `return to page 12`, `follow her to page 8`.
   - Assert `extract_links()` returns the correct page numbers for each.

5. **`test_extract_links_ocr_errors()`**
   - Feed texts with OCR-corrupted digits: `page O1` (should be 01), `page l2` (should be 12), `page S3` (should be 53).
   - Assert `normalize_page_token()` maps them correctly and `extract_links()` returns the normalized integers.

6. **`test_is_terminal_variations()`**
   - Assert `is_terminal("The End")` is `True`.
   - Assert `is_terminal("END STORY")` is `True`.
   - Assert `is_terminal("Story Ends")` is `True`.
   - Assert `is_terminal("The end of the car.")` is `False` (non-terminal context).

7. **`test_suggest_graph_delta()`**
   - Build a mock current graph with one known edge (`2 -> 3`).
   - Create a temp `cot-pages-ocr-v2/` with pages 2, 3, 4 where page 2 text says `turn to page 4` (no edge to 3 in text).
   - Assert `suggest_graph_delta()` reports:
     - `suggested_new_edges` contains `(2, 4)`.
     - `orphan_edges` contains `(2, 3)`.

#### `tests/test_main_api.py` (FastAPI integration tests using `TestClient`)

8. **`test_get_graph_returns_mmd_data()`**
   - `GET /api/graph`.
   - Assert status 200, `nodes` list has >100 items, `edges` list has >100 items.
   - Assert node `P2` exists and `hasText` is `True`.

9. **`test_get_pages_returns_all_pages()`**
   - `GET /api/pages`.
   - Assert status 200 and length equals the number of files in `cot-pages-ocr-v2/`.

10. **`test_get_page_text_and_suggestions()`**
    - `GET /api/pages/3` → assert status 200, `text` contains `"Page 3"`.
    - `GET /api/pages/3/suggestions` → assert `suggested_edges` is `[4, 5]` and `is_terminal` is `False`.

11. **`test_save_page_does_not_mutate_mmd()`**
    - Save a copy of the current MMD file content.
    - `POST /api/pages/999` with arbitrary text containing `turn to page 998`.
    - Assert status 200.
    - Assert the MMD file content is **identical** to the saved copy (no new edge was added).

12. **`test_add_and_remove_edge_mutates_mmd()`**
    - `POST /api/graph/edges {"source": 999, "target": 998}` → assert 200.
    - `GET /api/graph` → assert an edge `P999 -> P998` exists.
    - `DELETE /api/graph/edges {"source": 999, "target": 998}` → assert 200.
    - `GET /api/graph` → assert the edge no longer exists.

13. **`test_rebuild_preview_vs_confirm()`**
    - `POST /api/graph/rebuild {"confirm": false}` → assert `confirmed` is `False`, `delta` present.
    - Note the current MMD file size or checksum.
    - `POST /api/graph/rebuild {"confirm": true}` → assert `confirmed` is `True`.
    - Assert the MMD file was overwritten (size/checksum changed) and still parses cleanly.

14. **`test_import_returns_diff_without_mmd_mutation()`**
    - Create a temp `.txt` file (e.g. `999-CoT.txt`) with text `turn to page 2`.
    - `POST /api/import` with the file.
    - Assert response contains `saved` and `delta`.
    - Assert the current MMD does **not** contain `P999` (unless it already did).

15. **`test_meta_crud()`**
    - `POST /api/pages/3/meta {"isEnding": true, "x": 50.0, "y": 100.0, "tags": ["foo"]}` → assert 200.
    - `GET /api/graph` → find node `P3` and assert `isEnding` is `True`, `x` is 50.0, `tags` contains `"foo"`.
    - `POST /api/pages/3/meta {"isEnding": false}` to reset.

---

### Phase 2: Reader Mode — Tests

#### `tests/test_reader_api.py`

16. **`test_reader_page_has_clickable_links_for_mmd_edges_only()`**
    - Ensure page 3 has MMD edges to pages 4 and 5.
    - Fetch the rendered reader HTML/JSON for page 3.
    - Assert that only links to 4 and 5 are present, and that the raw text phrase `tum to page 5` was linkified.

17. **`test_reader_terminal_page_shows_ending_overlay()`**
    - Pick a known terminal page (e.g. page 14 which says `The End`).
    - Fetch its reader render.
    - Assert the response contains an ending indicator (e.g. a class `terminal-page` or text `"The End"`).

18. **`test_reader_sequential_fallback()`**
    - Temporarily create a page 998 with no choices and no ending.
    - Ensure the MMD has no outgoing edges for 998.
    - Fetch reader render for 998.
    - Assert it contains a link or button to page 999 (the sequential next page).
    - Clean up temp pages after test.

#### `tests/test_static_export.py`

19. **`test_static_export_generates_dist()`**
    - Call `POST /api/export`.
    - Assert `output/dist/` exists and contains at least an `index.html`.
    - Assert `output/cot-story-graph.svg` was regenerated and exists.

20. **`test_static_reader_html_has_verified_links_only()`**
    - After export, open a generated static HTML file for page 3.
    - Assert all `<a>` tags point to pages that are confirmed edges in the MMD.

---

### Phase 3: Interactive Graph Authoring Tool — Tests

#### `tests/test_graph_frontend.py` (Playwright or similar)

21. **`test_graph_loads_all_nodes()`**
    - Open `/graph.html`.
    - Wait for Cytoscape to initialize.
    - Assert the canvas contains at least 100 nodes (query Cytoscape via injected JS).

22. **`test_click_node_opens_side_panel()`**
    - Click node `P3`.
    - Assert the side panel is visible and contains the text of page 3.
    - Assert the panel shows the MMD outgoing edges list with targets 4 and 5.

23. **`test_save_text_does_not_auto_add_edge()`**
    - In the side panel for page 3, append a fake choice `turn to page 999`.
    - Click Save.
    - Assert the suggestion section appears with page 999 listed.
    - Assert node `P999` does **not** appear in the graph and no new edge is drawn.

24. **`test_manual_add_edge_in_graph()`**
    - Select node `P3`, shift-click a placeholder node `P999` (or type target in side panel), click Add Edge.
    - Assert an edge `3 -> 999` appears in Cytoscape.
    - Refresh the page and assert the edge persists (loaded from MMD).

25. **`test_manual_terminal_toggle()`**
    - Click node `P3`, check the "Mark as Ending" checkbox, save meta.
    - Assert the node turns red in Cytoscape.
    - Uncheck it, save meta, assert it returns to gray/blue.

26. **`test_upload_diff_modal()`**
    - Simulate a drag-and-drop of a new `.txt` file.
    - Assert a modal/toast appears showing `saved` and `delta` counts.
    - Click "Apply Suggestion" for one edge.
    - Assert the edge is added to the graph and to the MMD.

27. **`test_rebuild_preview_modal()`**
    - Click "Rebuild from Text".
    - Assert a preview modal appears showing the diff (do not confirm).
    - Click Cancel.
    - Assert the MMD graph in Cytoscape is unchanged.
    - Re-open preview, click Confirm.
    - Assert the graph updates to match the parser output.

---

### Phase 4: Polish, Export, and Integration — Tests

#### `tests/test_integration.py`

28. **`test_graph_to_reader_navigation()`**
    - In the graph, double-click node `P3`.
    - Assert a new tab/window opens at `/read/3` and displays the correct page text.
    - Click "Edit in Graph" in Reader Mode.
    - Assert the graph view loads with node `P3` selected.

29. **`test_export_runs_canonical_scripts()`**
    - Call `POST /api/export`.
    - Assert `output/cot-stories/` contains story files.
    - Assert `output/cot-story-graph.svg` is newer than before the call.

30. **`test_path_explorer_lists_stories()`**
    - Open `/paths`.
    - Assert the page lists at least one complete path (e.g. starting with `2`).
    - Click a path.
    - Assert Reader Mode opens and auto-advances through the sequence (or at least loads the first page).

31. **`test_round_trip_mmd_preserve_after_edits()`**
    - Record the initial MMD checksum.
    - Add an edge via `/api/graph/edges`, delete it, then run Rebuild Confirm.
    - Parse the final MMD with `mmd_loader.load_graph()`.
    - Assert no duplicate nodes, no malformed lines, and the graph is structurally valid.

---

### Phase 5: Deployment — Tests

32. **`test_dev_server_starts_and_serves_static()`**
    - Run `uvicorn web.main:app --reload` in a subprocess.
    - `GET http://localhost:8000/` (or `/static/index.html` once it exists).
    - Assert status 200 and valid HTML.
    - Terminate the subprocess cleanly.

33. **`test_static_dist_no_server_needed()`**
    - After `POST /api/export`, open `output/dist/index.html` directly with `file://` (or a simple `python -m http.server` on the dist folder).
    - Navigate to a generated page.
    - Assert all links work and no external API calls are required for reading.
>>>>>>> 72e9818 (First iteration of the website)

---

## Post-Implementation UI/UX Fixes

### Issue: "Not Found" when proceeding between the different pages

**Root cause:** `reader.html`, `graph.html`, and `paths.html` do not share a consistent navigation bar. Users must manually type URLs or rely on the browser back button to switch modes, which feels like hitting a dead end.

**Fix:** Add a persistent top navigation bar to **all three** HTML files so users can always reach the other views.

```html
<!-- Add inside <body> of reader.html, graph.html, and paths.html -->
<nav class="top-nav">
  <a href="/reader.html">📖 Reader</a>
  <a href="/graph.html">🕸️ Graph</a>
  <a href="/paths.html">🛤️ Paths</a>
</nav>
```

- In `reader.css`, `graph.css`, and `paths.css`, style `.top-nav` with a subtle background (`#f1f5f9`), horizontal flex layout, and active-page highlighting.
- Remove the ad-hoc "Edit in Graph" footer from `reader.html` once the top nav is present (keep it as an extra convenience if desired, but the nav is the primary fix).

---

### Issue: No back button for the node editor / "How do I edit the nodes?"

**Root causes:**
1. The graph canvas has no onboarding hint; first-time users do not know they must **click a node** to open the side-panel editor.
2. When arriving from Reader via the "Edit in Graph" link (`graph.html#page=3`), the target node is **not auto-selected**, so the side panel stays hidden and the page appears broken.
3. The side panel only has a small "×" close button; there is no obvious "Back / Clear selection" action.

**Fixes:**

#### 1. Auto-select node from URL hash
In `graph.js`, after `initGraph()` finishes loading, parse `location.hash` and programmatically open the matching node:

```javascript
function handleIncomingHash() {
  const m = location.hash.match(/^#page=(\d+)$/);
  if (m && cy) {
    const node = cy.getElementById(`P${m[1]}`);
    if (node.length) {
      selectNode(node);
      cy.animate({ fit: { eles: node, padding: 80 }, duration: 300 });
    }
  }
}
```

Call `handleIncomingHash()` at the end of `initGraph()`.

#### 2. Onboarding / empty-state hint
When the side panel is closed, show a small floating hint in the top-right or center of the canvas:

> **Tip:** Click a node to edit text & edges. Double-click to open in Reader. Shift-click another node to connect them.

Implementation: add a `<div id="graph-hint">` in `graph.html`. Toggle its visibility in `selectNode()` (hide) and `closePanel()` (show).

#### 3. Clearer side-panel controls
- Keep the existing "×" close button, but also add a secondary **"Clear Selection"** text link at the bottom of the side panel that simply calls `closePanel()`.
- In the empty-state hint, add a sentence: *"Select a page node on the left to begin editing."*

#### 4. (Optional but recommended) Toolbar search box
Add a small `<input type="number">` to the graph toolbar labeled **"Jump to page"**. On Enter, find the node, center it, and select it. This is especially helpful now that the graph contains 100+ nodes.

---

## Summary of Required File Changes

| File | Change |
|------|--------|
| `web/static/reader.html` | Add `.top-nav` after `<body>` |
| `web/static/reader.css` | Style `.top-nav` |
| `web/static/graph.html` | Add `.top-nav`; add `#graph-hint` div; add "Jump to page" input in toolbar |
| `web/static/graph.css` | Style `.top-nav`, `#graph-hint`, toolbar input |
| `web/static/graph.js` | Parse `#page=X` hash; show/hide hint; add jump-to-page logic |
| `web/static/paths.html` | Add `.top-nav` |
| `web/static/paths.css` | Style `.top-nav` |
