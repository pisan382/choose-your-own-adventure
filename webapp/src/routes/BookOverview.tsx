import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchBooks, type BookSummary } from '../lib/data'

export default function BookOverview() {
  const { slug } = useParams<{ slug: string }>()
  const [book, setBook] = useState<BookSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBooks()
      .then((bs) => {
        const b = bs.find((x) => x.slug === slug)
        if (!b) setError('Book not found')
        else setBook(b)
      })
      .catch((e) => setError(String(e)))
  }, [slug])

  if (error) return <div className="container error">{error}</div>
  if (!book) return <div className="container loading">Loading…</div>

  return (
    <div className="container">
      <BookHeader book={book} active="overview" />
      <div className="overview-grid">
        <Stat label="Pages extracted" value={book.pages} />
        <Stat label="Graph edges" value={book.edges} />
        <Stat label="Branching pages" value={book.branching_pages} />
        <Stat label="Endings" value={book.terminals} />
        <Stat
          label="Enumerated paths"
          value={book.stories}
          hint={
            book.stories > 1
              ? 'bounded by 20 decision points'
              : book.branching_pages === 0
                ? 'linear book, single path'
                : undefined
          }
        />
        <Stat
          label="Start page"
          value={book.start_page ?? '—'}
          hint={
            book.start_page != null
              ? `The story opens at page ${book.start_page}`
              : undefined
          }
        />
      </div>

      <section className="overview-actions">
        <Link
          to={`/b/${book.slug}/read${
            book.start_page != null ? `/${book.start_page}` : ''
          }`}
          className="btn btn-primary"
        >
          Start reading
        </Link>
        {book.branching_pages > 0 && (
          <>
            <Link to={`/b/${book.slug}/graph`} className="btn">
              View story graph
            </Link>
            <Link to={`/b/${book.slug}/endings`} className="btn">
              All endings ({book.stories})
            </Link>
          </>
        )}
      </section>

      <section className="overview-source">
        <h3>Source</h3>
        <p className="muted">
          Extracted from <code>samples/{book.source_pdf}</code>. Format tag:{' '}
          <code>{book.format}</code>, reference style:{' '}
          <code>{book.reference_style}</code>.
        </p>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function BookHeader({
  book,
  active,
}: {
  book: { slug: string; title: string; branching_pages: number; start_page: number | null }
  active: 'overview' | 'read' | 'graph' | 'endings'
}) {
  const branches = book.branching_pages > 0
  return (
    <div className="book-header">
      <Link to="/" className="backlink">
        ← All books
      </Link>
      <h1>{book.title}</h1>
      <nav className="book-tabs">
        <TabLink to={`/b/${book.slug}`} active={active === 'overview'}>
          Overview
        </TabLink>
        <TabLink
          to={`/b/${book.slug}/read${
            book.start_page != null ? `/${book.start_page}` : ''
          }`}
          active={active === 'read'}
        >
          Read
        </TabLink>
        {branches && (
          <>
            <TabLink
              to={`/b/${book.slug}/graph`}
              active={active === 'graph'}
            >
              Graph
            </TabLink>
            <TabLink
              to={`/b/${book.slug}/endings`}
              active={active === 'endings'}
            >
              Endings
            </TabLink>
          </>
        )}
      </nav>
    </div>
  )
}

function TabLink({
  to,
  active,
  children,
}: {
  to: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link to={to} className={`book-tab ${active ? 'is-active' : ''}`}>
      {children}
    </Link>
  )
}
