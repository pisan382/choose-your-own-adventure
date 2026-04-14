# Backend Integration Guide for Person A

## Overview

Person B has completed a fully functional, accessible frontend with mock data. Your job is to:
1. Create the Netlify Functions API endpoints
2. Integrate with Firestore
3. Parse story text into pages
4. Connect to the existing frontend

All the API code structure is ready in `src/services/api.js` - you just need to implement the backend!

---

## Current Mock Data Setup

The frontend currently uses **mock data** for everything. Here's where:

### 1. Home Page (Story List)
**File:** `src/components/StoryList.jsx`
**Lines:** ~40-60 (inside `loadStories` function)

Current mock data:
```javascript
const mockStories = [
  {
    id: '1',
    title: 'The Cave of Time',
    author: 'Choose Your Own Adventure',
    description: 'A mysterious cave holds secrets from the past...',
    status: 'published',
    createdAt: new Date().toISOString(),
    pageCount: 4
  },
  // ... more stories
]
```

### 2. Read Page (Single Story)
**File:** `src/pages/Read.jsx`
**Lines:** ~20-60 (inside `loadStory` function)

Current mock data:
```javascript
const mockStory = {
  id,
  title: 'The Cave of Time',
  author: 'Choose Your Own Adventure',
  pages: [
    { id: 1, content: '...', choices: [...] },
    // ... more pages
  ]
}
```

### 3. Author Form (Create Story)
**File:** `src/components/AuthorForm.jsx`
**Lines:** ~24-42 (in submit handler)

Currently just shows success message.

---

## API Client Structure

**File:** `src/services/api.js`

This is where ALL API calls are defined:

```javascript
export const storiesAPI = {
  getAll: async () => { ... },      // GET /api/stories
  getById: async (id) => { ... },   // GET /api/stories/:id
  create: async (storyData) => { }, // POST /api/stories
  update: async (id, storyData) => { }, // PUT /api/stories/:id
  delete: async (id) => { }         // DELETE /api/stories/:id
}
```

**To integrate:** Just update the function bodies to call the real API!

---

## Step 1: Create Netlify Functions

### Directory Structure
```
netlify/functions/
├── api/
│   ├── stories.js         # GET /api/stories, POST /api/stories
│   ├── stories-id.js      # GET/PUT/DELETE /api/stories/:id
│   └── ...
├── db/
│   └── firebase.js        # Firestore helpers
└── utils/
    └── parseStory.js      # Story parser
```

### Create `netlify/functions/api/stories.js`

```javascript
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

// Initialize Firebase
const firebaseConfig = {
  // Your Firebase config
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export const handler = async (event) => {
  const method = event.httpMethod
  const headers = {
    'Content-Type': 'application/json'
  }

  try {
    if (method === 'GET') {
      // GET /api/stories - Return all stories
      const storiesRef = collection(db, 'stories')
      const snapshot = await getDocs(storiesRef)
      const stories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stories)
      }
    }

    if (method === 'POST') {
      // POST /api/stories - Create new story
      const body = JSON.parse(event.body)
      const storyData = {
        title: body.title,
        author: body.author,
        content: body.content,
        pages: parseStory(body.content),
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'stories'), storyData)
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          id: docRef.id,
          ...storyData
        })
      }
    }

    return {
      statusCode: 405,
      body: 'Method not allowed'
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
```

### Create `netlify/functions/api/stories-id.js`

```javascript
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

// Initialize Firebase (same config as above)
const firebaseConfig = { /* ... */ }
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export const handler = async (event, context) => {
  const { id } = event.queryStringParameters
  const method = event.httpMethod
  const headers = { 'Content-Type': 'application/json' }

  try {
    if (method === 'GET') {
      // GET /api/stories/:id
      const docRef = doc(db, 'stories', id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Story not found' })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: docSnap.id,
          ...docSnap.data()
        })
      }
    }

    if (method === 'PUT') {
      // PUT /api/stories/:id
      const body = JSON.parse(event.body)
      const docRef = doc(db, 'stories', id)
      
      await updateDoc(docRef, {
        ...body,
        updatedAt: serverTimestamp()
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ id, ...body })
      }
    }

    if (method === 'DELETE') {
      // DELETE /api/stories/:id
      const docRef = doc(db, 'stories', id)
      await deleteDoc(docRef)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Story deleted' })
      }
    }

    return {
      statusCode: 405,
      body: 'Method not allowed'
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
```

---

## Step 2: Create Story Parser

**File:** `netlify/functions/utils/parseStory.js`

This converts story text into pages and choices:

```javascript
export function parseStory(content) {
  // Parse story text into pages
  // Example format:
  // Page 1: You enter the cave.
  // Choice A: Go left → Page 2
  // Choice B: Go right → Page 3
  
  const pages = []
  const pageRegex = /^Page (\d+):(.*?)(?=^Page \d+:|$)/gms
  
  let match
  while ((match = pageRegex.exec(content)) !== null) {
    const pageNum = parseInt(match[1])
    const pageContent = match[2].trim()
    
    // Extract choices (look for "→" or "->" pattern)
    const choiceRegex = /Choice [A-Z]:\s*(.+?)\s*→\s*Page (\d+)/g
    const choices = []
    let choiceMatch
    
    while ((choiceMatch = choiceRegex.exec(pageContent)) !== null) {
      choices.push({
        text: choiceMatch[1],
        next: parseInt(choiceMatch[2])
      })
    }
    
    pages.push({
      id: pageNum,
      content: pageContent.replace(choiceRegex, '').trim(),
      choices
    })
  }
  
  return pages
}
```

