const STORIES_KEY = 'cyoa-stories'

export function getAllStories() {
  try {
    const raw = localStorage.getItem(STORIES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function getStory(id) {
  const stories = getAllStories()
  return stories[id] || null
}

export function saveStory(id, story) {
  const stories = getAllStories()
  stories[id] = story
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories))
}

export function deleteStory(id) {
  const stories = getAllStories()
  delete stories[id]
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories))
}

export function generateId() {
  return 'story-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function generateNodeId() {
  return 'node-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const VISITED_KEY = 'cyoa-visited'

export function getVisitedNodes(storyId) {
  try {
    const raw = localStorage.getItem(VISITED_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[storyId] || []
  } catch {
    return []
  }
}

export function mergeVisitedNodes(storyId, newIds) {
  try {
    const raw = localStorage.getItem(VISITED_KEY)
    const all = raw ? JSON.parse(raw) : {}
    const existing = new Set(all[storyId] || [])
    newIds.forEach(id => existing.add(id))
    all[storyId] = Array.from(existing)
    localStorage.setItem(VISITED_KEY, JSON.stringify(all))
    return all[storyId]
  } catch {
    return newIds
  }
}
