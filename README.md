# The Cave of Time — Choose Your Own Adventure

A web-based reader for the classic CYOA story *The Cave of Time*, built as a CSS 382 group project.

## Live Site

🌐 **[Add deployed URL after Vercel deployment]**

## Repository

📁 **[Add GitHub repository URL here]**

## Team

- Richie Chen
- Kevin Vo
- Yousuf Al-Bassyiouni

---

## About the Project

This project takes *The Cave of Time* (scanned PDF), extracts the branching story pages using OCR, and presents them as an interactive web reader. Readers can click through choices, track their path, and try to discover all 45 possible endings.

## How to Run Locally

```bash
# Serve the project as a static site (required for fetch() to work)
python3 -m http.server 8000
# then open http://localhost:8000
```

## How to Regenerate Story Data

```bash
# Re-extract pages from the PDF
python3 scripts/reextract_cot_ocr_split.py \
    --pdf samples/the-cave-of-time.pdf \
    --pdf-start-page 8 --pdf-end-page 66 \
    --story-start-page 2 --output-dir output/cot-pages-ocr-v2

# Rebuild story JSON for the web app
python3 scripts/build_story_json.py \
    --pages-dir output/cot-pages-ocr-v2 \
    --output data/story.json

# Rebuild story graph (optional)
python3 scripts/build_story_graph.py \
    --pages-dir output/cot-pages-ocr-v2 \
    --output output/cot-story-graph.mmd
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo at [vercel.com](https://vercel.com).
3. Framework preset: **Other** (static site — no build step needed).
4. Root directory: `/` (default).
5. Click **Deploy**.
6. Update the Live Site URL above once deployment is complete.

## Project Structure

| File / Folder | Purpose |
|---|---|
| `index.html` | Web reader UI |
| `style.css` | Styles |
| `app.js` | Reader logic |
| `data/story.json` | Parsed story pages for the web app |
| `scripts/build_story_json.py` | Converts OCR txt files → story.json |
| `scripts/build_story_graph.py` | Builds Mermaid story graph |
| `scripts/write_all_stories.py` | Writes all 45 story paths to txt files |
| `scripts/reextract_cot_ocr_split.py` | Re-extracts pages from PDF using OCR |
| `output/cot-pages-ocr-v2/` | OCR-extracted page text files |
| `output/cot-story-graph.svg` | Visual graph of all story branches |
| `Brainstorm.md` | Team brainstorming notes |
| `ToDo.md` | Project task list |
| `Codebase.md` | Architecture reference |
