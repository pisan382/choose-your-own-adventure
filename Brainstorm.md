# Brainstorm – Choose Your Own Adventure Authoring Tool

## Project Summary

Build a web-based tool with two modes:

1. **Author Mode** – Create and manage branching CYOA stories (nodes, choices, graph visualization), then publish for readers
2. **Reader Mode** – Browse available published stories and play through them by making choices at each branch point

The existing repo already has "The Cave of Time" extracted into text pages + a Mermaid story graph. We need to convert that into the JSON format, pre-load it as a demo story, and build the full web experience.

---

## Finalized User Flow

### Landing Page
- Title: **"Choose Your Own Adventure"**
- Two buttons: **[Author]** and **[Reader]**

### Author Flow
1. Author clicks **[Author]**
2. Presented with two options:
   - **[Upload JSON]** — upload an existing story JSON file → opens in graph editor for continued editing
   - **[Create]** — start a new story from scratch → opens blank graph editor
3. In the graph editor, author builds/edits the story by interacting with the graph:
   - Click a node to edit its text and choices
   - Add new nodes and connect them with edges
   - Delete nodes or choices
4. When satisfied, author clicks **[Publish]** → story is saved and becomes available in the Reader story list

### Reader Flow
1. Reader clicks **[Reader]**
2. Sees a **list of available published stories** to choose from (Cave of Time pre-loaded)
3. Selects a story → plays through it:
   - Story text displayed at each node
   - Choice buttons to navigate branches
   - **[Go Back]** button (history stack)
   - **[Restart]** button
   - "The End" screen at terminal nodes with restart option

---

## Key Design Decisions

### Tech Stack (Recommended)

- **React + Vite** – fast setup, component-based, easy to split work across team members
- **React Flow or Cytoscape.js** – interactive graph visualization for the story map
- **Tailwind CSS** – rapid styling without writing custom CSS
- **Deployment**: Netlify (drag-and-drop deploy) or GitHub Pages (via `gh-pages` branch)

### Data Format

- All story data stored as **JSON** — no backend required
- Each story is a JSON file with nodes (story segments) and edges (choices)
- Example structure:

```json
{
  "title": "The Cave of Time",
  "startNode": "page-2",
  "nodes": {
    "page-2": {
      "text": "You've hiked through Snake Canyon once before...",
      "choices": [
        { "text": "Start back home", "target": "page-4" },
        { "text": "Wait until morning", "target": "page-5" }
      ]
    }
  }
}
```

- The existing `cot-pages-ocr-v2/` text files + `cot-story-graph.mmd` will be converted to this format with a script

### Story Storage (No Backend)

- Published stories saved to **localStorage** in the browser
- "The Cave of Time" bundled as a static JSON file and pre-loaded on first visit
- Authors can also **export** their story as a `.json` file to share or re-upload later

### No Backend Needed

- Author mode: edit story JSON in browser, export/import as `.json` files
- Reader mode: load JSON from localStorage and navigate through it
- This keeps deployment dead simple (static site)

---

## Feature Ideas

### MVP (Must Have)

- [ ] Landing page with [Author] and [Reader] buttons
- [ ] Reader: story list showing all available/published stories
- [ ] Reader: display story text, show choice buttons, navigate the story
- [ ] Reader: "restart" and "go back" buttons
- [ ] Reader: "The End" message with restart option at terminal nodes
- [ ] Author: [Upload JSON] option — load existing story into graph editor
- [ ] Author: [Create] option — blank graph editor to build from scratch
- [ ] Author: graph editor — add/edit/delete nodes and choices interactively
- [ ] Author: [Publish] button — saves story to available stories list
- [ ] Author: export story as JSON file
- [ ] Pre-load "The Cave of Time" as the demo story
- [ ] Deploy to public URL

### Nice to Have (If Time Allows)

- [ ] Author: highlight unfinished nodes (nodes with no choices = dead ends)
- [ ] Author: highlight orphaned nodes (not reachable from start)
- [ ] Author: drag-and-drop graph layout
- [ ] Reader: story progress tracker / breadcrumbs
- [ ] Reader: "show all endings" summary
- [ ] Author: color-code terminal vs. branch vs. merge nodes
- [ ] Dark mode toggle

### Stretch Goals

- [ ] AI-assisted story generation (use Claude API to suggest continuations)
- [ ] Collaborative editing (would need a backend)
- [ ] Audio narration
- [ ] Animated transitions between story pages

---

## How to Split Work (3 Team Members)

### Option A – By Feature

- **Person 1**: Reader mode (story list, story display, navigation, UI)
- **Person 2**: Author mode (graph editor, node CRUD, upload/export, publish)
- **Person 3**: Landing page + data layer (JSON schema, conversion script, localStorage, deployment)

### Option B – By Layer

- **Person 1**: Data layer (JSON schema, conversion script, localStorage state management)
- **Person 2**: UI/UX (components, styling, layout, responsive design)
- **Person 3**: Graph visualization + integration + deployment

### Key Coordination Rule

Everyone works on separate files/components to minimize merge conflicts. Use feature branches and pull requests.

---

## Architecture Overview

```
src/
├── components/
│   ├── Landing/
│   │   └── LandingPage.jsx       # "Choose Your Own Adventure" + [Author] [Reader] buttons
│   ├── Reader/
│   │   ├── StoryList.jsx         # List of available published stories
│   │   ├── StoryReader.jsx       # Main reader view
│   │   ├── StoryNode.jsx         # Displays text + choices
│   │   └── ChoiceButton.jsx      # Individual choice button
│   ├── Author/
│   │   ├── AuthorHome.jsx        # [Upload JSON] and [Create] options
│   │   ├── GraphEditor.jsx       # Interactive graph editor (main author workspace)
│   │   ├── NodeEditor.jsx        # Edit a single node's text and choices
│   │   └── ImportExport.jsx      # Upload JSON / Export JSON / Publish
│   ├── Graph/
│   │   └── StoryGraph.jsx        # Shared graph visualization component
│   └── Layout/
│       └── App.jsx               # Root component + routing
├── data/
│   └── cave-of-time.json         # Pre-loaded demo story
├── utils/
│   ├── storyHelpers.js           # Validation, graph analysis helpers
│   └── storage.js                # localStorage read/write helpers
└── main.jsx
```

---

## Open Questions — Resolved

- Authors can create stories **from scratch** (not just edit existing ones) ✅
- Reader does **not** show a mini-map (keeps things simpler) ✅
- Cave of Time OCR data is already clean enough to use as-is ✅
- Uploaded JSON opens in the **graph editor** for continued editing ✅
- Published stories stored in **localStorage**, pre-loaded story bundled as static JSON ✅
