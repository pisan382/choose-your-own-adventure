# Project Plan — Multi-Book Story Graph + Reader Web App

> This is an active working document. See TODO.md for the live checklist.

## Goal

Extend the repo (which today handles only `the-cave-of-time`) to:

1. Build story graphs + generated stories for every PDF in `samples/`.
2. Ship a React+Vite static site that reads these bundles, renders a branching reader, shows the graph, and surfaces all endings.
3. Deployable to Netlify.

## PDF Triage — what we're actually dealing with

Inspected via `scripts/triage_pdfs.py` (output in `output/triage.json`). 19 PDFs, 338 MB total. They fall into four categories:

### A. CYOA with native text layer (best case)

| File | Pages | chars/pg | "turn to page" hits |
|---|---|---|---|
| ArcadeExplorers-SaveTheVenturians1985.pdf | 180 | 1021 | 52 |
| the-cave-of-time.pdf | 66 | 1169 | 3* |

\* CoT's text layer is sparse — the existing OCR pipeline is still the better source for it. Kept as-is.

### B. Possibly branching, native text layer — patterns TBD

| File | Pages | chars/pg | Notes |
|---|---|---|---|
| MicroAdventureNo.7-DoomStalker.pdf | 132 | 922 | "End" markers present, no `turn to page` — uses different reference style |
| NintendoAdventureBooks02-LeapingLizards1991.pdf | 63 | 1266 | Same situation |
| TheMysteryAndAdventureComputerStorybook1983.pdf | 132 | 781 | Duplicate of " (1).pdf" — dedupe |
| A Magic Micro Adventure - Captain Kid and the Pirates (1985).pdf | 83 | 635 | Computer type-in book, likely linear |
| AMagicMicroAdventure-TheCatsOfCastleMountain.pdf | 83 | 682 | Same as above |

### C. Linear novels / tie-ins (no branching expected)

| File | Pages | chars/pg |
|---|---|---|
| Child of the Chaos (2004).pdf | 28 | 4287 |
| The Bard's Tale - The Chaos Gate (1994).pdf | 117 | 3781 |
| Under a Killing Moon - A Tex Murphy Novel (1996).pdf | 163 | 2801 |

These are legitimate PDFs but they're novels, not gamebooks. Will present as single-path "books" in the reader (no graph, just chapter-based).

### D. Scanned, need OCR

| File | Pages | Notes |
|---|---|---|
| 01 - The Warlock of Firetop Mountain.pdf | 191 | **Fighting Fantasy — uses numbered sections ("turn to 237"), not pages.** Core adaptation needed. |
| KatieAndTheComputer1979.pdf | 46 | Children's book, likely linear |
| SpaceRogue-StarsOfOpportunity1989.pdf | 11 | Short, fast OCR |
| TheUltimaSaga-TheForgeOfVirtue1991.pdf | 322 | Large novelization, linear |
| Zork #1–#4 | 64 each | Novelizations, linear |

## Architecture

### Generalized pipeline

```
scripts/
  triage_pdfs.py              [new] triage every PDF
  extract_text.py             [new] native text layer -> pages/NNN.txt
  extract_ocr.py              [new] generalized OCR (adapted from reextract_cot)
  detect_format.py            [new] heuristic: cyoa-page | ff-section | linear
  build_graph.py              [new] generalized graph builder (multiple reference styles)
  write_stories.py            [new] generalized story enumerator
  render_graph_svg.py         [new] generalized renderer (adapted from existing)
  run_all.py                  [new] orchestrator: run each step for each book
  reextract_cot_ocr_split.py  [kept] legacy CoT-specific OCR
  build_story_graph.py        [kept] legacy CoT graph builder
  write_all_stories.py        [kept] legacy CoT stories
  render_story_graph_svg.py   [kept] legacy SVG renderer
```

### Output schema (per book)

```
output/books/<slug>/
  meta.json          # title, source_pdf, format, page_count, start_page, ...
  pages/NNN.txt      # (or sections/ for Fighting Fantasy)
  graph.json         # { nodes: [...], edges: [...], start: N }
  graph.mmd          # legacy Mermaid
  graph.svg          # visualization
  stories/*.txt
  stories/manifest.json
output/books.json    # master index
```

### Web app

```
webapp/
  package.json, vite.config.ts, index.html
  public/data/     # symlinked or copied from output/books at build time
  src/
    App.tsx
    routes/
      Home.tsx              # list of books
      BookReader.tsx        # interactive reader, one page at a time
      BookGraph.tsx         # graph visualization (cytoscape or d3)
      BookEndings.tsx       # all endings / all paths list
    components/
      PageView.tsx
      ChoiceList.tsx
    lib/
      bookLoader.ts
```

Routing: `/` (list), `/b/:slug` (reader), `/b/:slug/graph`, `/b/:slug/endings`.

## Execution Strategy (time-boxed)

Priority order — stop at any point with working intermediate results committed:

1. **Ground work**: PLAN.md, TODO.md, triage output committed.
2. **Generalized text extractor + graph builder**. Smoke-test on Arcade Explorers (the clearest CYOA with text layer).
3. **Process CoT in the new format** without re-running OCR (reuse existing `output/cot-pages-ocr-v2`). Gives us 2 books minimum.
4. **Scaffold the React+Vite app**. Start with book list + reader + graph view. Bundle the 2 books.
5. **Expand format detector** to handle sections (Fighting Fantasy) and linear (novels).
6. **Batch process** category B and C books (native text).
7. **OCR category D** smallest-first (SpaceRogue → Warlock → Zork → Ultima). Stop when walltime runs out.
8. **Netlify config** (`netlify.toml`) and build hygiene.
9. **Commit & push** at every meaningful milestone.

## Non-goals / deferred

- Re-OCR of CoT (already good).
- Perfect graph cleanup — OCR noise will leak.
- Heavy LLM usage. First pass is regex + heuristics. Only falls back to Claude if a book produces zero edges under standard patterns.
- e2b offload — only used if local sandbox compute proves insufficient.

## Known risks

- Fighting Fantasy's 191 pages of OCR is slow (~10-20 min tesseract).
- Zork and Ultima are large scans; if they're linear novels, graph extraction will find no edges — that's the correct outcome, not a failure.
- Some OCR'd page numbers will be garbled → dangling edges. Graph builder must be tolerant (drop edges to missing pages).
- Two copies of "TheMysteryAndAdventureComputerStorybook1983" — dedupe to one slug.
