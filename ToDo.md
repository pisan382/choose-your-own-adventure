# ToDo – Choose Your Own Adventure Project

## Phase 0: Setup (Do First)
- [ ] Fork the repo and add all team members as contributors
- [ ] Set up React + Vite project: `npm create vite@latest cyoa-app -- --template react`
- [ ] Install dependencies: `npm install reactflow tailwindcss @tailwindcss/vite`
- [ ] Verify local dev server runs: `npm run dev`
- [ ] Write a conversion script to turn `cot-pages-ocr-v2/*.txt` + `cot-story-graph.mmd` into a single `cave-of-time.json`
- [ ] Commit and push initial project scaffold

## Phase 1: Landing Page
- [ ] Create `LandingPage` component with title "Choose Your Own Adventure"
- [ ] Add **[Author]** button → navigates to Author home
- [ ] Add **[Reader]** button → navigates to Reader story list
- [ ] Basic styling — visually striking, sets the tone for the app

## Phase 2: Reader Mode
- [ ] Create `StoryList` component — shows all available/published stories from localStorage + pre-loaded Cave of Time
- [ ] Create `StoryReader` component — displays current node's text
- [ ] Create `ChoiceButton` components — one per choice, navigates to target node on click
- [ ] Add **[Go Back]** button (maintain a history stack)
- [ ] Add **[Restart]** button
- [ ] Handle terminal nodes (no choices = "The End" message with restart option)
- [ ] Load `cave-of-time.json` as the default pre-loaded story
- [ ] Basic styling — readable text, clear buttons, centered layout

## Phase 3: Author Mode
- [ ] Create `AuthorHome` component with two options: **[Upload JSON]** and **[Create]**
- [ ] **[Upload JSON]**: file picker → parse JSON → open in graph editor
- [ ] **[Create]**: open blank graph editor with a single empty start node
- [ ] Create `GraphEditor` component — interactive graph for building/editing stories
  - [ ] Display nodes and edges visually
  - [ ] Click a node to open `NodeEditor` for that node
  - [ ] Add new node button
  - [ ] Connect nodes via edges (choices)
  - [ ] Delete node or choice
- [ ] Create `NodeEditor` component — edit node text and choices (add/remove/modify target)
- [ ] Add **[Publish]** button — saves current story to localStorage, makes it available in Reader
- [ ] Add **[Export JSON]** button — downloads story as `.json` file
- [ ] Add **[New Story]** button to discard and start over

## Phase 4: Graph Visualization
- [ ] Integrate React Flow (or Cytoscape.js) to render story graph
- [ ] Nodes display page/node ID and a snippet of text
- [ ] Edges show choice text labels
- [ ] Click a node to select it for editing (author mode) or jump to it (reader mode)
- [ ] Color-code: start node (green), terminal/ending nodes (red), normal nodes (default)
- [ ] Highlight current path in reader mode

## Phase 5: Data Layer
- [ ] Define final JSON schema for stories
- [ ] Write `storage.js` helpers: `saveStory()`, `loadStories()`, `deleteStory()`
- [ ] On app load: check localStorage, seed with `cave-of-time.json` if no stories exist
- [ ] Write conversion script: `cot-pages-ocr-v2/*.txt` + `cot-story-graph.mmd` → `cave-of-time.json`
- [ ] Validate imported JSON on upload (catch malformed files gracefully)

## Phase 6: Integration & Polish
- [ ] Connect Landing → Reader → StoryList → StoryReader flow
- [ ] Connect Landing → Author → AuthorHome → GraphEditor → Publish → Reader flow
- [ ] Shared state via React context (current story, history stack, mode)
- [ ] Responsive layout (works on mobile for reader, desktop for author)
- [ ] Error handling for malformed JSON imports
- [ ] Clean up OCR noise in the Cave of Time demo data if needed

## Phase 7: Deploy
- [ ] Build production bundle: `npm run build`
- [ ] Deploy to Netlify (connect GitHub repo) or GitHub Pages (`gh-pages` branch)
- [ ] Verify deployed URL works end-to-end (land → read a story → author a story → publish)
- [ ] Update README.md with:
  - [ ] Deployed website URL
  - [ ] GitHub repository URL
  - [ ] Team member names (optional)

## Phase 8: Documentation
- [ ] Update Codebase.md to describe the web app architecture
- [ ] Ensure all team members have commits visible on GitHub
- [ ] Final review and cleanup

---

## Assignment Checklist (from instructions)
- [ ] All team members added to Canvas CYOA group
- [ ] Repo forked, all members are contributors
- [ ] Read Fork-Instructions.md ✅
- [ ] Read AI-Instructions.md ✅
- [ ] Read Codebase.md ✅
- [ ] Brainstorm.md created ✅
- [ ] ToDo.md created ✅
- [ ] Project extended and deployed on public website
- [ ] All members have commits on GitHub
- [ ] README.md includes deployed URL + repo URL
