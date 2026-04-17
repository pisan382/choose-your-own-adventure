import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchBooks,
  fetchStories,
  type BookSummary,
  type StoryEntry,
} from '../lib/data'
import { BookHeader } from './BookOverview'

type SortKey = 'length' | 'endPage' | 'endReason'

export default function BookEndings() {
  const { slug } = useParams<{ slug: string }>()
  const [book, setBook] = useState<BookSummary | null>(null)
  const [stories, setStories] = useState<StoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('length')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    Promise.all([fetchBooks(), fetchStories(slug)])
      .then(([books, st]) => {
        if (cancelled) return
        const b = books.find((x) => x.slug === slug)
        if (!b) {
          setError('Book not found')
          return
        }
        setBook(b)
        setStories(st)
      })
      .catch((e) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [slug])

  const sorted = useMemo(() => {
    if (!stories) return []
    const arr = [...stories]
    if (sortKey === 'length') arr.sort((a, b) => a.length - b.length)
    else if (sortKey === 'endPage') arr.sort((a, b) => a.end_page - b.end_page)
    else if (sortKey === 'endReason')
      arr.sort((a, b) => a.end_reason.localeCompare(b.end_reason))
    return arr
  }, [stories, sortKey])

  if (error) return <div className="container error">{error}</div>
  if (!book || !stories) return <div className="container loading">Loading…</div>

  const endingsByReason = stories.reduce<Record<string, number>>((acc, s) => {
    acc[s.end_reason] = (acc[s.end_reason] || 0) + 1
    return acc
  }, {})

  return (
    <div className="container endings-page">
      <BookHeader book={book} active="endings" />

      <div className="endings-summary">
        <p>
          <strong>{stories.length}</strong> distinct paths enumerated from
          page {book.start_page}. Bounded at 20 decision points and at most
          500 paths; cycles abort the path at the re-visited page.
        </p>
        <div className="chip-list">
          {Object.entries(endingsByReason).map(([reason, count]) => (
            <span key={reason} className={`chip chip-${reason}`}>
              {reason}: {count}
            </span>
          ))}
        </div>
        <div className="sort-row">
          <label>
            Sort:{' '}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="length">Path length</option>
              <option value="endPage">End page</option>
              <option value="endReason">End reason</option>
            </select>
          </label>
        </div>
      </div>

      <ol className="endings-list">
        {sorted.map((s, i) => (
          <li key={s.file} className="ending">
            <div className="ending-head">
              <span className="ending-num">#{i + 1}</span>
              <span className="ending-length">
                {s.length} page{s.length !== 1 ? 's' : ''}
              </span>
              <span className={`chip chip-${s.end_reason}`}>{s.end_reason}</span>
            </div>
            <div className="ending-path">
              {s.path.map((p, idx) => (
                <span key={idx}>
                  <Link to={`/b/${slug}/read/${p}`} className="ending-step">
                    {p}
                  </Link>
                  {idx < s.path.length - 1 && <span className="arrow"> → </span>}
                </span>
              ))}
            </div>
            <Link
              to={`/b/${slug}/read/${s.path[0]}`}
              className="btn btn-small"
            >
              Walk this path
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
