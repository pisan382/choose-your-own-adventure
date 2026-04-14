# CYOA Web App - One-Day Development Plan (2 People + AI)

## Overview
Build a **minimum viable** Choose-Your-Own-Adventure web app in under 24 hours using AI for code generation. Deploy on Netlify using serverless architecture and existing Python scripts from Codebase.md.

**Timeline**: 8-12 hours of focused development

---

## Module Assignment (Fair Split)

### **Person A: Backend + Reader** (Independent, no blocking)
- Netlify Functions API to wrap existing Python scripts
- Firestore integration for story storage
- Story Reader component (simple, interactive)
- **Est. 4-5 hours**

### **Person B: Authoring UI + Landing Page** (Independent, can stub API calls)
- Basic story authoring form
- Story list/browse page
- Landing page
- **Est. 3-4 hours**

**Both**: Testing & deployment (~1-2 hours shared)

---

## Technology Stack (Constraints for Speed)

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | React (Vite) | Fast startup, hot reload |
| **Styling** | Tailwind CSS | No build step, quick UX |
| **Backend** | Netlify Functions (Node.js) | Zero-config deployment |
| **Database** | Firestore | Free tier, auto-scaling, JSON-friendly |
| **Deployment** | Netlify | Git push → live in <1 min |
| **AI Assistance** | GitHub Copilot | Generate 70% of boilerplate |

---

## Phased Timeline

### **Phase 0: Setup (30 min - Both)**
**Time: 0:00-0:30**

- [ ] Create GitHub repo
- [ ] Run `npm create vite@latest cyoa-app -- --template react`
- [ ] Install dependencies: `npm install tailwindcss axios react-router-dom`
- [ ] Create `/netlify/functions/` directory for backend
- [ ] Set up Firestore project (use emulator for local dev)
- [ ] Create `.env.local` with Firestore config
- [ ] Set up `netlify.toml` for builds & functions

**Deliverables**:
- GitHub repo with React + Netlify Functions scaffold
- `npm run dev` works locally
- `netlify dev` starts function server

**AI Use**: Copilot generates scaffolding code, netlify.toml config

---

### **Phase 1a: Person A - Backend API (Parallel, 2 hours)**
**Time: 0:30-2:30**

**Module 1: Wrap Existing Python Scripts**

1. **Create Netlify Function: `/netlify/functions/api/build-graph.js`**
   - Accepts: story pages as JSON
   - Calls: Python `build_story_graph.py` (spawn subprocess or REST call)
   - Returns: Graph structure as JSON

   ```javascript
   // Pseudocode structure
   exports.handler = async (event) => {
     const pages = JSON.parse(event.body);
     const graph = await buildGraphFromPages(pages);
     return { statusCode: 200, body: JSON.stringify(graph) };
   };
   ```

2. **Create Netlify Function: `/netlify/functions/api/write-stories.js`**
   - Accepts: graph JSON
   - Returns: All possible story paths

3. **Create Netlify Function: `/netlify/functions/api/stories.js`**
   - `GET /stories` - List all stories
   - `POST /stories` - Create story
   - `GET /stories/:id` - Fetch story with pages & choices
   - Uses Firestore

**Module 2: Firestore Integration (Simplified)**

1. **Create `/src/firebase.js`**
   - Initialize Firestore
   - Export db connection

2. **Create `/netlify/functions/db/stories.js`** (Database helpers)
   ```javascript
   // Save story to Firestore
   async function saveStory(storyData) {
     return db.collection('stories').add(storyData);
   }
   
   // Fetch story
   async function getStory(id) {
     return db.collection('stories').doc(id).get();
   }
   ```

3. **Firestore Schema (Flat for speed)**:
   ```json
   stories/{storyId}
   ├── title: "The Cave of Time"
   ├── author: "Name"
   ├── content: "Full story text with choices"
   ├── status: "draft" | "published"
   ├── createdAt: timestamp
   └── graph: { nodes: [...], edges: [...] }
   ```

**Module 4: Story Reader Component**

1. **Create `/src/components/Reader.jsx`**
   - Fetch story → Display page → Show choices → Click choice → Next page
   - ~50 lines of React
   - Handle terminal pages (no more choices)

**Deliverables**:
- 3 API endpoints working locally
- Firestore CRUD for stories
- Reader component renders correctly

**AI Use**: Copilot generates: Function stubs, Firestore queries, React hooks

---

### **Phase 1b: Person B - Frontend (Parallel, 2 hours)**
**Time: 0:30-2:30**

**Module 3: Story Authoring (Minimal)**

1. **Create `/src/components/AuthorForm.jsx`**
   - Form fields: Title, Author Name, Story Content (textarea)
   - Submit button → POST to `/api/stories`
   - Show success message with story ID

   ```jsx
   // Rough structure
   <form onSubmit={handleCreate}>
     <input name="title" />
     <input name="author" />
     <textarea name="content" />
     <button type="submit">Create</button>
   </form>
   ```

