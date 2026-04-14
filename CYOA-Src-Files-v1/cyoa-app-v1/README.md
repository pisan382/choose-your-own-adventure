# Choose Your Own Adventure — Authoring & Reading Tool

A web-based tool for creating and playing branching "Choose Your Own Adventure" stories. Built with React, React Flow, and Vite.

## Deployed Website

> **URL**: _(add your deployed URL here after deploying)_

## GitHub Repository

> **URL**: _(add your GitHub repo URL here)_

## Team Members

- _(add names here)_

---

## Features

### Reader Mode
- Browse a library of published stories
- Read through branching narratives by making choices
- Go back, restart, or exit at any time
- "The End" screen at terminal nodes with step count

### Author Mode
- Create new stories from scratch or upload existing JSON files
- Interactive graph editor powered by React Flow
- Click any node to edit its text and choices
- Add/delete nodes and connections
- Color-coded graph: green (start), red (endings), yellow (orphaned nodes)
- Export stories as JSON for sharing or backup

### Demo Story
- "The Cave of Time" by Edward Packard is pre-loaded with 109 story nodes, 69 decision points, and 40 different endings

## Tech Stack

- **React 19** + **Vite** — fast development and builds
- **React Flow** (`@xyflow/react`) — interactive node graph visualization
- **Dagre** — automatic graph layout algorithm
- **Tailwind CSS** — utility styling
- **localStorage** — client-side story persistence (no backend required)
- **React Router** — client-side routing with HashRouter (GitHub Pages compatible)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The production build outputs to `dist/` — deploy this folder to any static host.

## Deployment

### Netlify (easiest)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `dist/` folder onto the page
3. Done — you'll get a public URL

### GitHub Pages
1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to package.json scripts: `"deploy": "npm run build && npx gh-pages -d dist"`
3. Run: `npm run deploy`

## Project Structure

```
src/
├── components/
│   ├── Landing/LandingPage.jsx    # Home page with Author/Reader choice
│   ├── Reader/
│   │   ├── StoryList.jsx          # Browse available stories
│   │   └── StoryReader.jsx        # Play through a story
│   └── Author/
│       ├── AuthorHome.jsx         # Create new / upload / manage stories
│       ├── GraphEditor.jsx        # Interactive graph editor workspace
│       └── NodeEditor.jsx         # Edit a single node's text & choices
├── data/
│   └── cave-of-time.json         # Pre-loaded demo story (109 nodes)
├── utils/
│   ├── storage.js                # localStorage read/write helpers
│   └── storyHelpers.js           # Validation, reachability, analysis
├── App.jsx                       # Routes and navbar
├── main.jsx                      # Entry point
└── index.css                     # Theme and global styles
```

## Story JSON Format

```json
{
  "title": "My Story",
  "author": "Author Name",
  "startNode": "start",
  "nodes": {
    "start": {
      "title": "The Beginning",
      "text": "You find yourself at a crossroads...",
      "choices": [
        { "text": "Go left", "target": "left-path" },
        { "text": "Go right", "target": "right-path" }
      ],
      "isEnding": false
    }
  }
}
```

---

CSS 382 — Choose Your Own Adventure Group Project
