# Codebase Notes

Read this first when resuming the project. PLAN.md is the architectural plan;
TODO.md is the live checklist; this file captures the why, the gotchas, and
the "if you only read one file, read this".

## Current state (as of Phase 4 completion)

Live site: **https://cyoa-reader.netlify.app/**

The project extracts story graphs from vintage gamebook PDFs in `samples/`,
enumerates every bounded path, and serves them through an interactive
React+Vite reader.

Shipping books (10):

| slug | format | pages | branches | endings |
|---|---|---|---|---|
| the-cave-of-time | cyoa | 111 | 35 | 48 |
| arcade-explorers | cyoa | 151 | 15 | 3 |
| bards-tale-chaos-gate | linear | 117 | 0 | 1 |
| child-of-the-chaos | linear | 26 | 0 | 1 |
| magic-micro-captain-kid | linear | 73 | 0 | 1 |
| magic-micro-cats-castle-mountain | linear | 75 | 0 | 1 |
| microadventure-7-doomstalker | linear | 126 | 0 | 1 |
| mystery-adventure-computer-storybook | linear | 107 | 0 | 1 |
| nintendo-adventure-2-leaping-lizards | linear | 63 | 0 | 1 |
| under-a-killing-moon | linear | 163 | 0 | 1 |

Books deferred (all require OCR): Warlock of Firetop Mountain, Zork #1–#4,
Ultima Saga, Katie and the Computer, Space Rogue. See Future Enhancements.

## Architecture

Data flows through five stages. Each is a CLI script that reads disk
artifacts and writes disk artifacts — no shared process state, easy to
resume or rerun any stage.

```
samples/*.pdf
   ↓  scripts/triage_pdfs.py
output/triage.json          ← inspect every PDF (text layer? patterns?)
   ↓  scripts/extract_text.py   (or legacy OCR for the-cave-of-time)
output/books/<slug>/pages/NNN.txt
   ↓  scripts/build_graph.py
output/books/<slug>/graph.json   ← machine-readable, consumed by webapp
output/books/<slug>/graph.mmd    ← debug
   ↓  scripts/write_stories.py
output/books/<slug>/stories/*.txt + manifest.json
   ↓  scripts/render_graph_svg.py
output/books/<slug>/graph.svg
   ↓  scripts/stage_webapp_data.py
webapp/public/data/<slug>/**     ← subset copied into webapp
   ↓  vite build
webapp/dist/
   ↓  netlify deploy
https://cyoa-reader.netlify.app/
```

The orchestrator `scripts/run_all.py` chains stages 2–4 per book using a
per-book config table (BOOKS list). `output/books.json` is the master
index that the web app fetches first.

### Per-book schema

```
output/books/<slug>/
  meta.json                # title, source_pdf, format, reference_style, start_page
  pages/NNN.txt            # one file per extracted book-page, header "Page N"
  graph.json               # nodes[].choices[{target, prompt, raw}]
  graph.mmd                # mermaid (human-debug)
  graph.svg                # layered Sugiyama SVG with trunk & terminal colouring
  stories/story-NNNN.txt   # one file per enumerated path
  stories/manifest.json    # [{file, path, end_reason, length, ...}]
```

### Webapp routes

```
/                       list of books (split: branching vs linear)
/b/:slug                overview + stats
/b/:slug/read[/:page]   page-by-page reader with path breadcrumb
/b/:slug/graph          clickable SVG graph (nodes navigate to reader)
/b/:slug/endings        all enumerated paths, sortable
```

## Key design decisions

**Per-book config table, not per-book scripts.** Early drafts were tempted
to add per-book wrapper scripts. Instead, `scripts/run_all.py` has a
`BOOKS = [...]` list of dicts. Adding a new book is appending a dict, not
writing a file. Makes re-runs trivial.

**Reference styles, not per-format code paths.** Books reference choices
differently: CYOA-style ("turn to page 47"), Fighting-Fantasy-style
("turn to 237" with bare numbered sections), or not at all (linear).
`build_graph.py` has one code path that switches its regex patterns via
`reference_style ∈ {page, section, none}`. Adding a new style is adding
a pattern list.

