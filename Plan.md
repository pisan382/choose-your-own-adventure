# Cleanup Plan: Making the Repository Pushable to GitHub

## The Problem

The repository has grown to **~317 MB**, which is far too large to push to GitHub in a single batch. GitHub recommends staying under 1 GB per repository, and pushing hundreds of megabytes at once is slow, error-prone, and can trigger size limits.

### What's Causing the Bloat

| Directory | Size | Why it's large |
|-----------|------|----------------|
| `.venv/` | ~180 MB | Python virtual environment with FastAPI, uvicorn, pytest, playwright, pydantic, and all transitive dependencies |
| `.git/` | ~88 MB | Git history plus thousands of tracked generated files |
| `web/static/lib/` | ~652 KB | Vendored cytoscape.js, dagre.js, and cytoscape-dagre.js |
| `output/` | ~1.5 MB | Generated stories, static dist, zip exports, SVG, and metadata JSON |

**Root cause:** There was no `.gitignore`, so `.venv/`, `output/`, and `web/static/lib/` were all accidentally committed to Git.

### What's Actually Important

The **source code** (Python backend, HTML/CSS/JS frontend, tests, docs, and the canonical `cot-story-graph.mmd` + `cot-pages-ocr-v2` text files) is only a few megabytes. Everything else can be regenerated or re-downloaded.

---

## The Plan

### Step 1: Add a `.gitignore`

We have created `.gitignore` to exclude:
- `.venv/` — virtual environments should never be in git
- `output/cot-stories/`, `output/dist/`, `output/cyoa-export.zip` — generated artifacts
- `web/static/lib/` — vendored JS libraries (we'll switch to CDN or document how to download them)
- Python cache, IDE files, test artifacts

### Step 2: Untrack Generated Files from Git (Keep Them Locally)

Run these commands to remove the bloated directories from Git's index **without deleting them from your local disk**:

```bash
# Remove directories from git tracking (keeps local copies)
git rm -r --cached .venv
git rm -r --cached output/cot-stories
git rm -r --cached output/dist
git rm -r --cached output/cyoa-export.zip
git rm -r --cached web/static/lib

# Remove generated metadata/SVG if they were tracked
git rm --cached output/pages-meta.json

# Commit the cleanup
```

### Step 3: Switch Vendored Libraries Back to CDN (or Document Download)

`web/static/lib/` contains ~652 KB of minified JS. We originally downloaded these for test reliability, but for GitHub pushability we should either:

**Option A (Recommended for smaller repo):** Switch `graph.html` back to CDN links:
```html
<script src="https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
<script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js"></script>
<script src="https://unpkg.com/cytoscape-dagre@2.5.0/cytoscape-dagre.js"></script>
```

**Option B:** Keep the vendored files locally but don't commit them. Add a `Makefile` or setup script that downloads them on first run.

### Step 4: Commit the Cleanup

After untracking, commit with a clear message:

```bash
git add .gitignore Plan.md
# (the rm --cached commands already staged the deletions)
git commit -m "Remove generated artifacts and .venv from git tracking"
```

### Step 5: Verify the Size Drop

Check the repo size before pushing:

```bash
du -sh .git
```

It should drop from ~88 MB to well under 10 MB. The working directory will still have everything locally because we used `--cached`.

### Step 6: Push in Stages (If Still Nervous)

If the `.git` directory is still large due to old history (e.g. the 36 MB `AI-session-log-*.json` or the 6.7 MB PDF), you can push incrementally:

```bash
# Push just the main branch history
git push origin main
```

If GitHub rejects it, you may need to use `git filter-repo` or BFG Repo-Cleaner to purge large historical blobs. But for now, the immediate fix is stopping the tracking of `.venv` and generated outputs.

---

## Alternative: Nuclear Option (Only If Push Is Still Blocked)

If GitHub still rejects the push because the `.git` history itself is too large (due to the PDF or session log being committed in the past), you have two options:

1. **Use Git LFS** for the PDF and large JSON logs:
   ```bash
   git lfs track "*.pdf"
   git lfs track "AI-session-log-*.json"
   ```

2. **Rewrite history** to remove the large blobs using [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/):
   ```bash
   java -jar bfg.jar --strip-blobs-bigger-than 5M
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

> ⚠️ **Warning:** History rewriting changes commit hashes. Only do this if you are the sole contributor or have coordinated with your team.

---

## Bottom Line

**The repository isn't too big because of our code changes.** It's too big because Python dependencies and generated artifacts were accidentally committed. Untrack them, add `.gitignore`, and push again. The actual source code is tiny.
