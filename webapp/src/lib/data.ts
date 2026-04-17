export type BookFormat = 'cyoa' | 'linear' | 'ff'
export type ReferenceStyle = 'page' | 'section' | 'none'

export interface BookSummary {
  slug: string
  title: string
  format: BookFormat
  reference_style: ReferenceStyle
  source_pdf: string
  pages: number
  edges: number
  branching_pages: number
  terminals: number
  start_page: number | null
  stories: number
}

export interface Choice {
  target: number
  prompt: string
  raw: string
}

export interface Node {
  id: number
  label: string
  is_terminal: boolean
  chars: number
  choices: Choice[]
}

export interface Graph {
  slug: string
  title: string
  start_page: number | null
  reference_style: ReferenceStyle
  nodes: Node[]
  edges: { source: number; target: number; prompt: string }[]
}

export interface StoryEntry {
  file: string
  path: number[]
  end_reason: 'end' | 'cycle' | 'max-decisions'
  start_page: number
  end_page: number
  length: number
}

const DATA = '/data'

export async function fetchBooks(): Promise<BookSummary[]> {
  const r = await fetch(`${DATA}/books.json`)
  if (!r.ok) throw new Error(`books.json: ${r.status}`)
  return r.json()
}

export async function fetchGraph(slug: string): Promise<Graph> {
  const r = await fetch(`${DATA}/${slug}/graph.json`)
  if (!r.ok) throw new Error(`graph: ${r.status}`)
  return r.json()
}

export async function fetchPage(slug: string, page: number): Promise<string> {
  const padded = String(page).padStart(3, '0')
  const r = await fetch(`${DATA}/${slug}/pages/${padded}.txt`)
  if (!r.ok) throw new Error(`page ${page}: ${r.status}`)
  return r.text()
}

export async function fetchStories(slug: string): Promise<StoryEntry[]> {
  const r = await fetch(`${DATA}/${slug}/stories/manifest.json`)
  if (!r.ok) throw new Error(`stories: ${r.status}`)
  return r.json()
}

export function nodeById(graph: Graph, id: number): Node | undefined {
  return graph.nodes.find((n) => n.id === id)
}

/**
 * Page files have the form:
 *   Page 4
 *
 *   (body text ...)
 *
 * Strip the leading "Page N" header so the reader renders just the body.
 */
export function stripPageHeader(text: string): string {
  return text.replace(/^Page\s+\d+\s*\n+/, '').trimEnd()
}