---

## Step 3: Update Frontend API Client

**File:** `src/services/api.js`

Replace the stub implementations with real API calls:

### Before (Stub):
```javascript
getAll: async () => {
  try {
    const { data } = await apiClient.get('/api/stories')
    return data
  } catch (error) {
    throw error
  }
}
```

### After (Real):
```javascript
getAll: async () => {
  try {
    const { data } = await apiClient.get('/api/stories')
    return data
  } catch (error) {
    throw error
  }
}
// Same code! The endpoint is already configured in apiClient
```

The good news: **No changes needed!** Just deploy your backend and it will work!

---

## Step 4: Remove Mock Data

Once backend is ready, remove mock data from:

### 1. `src/components/StoryList.jsx`
**Remove lines ~40-60:**
```javascript
// Remove this:
const mockStories = [...]
setStories(mockStories)

// And add:
await fetchStories()  // Uses real API
```

### 2. `src/pages/Read.jsx`
**Replace lines ~20-60:**
```javascript
// Replace mock data with real fetch:
useEffect(() => {
  fetchStory()
}, [id])

const { story, loading, error, fetchStory } = useStory(id)
```

### 3. `src/components/AuthorForm.jsx`
**Replace submit handler:**
```javascript
// Replace mock success with:
const response = await storiesAPI.create(values)
navigate(`/read/${response.id}`)
```

---

## Environment Variables

Create `.env.local`:
```
VITE_API_BASE_URL=http://localhost:8888/.netlify/functions
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
```

In `src/services/api.js`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
```

---

## Testing Your Backend

### 1. Test with `curl`:
```bash
# Get all stories
curl http://localhost:8888/.netlify/functions/api/stories

# Create story
curl -X POST http://localhost:8888/.netlify/functions/api/stories \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Story",
    "author": "Author Name",
    "content": "Story content..."
  }'

# Get single story
curl http://localhost:8888/.netlify/functions/api/stories/story-id

# Update story
curl -X PUT http://localhost:8888/.netlify/functions/api/stories/story-id \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Delete story
curl -X DELETE http://localhost:8888/.netlify/functions/api/stories/story-id
```

### 2. Test with Frontend:
```bash
# Start frontend dev server
npm run dev

# Should see real data from backend
# Test Create Story flow
# Test Read Story flow
```

---

## Debugging Tips

### 1. Check Network Requests
```
Browser DevTools → Network tab → Look for /api/ requests
Check Status (200, 404, 500) and Response body
```

### 2. Check Netlify Function Logs
```bash
netlify logs functions
```

### 3. Check Firestore Console
```
Firebase Console → Firestore Database → Collections
Verify data is being stored correctly
```

### 4. Check Frontend Console
```
Browser DevTools → Console tab
Look for API error messages
```

---

## Deployment Checklist

- [ ] Backend functions created in `netlify/functions/`
- [ ] Firestore configured and authenticated
- [ ] Story parser working correctly
- [ ] API endpoints tested with curl
- [ ] Frontend API URLs updated
- [ ] Environment variables set
- [ ] Mock data removed from components
- [ ] Frontend calls real API
- [ ] Error messages shown to user
- [ ] Loading states appear
- [ ] Can create story
- [ ] Can read story
- [ ] Can list stories
- [ ] Can update story (optional)
- [ ] Can delete story (optional)

---

## Common Issues & Solutions

### ❌ CORS errors
**Solution:** Add CORS headers in function response:
```javascript
headers: {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type'
}
```

### ❌ Firestore auth errors
**Solution:** 
- Check Firebase config is correct
- Verify Firestore security rules allow reads/writes
- Check Firebase credentials in environment

### ❌ API not found (404)
**Solution:**
- Check API URL in `src/services/api.js`
- Verify Netlify functions path
- Check netlify.toml configuration

### ❌ Story parsing not working
**Solution:**
- Review text format expected by parser
- Add console.logs in parseStory function
- Test with simple example first

---

## File Locations Quick Reference

| What | Where |
|------|-------|
| API calls | `src/services/api.js` |
| Custom hooks | `src/services/hooks.js` |
| StoryList (fetches stories) | `src/components/StoryList.jsx` |
| AuthorForm (creates story) | `src/components/AuthorForm.jsx` |
| Read page (gets single story) | `src/pages/Read.jsx` |
| Backend functions | `netlify/functions/` |
| Environment variables | `.env.local` |

---

## Resources

- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Firestore Database](https://firebase.google.com/docs/firestore)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## Questions?

Check the existing code:
- `src/services/api.js` - Already has API structure ready
- `src/components/StoryList.jsx` - Shows how to call API
- `src/components/AuthorForm.jsx` - Shows form submission
- `src/pages/Read.jsx` - Shows story fetching

Good luck! The frontend is ready to rock! 🚀