2. **Create `/src/components/StoryList.jsx`**
   - Fetch stories from `/api/stories`
   - List with links to "Read" or "Edit"
   - Very basic table or cards

**Module 5: Visualization (Simplified)**

1. **Create `/src/components/SimpleGraph.jsx`**
   - Accept graph JSON
   - Render as box-and-arrow diagram using HTML/CSS or simple Canvas
   - Click node → show page content
   - **Skip D3.js**: Too slow to learn in 2 hours
   - Use simple HTML divs styled as boxes with CSS flexbox

       ```jsx
       // Simple graph: list of choices in steps
       {graph.nodes.map(node => (
         <div className="node" key={node.id}>
           Page {node.id}
         </div>
       ))}
       ```

**Module 3 Integration**:

3. **Create `/src/components/EditorPage.jsx`** (One-page editor)
   - Load story from Firestore
   - Textarea to edit content
   - Button to extract choices & regenerate graph
   - Show graph alongside editor
   - Save button

**Deliverables**:
- Author form working (can create story locally with stubbed API)
- Story list showing dummy data
- Simple graph rendering

**AI Use**: Copilot generates: React form components, CSS layouts, list rendering

---

### **Phase 2: Integration (1 hour)**
**Time: 2:30-3:30**

**Both together (async)**

1. **Person A opens PRs**: API endpoints ready
2. **Person B updates API calls**: Remove stubs, use real endpoints
3. **Quick test**:
   - Create story via authoring form
   - Verify it appears in story list
   - Click "Read" → Reader component loads story
   - Click choice → navigate pages

4. **Fix any integration issues** (expected ~30 min of debugging)

**Deliverables**:
- Full workflow works end-to-end
- No stub data, all real

---

### **Phase 3: Deploy to Netlify (30 min)**
**Time: 3:30-4:00**

