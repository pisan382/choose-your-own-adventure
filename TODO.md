# TODO

Live checklist. Check off as completed. Next session: read PLAN.md first, then pick up wherever `[ ]` items remain.

## Phase 1 — Scaffolding

- [x] Clone repo, inspect existing pipeline
- [x] Triage all 19 PDFs, classify by format (see PLAN.md)
- [x] Write PLAN.md and TODO.md
- [x] Commit scaffolding

## Phase 2 — Generalized extraction pipeline

- [x] `scripts/extract_text.py` — native PDF text layer → `output/books/<slug>/pages/NNN.txt`
- [x] `scripts/build_graph.py` — parse choices, emit `graph.json` and `graph.mmd`
  - Supports reference styles: `page`, `section`, `paragraph`, `none` (linear)
- [x] `scripts/write_stories.py` — generalized story enumerator with cycle + depth bounds
- [x] `scripts/render_graph_svg.py` — generalized SVG renderer
- [x] `scripts/run_all.py` — orchestrator per-book

## Phase 3 — Per-book processing

Mark done when `output/books/<slug>/` has pages, graph, stories, meta.

- [x] `arcadeexplorers-savetheventurians1985` (native text, CYOA)
- [x] `the-cave-of-time` (reuse existing OCR output, rewrap into new schema)
- [x] `microadventureno-7-doomstalker` (native text, pattern TBD)
- [x] `nintendoadventurebooks02-leapingliz̆ards1991` (native text)
- [x] `themysteryandadventurecomputerstorybook1983` (native text; drop duplicate `(1).pdf`)
- [x] `a-magic-micro-adventure-captain-kid-and-the-pirates-1985` (native text)
- [x] `amagicmicroadventure-thecatsofcastlemountain`
- [x] `child-of-the-chaos-2004` (linear)
- [x] `the-bard-s-tale-the-chaos-gate-1994` (linear)
- [x] `under-a-killing-moon-a-tex-murphy-novel-1996` (linear)
- [ ] `01-the-warlock-of-firetop-mountain` (OCR + Fighting Fantasy section format) — DEFERRED
- [ ] `katieandthecomputer1979` (OCR)
- [ ] `spacerogue-starsofopportunity1989` (OCR, only 11 pages — quickest)
- [ ] `theultimasaga-theforgeofvirtue1991` (OCR, large)
- [ ] `zork-1-the-forces-of-krill-1983` (OCR)
- [ ] `zork-2-the-malifestro-quest-1983` (OCR)
- [ ] `zork-3-the-cavern-of-doom-1983` (OCR)
- [ ] `zork-4-conquest-at-quendor-1984` (OCR)

## Phase 4 — React+Vite reader app

- [x] Scaffold `webapp/` with Vite + React + TypeScript
- [x] Book list home page
- [x] Book reader (interactive, page-by-page)
- [x] Graph visualization page
- [x] All endings page
- [x] Path history / breadcrumb
- [x] Copy `output/books/` → `webapp/public/data/` at build time
- [x] `netlify.toml` for deployment

## Phase 5 — Polish

- [ ] README updated with new workflow
- [x] Keep Codebase.md accurate for future sessions
- [ ] Commit + push everything

## Notes from the current session

- PyMuPDF installed for native text extraction (much faster than OCR).
- `magick` binary not present in this sandbox; legacy CoT OCR script (`reextract_cot_ocr_split.py`) would need to be adapted to use `convert` (ImageMagick 6) if re-run. Not blocking — existing CoT output is preserved as-is.
- GitHub PAT used during this session should be rotated afterward.
- Duplicate PDF `TheMysteryAndAdventureComputerStorybook1983 (1).pdf` is identical to the other — we skip it.
