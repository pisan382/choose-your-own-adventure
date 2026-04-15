# CYOA Project - Brainstorm & Ideas

## Team
- Richie Chen
- Kevin Vo
- Yousuf Al-Bassyiouni

## What We're Building

A web tool where authors can create branching "Choose Your Own Adventure" stories.

The starting point is "The Cave of Time" - already extracted with 45 possible story paths. We need to build:
1. An interface for authors to write/upload story segments
2. A way to visualize how stories branch
3. A reader interface where people can click through the story

## Ideas & Thoughts

### Story Editor
- Simple text input for each story page
- Show which pages lead where
- Preview the story graph as you edit
- Easy way to add/remove branches
- **Kevin:** What if we had a card-based layout for each page? Like each story page is its own card with the text and choices?
- **Richie:** Yeah that could work. We could also show a mini graph preview so authors see how their branches connect
- **Yousuf:** Should we let them edit existing pages from The Cave of Time or start fresh with a new story?

### How Authors Work
- Upload story text in parts
- Pick what the next choices are (what pages come next)
- See what pages they've connected already
- Maybe drag-and-drop to rearrange?
- **Idea:** What if authors can just paste text and it auto-detects "choice" lines? Like "If you [choice1] go to page X, if [choice2] go to page Y"
- **Problem:** How do we handle OCR errors from the existing extraction? Need to fix text first probably
- **Note:** Should we have a test mode so authors can "play through" their story to make sure branches work?

### Reader Mode
- Just show the current page text
- Show the choices at the bottom
- Keep it simple - buttons to click
- Mobile friendly
- **Idea:** Add a progress tracker at the top? Like "Page 2 of 15 in this story"
- **Question:** Should we track which endings the reader has seen? Like a completion checklist?
- **Richie:** Or maybe show a little map/graph of where they've been vs where they haven't explored yet

### Technical Stuff to Figure Out
- Frontend framework? (React, Vue, or plain JS?)
  - **Yousuf:** React feels like overkill but it might be easier for managing complex branching state
  - **Kevin:** Vue is lighter weight and simpler to learn... but do we have time?
  - **Decision:** Maybe start with vanilla JS, keep it simple, can always upgrade later
- Where do we store the story data?
  - **Option 1:** JSON files in a folder (simple, easy to version control)
  - **Option 2:** Database like MongoDB (more robust but more setup)
  - **Richie:** JSON files for now, we can move to DB if we need to later
- How do we prevent infinite loops?
  - The Python scripts already handle this with a depth limit (20 decisions max)
  - We can use the same approach in the reader
- How do multiple people edit the same story?
  - **Problem:** Not priority for first version, but good to think about
  - **Idea:** Maybe just use git/GitHub for now? Each person on different branches?

## What Already Exists
- Story pages extracted from PDF (in output/cot-pages-ocr-v2/)
- Story graph showing all branches (cot-story-graph.svg)
- Python scripts to generate stories

## Random Ideas / Nice to Have
- **Richie:** What if we had stats shown at the end? Like "You reached 1 of 45 possible endings" or "This was the most popular ending"
- **Kevin:** Ooh, and maybe a share button? Like "I got the good ending, can you?"
- **Yousuf:** Haha would need to track which ending is which. But cool idea for later
- **Question:** Should we add sound effects? Or is that overkill?
- **Kevin:** Maybe just for the choices being clicked? Like a simple beep?
- **Discussion:** Let's keep it minimal for MVP - focus on story flow first, fancy stuff later

## What We Need to Figure Out ASAP
1. Do we start by building the reader or the editor first?
   - **Pro reader first:** Simpler to build, we have working story data already
   - **Pro editor first:** More "complete" product if we can author our own story
   - **Decision point:** Probably reader first, then build editor?
2. Do we use The Cave of Time data or create our own test story?
   - **Richie:** Let's use Cave of Time for the reader, build editor with a simple test story
3. UI mockups - need to sketch these out before coding
4. Database/file structure - how is story data organized?

## Division of Work (rough ideas)
- **Richie:** Frontend UI & reader interface
- **Kevin:** Story editor / author interface  
- **Yousuf:** Backend logic & data handling
- (Can all help each other obviously)

## Next Steps
- [ ] Finalize team (DONE)
- [ ] Decide what tech to use (vanilla JS, Node.js backend, JSON files)
- [ ] Sketch out UI mockups - reader first
- [ ] Create test story JSON structure
- [ ] Set up project repo locally & GitHub
- [ ] Start coding!