**Person A** (has deploy experience):
1. Push to GitHub
2. Connect repo to Netlify
3. Set environment variables in Netlify dashboard (Firestore config)
4. Trigger deploy → [auto-built and live](https://your-app.netlify.app)

**Verification**:
- Open deployed URL
- Create a story via web form
- Read it back
- Check that it persists

---

## Repository Structure (Minimal)

```
cyoa-app/
├── src/
│   ├── components/
│   │   ├── Reader.jsx          <- Person A
│   │   ├── AuthorForm.jsx      <- Person B
│   │   ├── StoryList.jsx       <- Person B
│   │   ├── Editor.jsx          <- Person B
│   │   └── SimpleGraph.jsx     <- Person B
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Read.jsx
│   │   └── Author.jsx
│   ├── App.jsx
│   ├── firebase.js             <- Person A
│   └── main.jsx
├── netlify/
│   └── functions/              <- Person A
│       ├── api/
│       │   ├── stories.js      (CRUD)
│       │   ├── build-graph.js  (Wraps Python)
│       │   └── write-stories.js (Wraps Python)
│       └── db/
│           └── index.js        (Firestore helpers)
├── public/
│   └── index.html
├── .env.local                  (Firestore config - git ignored)
├── .gitignore
├── netlify.toml
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## API Contracts (Minimal, Finalized After Phase 0)

```javascript
// GET /api/stories
{ stories: [{ id, title, author, status, createdAt }] }

// POST /api/stories
Request: { title, author, content }
Response: { id, ...metadata }

// GET /api/stories/:id
{ id, title, author, content, graph, status }

// PUT /api/stories/:id
Request: { title, author, content }
Response: { ...updated }

// DELETE /api/stories/:id
```

---

## Fairness Checklist

| Aspect | Assessment |
|--------|------------|
| **Effort** | Person A: 4-5 hrs (backend + reader), Person B: 3-4 hrs (UI) - **Fair** |
| **Complexity** | Person A: API/DB schema, Person B: React forms/layout - **Balanced** |
| **Blockers** | Person B can stub APIs → **No mutual blocking** |
| **Shipping** | Both see their code live in 4 hours - **Equal satisfaction** |
| **Learning** | A: Serverless/Firestore, B: React + CSS - **Different skills** |

---

## Critical Constraints & Workarounds

| Challenge | Solution |
|-----------|----------|
| Python scripts integration | Spawn Node subprocess OR pre-generate graph & load as static JSON |
| No time for D3.js | Use simple HTML boxes + CSS flexbox for graph |
| No user auth | Skip user accounts, allow public access (OK for MVP) |
| Firestore learning curve | Use console UI + Node SDK samples (Copilot generates queries) |
| CSS complexity | Use Tailwind classes only, no custom CSS |
| Test coverage | Skip unit tests, do manual E2E only |

---

## AI Usage Strategy

**GitHub Copilot** is your accelerator:

1. **Use for**: Function stubs, CRUD boilerplate, React components, CSS layouts, config files
2. **Do NOT use for**: Architecture decisions, API design, data model
3. **Review carefully**: Copilot can generate broken Firebase queries — always check

### Example prompts to use:
- "Create a Netlify Function that accepts JSON and returns a modified JSON response"
- "Write a React component that fetches data from `/api/stories` and renders a list"
- "Create a Firestore Collection called 'stories' with fields: title, author, content, createdAt"
- "Generate a simple HTML/CSS graph visualization using divs"

---

## Deployment Checklist

Before going live:

- [ ] GitHub repo created & pushed
- [ ] Netlify project created, connected to GitHub
- [ ] Environment variables set in Netlify dashboard:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_DATABASE_URL`
- [ ] `netlify.toml` configured with build & function paths
- [ ] Local test: `npm run dev` + `netlify dev` works
- [ ] Create test story via form
- [ ] Read story back ✓
- [ ] Commit & push to trigger Netlify deploy
- [ ] Verify live URL works

---

## Success Criteria (MVP)

By end of day:

1. ✅ Web app deployed on Netlify (public URL)
2. ✅ Can create a story via form
3. ✅ Can browse stories
4. ✅ Can read a story interactively (choose pages)
5. ✅ Data persists in Firestore
6. ✅ No manual database setup needed (Firestore configured)
7. ✅ Both team members contributed equally

---

## What's NOT in Scope (Day 1)

- User authentication
- Story editing/deletion UI
- Advanced graph visualization (D3.js)
- OCR integration or file uploads
- Test suite
- Mobile optimization (basic Tailwind responsive is OK)
- Analytics or metrics
- Accessibility audit

**These can be Phase 2** (future sprints)

---

## Kickoff Checklist

**Before coding starts**:

1. [ ] Both agree on this plan
2. [ ] GitHub repo created
3. [ ] Netlify project set up
4. [ ] Firestore project initialized
5. [ ] Both clone repo locally
6. [ ] Both run `npm install` and `netlify dev` to verify setup
7. [ ] Agree on branch strategy (e.g., `person-a/*`, `person-b/*`)
8. [ ] Set 2-hour check-in (mid-Phase 1) to sync progress

---

## Communication Protocol

**Async updates** (Slack/Discord):
- [0:30] "Setup done, starting backend"
- [1:30] "API endpoints done, testing locally"
- [2:30] "Ready to integrate, PR incoming"
- [3:00] "Deployed! ✨"

**If blocked**:
- Comment on PR immediately
- Sync briefly to unblock
- Resume async work

---

## Sample Workflow (Person A)

```bash
# 0:30 - Start
cd netlify/functions/api
# Create stories.js with CRUD endpoints
# (Copilot generates 80% of the code)

# 1:30 - Test locally
curl -X GET http://localhost:8888/.netlify/functions/api/stories

# 2:00 - Reader component
cd src/components
# Create Reader.jsx
# (Copilot generates React hooks, fetch calls)

# 3:00 - Commit & push
git push origin person-a/backend-reader

# 3:15 - Deploy
# Netlify auto-deploys on push
# Verify live: curl https://your-app.netlify.app/.netlify/functions/api/stories
```

---

## Sample Workflow (Person B)

```bash
# 0:30 - Start
cd src/components
# Create AuthorForm.jsx
# (Copilot generates form JSX, submit handler)

# 1:30 - List & Editor
# Create StoryList.jsx, SimpleGraph.jsx
# (Copilot generates fetch, map, CSS)

# 2:00 - Stub API calls with dummy data

# 2:30 - Wait for Person A's PR

# 3:00 - Update API calls, test integration
# Remove stubs, use real endpoints
# Commit & push

# 3:30 - Verify live
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Firestore emulator won't start | Use live Firestore (dev mode, secure after MVP) |
| Netlify Function can't access Firestore | Ensure env vars set in netlify.toml + dashboard |
| React component won't fetch data | Check CORS (Netlify Functions auto-allow) |
| Deploy fails | Check `netlify.toml` build command matches `package.json` |
| Graph won't render | Inspect browser console for JS errors; use simple div-based layout |

---

## After Day 1

**If successful**:
- [ ] Ship to production
- [ ] Share URL with stakeholders
- [ ] Collect feedback

**Future work** (Phase 2+):
- Proper user auth
- Story editing UI
- Advanced graph visualization
- File upload for stories
- Mobile app (React Native)
- OCR integration from original PDF

---

## Final Notes

- **Aggressive timeline** = accept technical debt (refactor later)
- **AI is your friend** = use Copilot generously, but review output
- **Communication is key** = sync on blockers immediately
- **Ship fast** = deploy often, iterate based on feedback

**Goal**: Live product by EOD. Quality improvements come next sprint.

**You've got this!** 🚀
