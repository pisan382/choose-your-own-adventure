import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchBooks, fetchGraph, type BookSummary, type Graph } from '../lib/data'
import { BookHeader } from './BookOverview'

export default function BookGraph() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<BookSummary | null>(null)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [svgText, setSvgText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    Promise.all([
      fetchBooks(),
      fetchGraph(slug),
      fetch(`/data/${slug}/graph.svg`).then((r) =>
        r.ok ? r.text() : Promise.reject(new Error(`svg: ${r.status}`)),
      ),
    ])
      .then(([books, g, svg]) => {
        if (cancelled) return
        const b = books.find((x) => x.slug === slug)
        if (!b) {
          setError('Book not found')
          return
        }
        setBook(b)
        setGraph(g)
        setSvgText(svg)
      })
      .catch((e) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [slug])

  // Wire up click handlers on SVG <text> labels (each shows a page number)
  useEffect(() => {
    if (!svgContainerRef.current || !slug) return
    const root = svgContainerRef.current.querySelector('svg')
    if (!root) return
    root.setAttribute('style', 'max-width: 100%; height: auto;')

    const handlers: Array<() => void> = []
    root.querySelectorAll('text').forEach((t) => {
      const content = (t.textContent || '').trim()
      const n = parseInt(content, 10)
      if (!Number.isFinite(n)) return
      const x = parseFloat(t.getAttribute('x') || '0')
      const y = parseFloat(t.getAttribute('y') || '0')
      const go = () => navigate(`/b/${slug}/read/${n}`)
      t.setAttribute('cursor', 'pointer')
      t.classList.add('graph-clickable')
      t.addEventListener('click', go)
      handlers.push(() => t.removeEventListener('click', go))
      // Pair with the rect whose center sits at roughly (x, y)
      root.querySelectorAll('rect').forEach((r) => {
        const rx = parseFloat(r.getAttribute('x') || '0')
        const ry = parseFloat(r.getAttribute('y') || '0')
        const rw = parseFloat(r.getAttribute('width') || '0')
        const rh = parseFloat(r.getAttribute('height') || '0')
        if (
          Math.abs(rx + rw / 2 - x) < 2 &&
          Math.abs(ry + rh / 2 + 4 - y) < 8
        ) {
          r.setAttribute('cursor', 'pointer')
          r.classList.add('graph-clickable')
          r.addEventListener('click', go)
          handlers.push(() => r.removeEventListener('click', go))
        }
      })
    })
    return () => handlers.forEach((fn) => fn())
  }, [svgText, slug, navigate])

  if (error) return <div className="container error">{error}</div>
  if (!book || !graph) return <div className="container loading">Loading…</div>

  const terminals = graph.nodes.filter((n) => n.is_terminal || n.choices.length === 0)
  const branching = graph.nodes.filter((n) => n.choices.length > 1)

  return (
    <div className="container graph-page">
      <BookHeader book={book} active="graph" />

      <div className="graph-intro">
        <p>
          {graph.nodes.length} pages · {branching.length} branching ·{' '}
          {terminals.length} endings. Blue highlights the main trunk from page{' '}
          {graph.start_page}. Red boxes are endings. Click any node to jump to
          that page.
        </p>
      </div>

      <div className="graph-wrap">
        <div
          ref={svgContainerRef}
          className="graph-svg"
          // The SVG is produced by our own renderer, not user input; safe to inline.
          dangerouslySetInnerHTML={{ __html: svgText }}
        />
      </div>

      <div className="graph-details">
        <section>
          <h3>Branching pages</h3>
          <div className="chip-list">
            {branching.map((n) => (
              <Link key={n.id} to={`/b/${slug}/read/${n.id}`} className="chip">
                {n.id}
              </Link>
            ))}
            {branching.length === 0 && <span className="muted">None</span>}
          </div>
        </section>
        <section>
          <h3>Endings</h3>
          <div className="chip-list">
            {terminals.map((n) => (
              <Link
                key={n.id}
                to={`/b/${slug}/read/${n.id}`}
                className="chip chip-end"
              >
                {n.id}
              </Link>
            ))}
            {terminals.length === 0 && <span className="muted">None</span>}
          </div>
        </section>
      </div>
    </div>
  )
}
