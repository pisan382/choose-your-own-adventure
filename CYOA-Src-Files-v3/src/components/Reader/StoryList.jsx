import { useNavigate } from 'react-router-dom'
import { getAllStories } from '../../utils/storage'
import { findEndings, findReachable } from '../../utils/storyHelpers'

export default function StoryList() {
  const navigate = useNavigate()
  const stories = getAllStories()
  const storyEntries = Object.entries(stories)

  return (
    <div style={{
      flex: 1,
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      width: '100%',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        fontWeight: 700,
        marginBottom: '0.5rem',
      }}>
        Story Library
      </h2>
      <p style={{
        color: 'var(--color-text-dim)',
        marginBottom: '2rem',
        fontSize: '0.95rem',
      }}>
        Choose a story to begin your adventure.
      </p>

      {storyEntries.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--color-text-dim)',
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No stories available yet.</p>
          <button
            onClick={() => navigate('/author')}
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Create one →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {storyEntries.map(([id, story]) => {
            const nodeCount = Object.keys(story.nodes || {}).length
            const endings = findEndings(story).length
            const reachable = findReachable(story).size

            return (
              <button
                key={id}
                onClick={() => navigate(`/read/${id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)'
                  e.currentTarget.style.background = 'var(--color-surface-2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.background = 'var(--color-surface)'
                }}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--color-text)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    marginBottom: '0.25rem',
                  }}>
                    {story.title || 'Untitled'}
                  </h3>
                  {story.author && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '0.4rem' }}>
                      by {story.author}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                    <span>{reachable} pages</span>
                    <span>•</span>
                    <span>{endings} ending{endings !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <span style={{
                  color: 'var(--color-accent)',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                  marginLeft: '1rem',
                }}>→</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