**Legacy CoT OCR preserved, not redone.** The existing
`output/cot-pages-ocr-v2/` OCR is the best extraction we have for CoT
(the PDF's native text layer is sparse). `scripts/import_cot.py` wraps
those files into the new schema without re-OCRing. Never delete
`output/cot-pages-ocr-v2/` — it's the source of truth for that book.

**Sequential edges with small gaps.** When a page has no explicit "turn
to page X" and isn't marked terminal, `build_graph.py` adds an edge to
page N+1, skipping up to 3 blank pages. This was discovered necessary
for Arcade Explorers, where pure-illustration pages would otherwise
dead-end the graph.

**Terminal detection is stricter than it looks.** `\bthe\s+end\b` has
too many false positives ("at the end of the hall"). We require the
phrase to appear as a standalone line of ≤4 words within the last 4
non-empty lines of a page.

**Graph clicks use router navigate, not window.location.** The SVG
renderer emits plain `<rect>` and `<text>` elements. The graph route
hooks click handlers onto text nodes whose content parses as an int,
and uses `useNavigate()` to avoid full-page reloads.

**Individual story files aren't bundled into the webapp.** Paths are
rendered on the fly from page text. `stage_webapp_data.py` copies
`manifest.json` but skips `story-NNNN.txt`. Cuts bundle size by ~100x.
`webapp/public/data/` is gitignored and regenerated at build time.

**Netlify build config lives in root `netlify.toml` with `base = "webapp/"`.**
See "Gotchas" below for the false start.

## Gotchas discovered the hard way

**Duplicate PDFs in samples/.** Two files, `TheMysteryAndAdventureComputerStorybook1983.pdf`
and `...(1).pdf`, have identical MD5s. Dedupe before processing.

**BASIC programming books look like CYOA.** Micro Adventure #7, Nintendo
Adventure Books #2, the two Magic Micro titles, and Mystery & Adventure
Computer Storybook all contain `IF T$="Y" THEN GOTO 100` style BASIC
source interspersed with narrative. Initial pattern matching picked up
zero real branches but the books were marked `cyoa` in the config. The
correct label is `linear` — these are type-in programming books, not
branching narratives. Relabeled manually after triage.

**Arcade Explorers isn't tree-shaped.** Unlike CoT (which fans out into
branches), Arcade Explorers has a single first-branch at page 10 with
three near-parallel storylines. Only 3 enumerated paths from start.
That's the book's actual structure, not a bug.

