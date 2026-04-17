# choose-your-own-adventure

Extract story graphs from vintage Choose-Your-Own-Adventure (and related)
gamebook PDFs, enumerate every possible bounded path, and serve them via
an interactive web reader.

**Live:** https://cyoa-reader.netlify.app/

## Repo layout

```
samples/                   source PDFs
scripts/                   extraction / graph / rendering / orchestration
output/
  triage.json              per-PDF classification
  books.json               master index consumed by the web app
  books/<slug>/            per-book artifacts
    meta.json
    pages/NNN.txt
    graph.json             machine-readable graph (web app consumes this)
    graph.mmd              mermaid (debug)
    graph.svg              rendered graph (web app embeds this)
    stories/story-NNNN.txt enumerated path contents
    stories/manifest.json  path list
  cot-pages-ocr-v2/        legacy: Cave of Time OCR pages (preserved verbatim)
  cot-stories/             legacy: Cave of Time enumerated stories
webapp/                    Vite + React + TypeScript reader app
  src/
    main.tsx, App.tsx, styles.css
    routes/                Home, BookOverview, BookReader, BookGraph, BookEndings
    lib/data.ts            fetchers + types
  public/data/             STAGED DATA (generated; gitignored)
netlify.toml               deployment config
PLAN.md                    project plan
TODO.md                    live checklist
```

## Workflow for adding a new book

1. Drop the PDF into `samples/`.
2. Run triage to inspect it:
   ```bash
   python3 scripts/triage_pdfs.py
   ```
3. Add an entry to the `BOOKS` list in `scripts/run_all.py` with the right
   `pdf_start_page`, `story_start_page`, `format`, and `reference_style`.
4. Run the pipeline:
   ```bash
   python3 scripts/run_all.py <slug>    # or run all books with no arg
   ```
5. Stage into the webapp and rebuild:
   ```bash
   python3 scripts/stage_webapp_data.py
   cd webapp && npm run build
   ```

## Pipeline components

- `triage_pdfs.py` — classify each PDF: has text layer? How many choice
  patterns? Likely format?
- `extract_text.py` — PyMuPDF native text-layer extractor. Supports
  `--layout single` (one book-page per PDF page) and `--layout spread`
  (two-column spreads as in the Cave of Time scan).
- `build_graph.py` — parse page text for choice patterns. Supports
  `reference_style` of `page` (turn to page N), `section` (Fighting
  Fantasy style), or `none` (linear). Emits `graph.json` + `graph.mmd`.
- `write_stories.py` — DFS every path from `start_page`, bounded by
  `max_decisions` (default 20) and `max_paths` (default 500). Cycles
  terminate paths at the revisited page.
- `render_graph_svg.py` — Sugiyama-layered SVG renderer with terminal
  and main-trunk highlighting.
- `run_all.py` — batch orchestrator driven by per-book config.
- `import_cot.py` — one-off wrapper to fold the legacy Cave of Time OCR
  output into the new schema without re-OCRing.
- `stage_webapp_data.py` — copies `output/books/` → `webapp/public/data/`
  (skipping individual story files; the app renders paths on demand).

## Web app

- `/` — book list
- `/b/<slug>` — book overview + stats
- `/b/<slug>/read/<page>` — interactive reader
- `/b/<slug>/graph` — clickable SVG graph
- `/b/<slug>/endings` — all enumerated paths

React Router, no state library, Vite.

## Books processed

10 books ship currently. Five "BASIC programming type-in" books
(Micro Adventure, Nintendo Adventure Books, Magic Micro, Mystery &
Adventure Computer Storybook) contain no narrative branching despite
superficially resembling CYOA; they render as linear books.

| slug                                 | format | pages | branches | endings |
|--------------------------------------|--------|-------|----------|---------|
| the-cave-of-time                     | cyoa   | 111   | 35       | 48      |
| arcade-explorers                     | cyoa   | 151   | 15       | 3       |
| bards-tale-chaos-gate                | linear | 117   | 0        | 1       |
| child-of-the-chaos                   | linear | 26    | 0        | 1       |
| magic-micro-captain-kid              | linear | 73    | 0        | 1       |
| magic-micro-cats-castle-mountain     | linear | 75    | 0        | 1       |
| microadventure-7-doomstalker         | linear | 126   | 0        | 1       |
| mystery-adventure-computer-storybook | linear | 107   | 0        | 1       |
| nintendo-adventure-2-leaping-lizards | linear | 63    | 0        | 1       |
| under-a-killing-moon                 | linear | 163   | 0        | 1       |

Deferred (scanned PDFs needing OCR): Warlock of Firetop Mountain
(Fighting Fantasy — uses numbered sections, not pages), Zork ×4, Ultima
Saga, Katie and the Computer, Space Rogue.

## Legacy scripts (Cave of Time specific, kept for reference)

The original CoT-only pipeline remains in the repo:

- `reextract_cot_ocr_split.py` — OCR the Cave of Time scan (ImageMagick 7
  `magick` + tesseract)
- `build_story_graph.py` — original Mermaid-only builder
- `write_all_stories.py` — original CoT story enumerator
- `render_story_graph_svg.py` — original Mermaid-to-SVG renderer

These drive the `output/cot-pages-ocr-v2/` workflow. The generalized
pipeline (above) does not depend on them.
