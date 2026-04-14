/** Find all nodes reachable from startNode */
export function findReachable(story) {
  if (!story?.nodes || !story?.startNode) return new Set()
  const visited = new Set()
  const queue = [story.startNode]
  while (queue.length) {
    const id = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    const node = story.nodes[id]
    if (node?.choices) {
      for (const c of node.choices) {
        if (story.nodes[c.target] && !visited.has(c.target)) {
          queue.push(c.target)
        }
      }
    }
  }
  return visited
}

/** Find ending nodes (no choices or marked isEnding) */
export function findEndings(story) {
  if (!story?.nodes) return []
  return Object.entries(story.nodes)
    .filter(([, n]) => n.isEnding || !n.choices?.length)
    .map(([id]) => id)
}

/** Find orphaned nodes (exist but not reachable from start) */
export function findOrphans(story) {
  const reachable = findReachable(story)
  return Object.keys(story.nodes).filter(id => !reachable.has(id))
}

/** Find dead-end nodes (not endings, have no outgoing choices, but aren't intentional endings) */
export function findDeadEnds(story) {
  if (!story?.nodes) return []
  return Object.entries(story.nodes)
    .filter(([, n]) => !n.isEnding && (!n.choices || n.choices.length === 0))
    .map(([id]) => id)
}

/** Validate story structure, return array of warnings */
export function validateStory(story) {
  const warnings = []
  if (!story?.title) warnings.push('Story has no title')
  if (!story?.startNode) warnings.push('Story has no start node')
  if (!story?.nodes || Object.keys(story.nodes).length === 0) {
    warnings.push('Story has no nodes')
    return warnings
  }
  if (!story.nodes[story.startNode]) {
    warnings.push(`Start node "${story.startNode}" does not exist`)
  }
  // Check for broken links
  for (const [id, node] of Object.entries(story.nodes)) {
    if (node.choices) {
      for (const c of node.choices) {
        if (!story.nodes[c.target]) {
          warnings.push(`Node "${id}" links to missing node "${c.target}"`)
        }
      }
    }
  }
  const orphans = findOrphans(story)
  if (orphans.length) {
    warnings.push(`${orphans.length} orphaned node(s): ${orphans.slice(0, 5).join(', ')}${orphans.length > 5 ? '...' : ''}`)
  }
  return warnings
}

/** Create an empty story template */
export function createEmptyStory(title = 'Untitled Story') {
  const startId = 'start'
  return {
    title,
    author: '',
    startNode: startId,
    nodes: {
      [startId]: {
        title: 'Beginning',
        text: 'Your story begins here...',
        choices: [],
        isEnding: false,
      },
    },
  }
}