**PyMuPDF aliases.** The package on PyPI is `pymupdf`; the import name
is `fitz`. Netlify's build image doesn't auto-install it. The stage
script uses `import fitz`, but the webapp's build only uses node —
pip install only matters if we re-run extraction in CI (we don't).

**ImageMagick version drift.** Legacy `reextract_cot_ocr_split.py` uses
`magick` (ImageMagick 7). Ubuntu 24 in the sandbox only has `convert`
(IM6). Not a problem for current workflow because CoT OCR is preserved
and not re-run; if you need to re-OCR, adapt the invocation.

**Netlify connected to the wrong repo.** On first deploy attempt, the
build log said `git clone https://github.com/pisan382/01shortAIproject`
(a different project entirely). Fix was in Netlify UI:
Site configuration → Build & deploy → Repository → Manage repository →
relink to `pisan382/choose-your-own-adventure`.

**Netlify dashboard overrides netlify.toml.** If the UI has stale build
settings from before `netlify.toml` existed, it wins. Safe setup:
set Base directory to `webapp` in the UI; leave Build command blank;
set Publish directory to `dist`; let `netlify.toml` drive everything
else. Then: Trigger deploy → Clear cache and deploy site.

**`base = "webapp/"` means paths in `command` are relative to `webapp/`.**
Our command `python3 ../scripts/stage_webapp_data.py` escapes up one
level because the staging script lives at repo root in `scripts/`. That
works on Netlify's build sandbox but watch for errors like
"No such file or directory" if the build image ever changes.

**`public/` contents ship to the app root at build time.** Deleting
`public/favicon.svg` / `public/icons.svg` was necessary — Vite scaffolded
defaults were being copied into `dist/` even though nothing referenced
them.

**Client-side routing requires `/* → /index.html` redirect.** Without
the rule in `netlify.toml`, direct loads of `/b/the-cave-of-time/read/12`
would 404. The redirect makes every unknown path serve the SPA shell;
React Router then takes over.

## How to resume

Read PLAN.md and TODO.md. The checklist in TODO.md tells you what's next.
Typical resume session:

```bash
git clone https://github.com/pisan382/choose-your-own-adventure
cd choose-your-own-adventure
pip install pymupdf        # needed for any extraction work
cd webapp && npm ci && cd ..
```

### Adding a new book

1. Drop PDF into `samples/`.
2. Run `python3 scripts/triage_pdfs.py`. Inspect `output/triage.json`:
   - `has_text_layer: true` + many `turn_to_page` hits → `cyoa`, `page`
   - `has_text_layer: true` + no branch patterns → likely `linear`
   - `has_text_layer: false` → needs OCR (category D, see Future below)
3. If the book has native text, find its page offset: print the first few
   pages and look for where the story actually starts. Note the PDF page
   number and what "page N" the book calls it.
4. Append a dict to `BOOKS` in `scripts/run_all.py`.
5. `python3 scripts/run_all.py <slug>` to process just that book.
6. `python3 scripts/stage_webapp_data.py` to refresh webapp data.
7. If developing locally: `cd webapp && npm run dev`.
8. Commit. The push triggers Netlify auto-deploy.

### Regenerating everything

```bash
python3 scripts/run_all.py        # reprocess all books in BOOKS
python3 scripts/stage_webapp_data.py
cd webapp && npm run build
```

### Deploying manually (if auto-deploy is broken)

```bash
cd webapp
npx netlify-cli deploy --prod --dir=dist --site=cyoa-reader --auth=<token>
```

## Future enhancements

### Near-term, low-lift

**OCR the remaining scanned books.** The pipeline is OCR-ready via
`reextract_cot_ocr_split.py`. Needs `magick` (ImageMagick 7) and
tesseract. For a single-column book, a simpler variant that OCRs the
whole page (no spread split) would be cleaner. Start with Space Rogue
(11 pages, quickest smoke test), then Katie (46), then Zork #1–4
(64 each, probably linear novelizations).

**Fighting Fantasy "section" style for Warlock of Firetop Mountain.**
`build_graph.py` already accepts `reference_style = section`. The
patterns exist (PATTERNS_SECTION) but weren't field-tested because
Warlock needs OCR first. Expect "Turn to 237" style refs into numbered
sections 1–400. Section numbers aren't page numbers — the file naming
convention in `pages/NNN.txt` still works, just treat NNN as a section
id instead.

**Wire up graph SVG zooming and panning.** The current graph for
Arcade Explorers (151 nodes) is large and must be scrolled. A
lightweight pan-zoom wrapper (e.g. `svg-pan-zoom` or raw pointer
events) would help. No framework needed beyond what's already there.

**Keyboard navigation in the reader.** Left/Right arrows to traverse
history; 1–9 to pick the N-th choice. Accessibility win.

**Anchor visited pages in the graph when viewing from the reader.**
When a user has walked 2 → 3 → 4 → 8 in the reader, showing those
nodes highlighted in the graph (query string or hash state) would make
the "wait, where am I?" question answerable.

### Medium-lift

**Better choice prompts.** Right now `build_graph.py` captures up to
200 chars before the "turn to page N" match as the prompt. The heuristic
produces readable but often awkward text ("if you follow the advice of
the owl, turn to"). A small LLM post-pass over each branching page
could produce clean, one-sentence prompts like "Follow the owl's
advice." Store both the raw and cleaned prompt in `graph.json`.

**OCR quality pass.** Current OCR of CoT has occasional noise. A
similar LLM-mediated cleanup (read page text + likely context → output
corrected text) would help, especially for sections that parse badly.
Keep raw OCR as a separate file so the cleanup can be redone.

**Cross-book search.** A simple client-side search over page text
(FlexSearch or lunr) would let users find "any book that mentions
'dragon'" without leaving the app. Would shift page text from
on-demand fetch to eager bundle — check bundle size impact first.

**Reading progress persistence.** LocalStorage-backed "you've read 12 of
48 endings of this book" per slug. No backend needed. Already has the
data (path breadcrumb, manifest).

**Deep-linkable path replay.** `/b/:slug/replay/2-3-4-8` to replay any
specific enumerated path step by step with a Next button between pages.
Useful for sharing a particular playthrough.

### Speculative

**Branch detection without "turn to page" patterns.** Some books would
need an LLM to identify choice points from narrative context alone.
Would unlock books where the text has been heavily paraphrased in OCR
or where the original uses unusual conventions.

**Illustrations.** Many of these gamebooks have black-and-white line
art on many pages. `pdftoppm` can already extract the images;
`extract_text.py` could grab image regions and save as `pages/NNN.png`.
The reader would display them alongside the text.

**Audio reading mode.** Browser TTS over the page text, auto-pausing
at choices. Most of the engineering is already there — a Play button
on each page and a `speechSynthesis.speak(pageText)` call.

**Multi-reader comparison.** Show two paths side by side — useful for
analyzing how different choices diverge. Requires the reader layout
to split into columns.

**Story graph statistics.** Per-book metrics page: longest path,
shortest path, average branching factor, number of reachable vs
orphan pages, cycle detection details. Already have the data; just
surface it.

## Rotate credentials

The GitHub PAT and the Netlify personal access token have both appeared
in multiple chat turns during development. Rotate them before sharing
this repo anywhere public.
