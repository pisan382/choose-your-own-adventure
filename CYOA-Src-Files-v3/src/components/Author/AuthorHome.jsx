import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { saveStory, generateId, getAllStories } from '../../utils/storage'
import { createEmptyStory } from '../../utils/storyHelpers'

export default function AuthorHome() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [error, setError] = useState(null)
  const stories = getAllStories()
  const storyEntries = Object.entries(stories)

  const handleCreate = () => {
    const title = prompt('Story title:', 'My Adventure')
    if (!title) return
    const id = generateId()
    saveStory(id, createEmptyStory(title))
    navigate(`/edit/${id}`)
  }

  const handleUpload = () => {
    fileRef.current?.click()
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result)
        if (!data.nodes || !data.startNode) {
          setError('Invalid story JSON: missing "nodes" or "startNode".')
          return
        }
        const id = generateId()
        saveStory(id, data)
        navigate(`/edit/${id}`)
      } catch {
        setError('Could not parse JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
        Author Workshop
      </h2>
      <p style={{
        color: 'var(--color-text-dim)',
        marginBottom: '2rem',
        fontSize: '0.95rem',
      }}>
        Create new stories or continue editing existing ones.
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <ActionBtn onClick={handleCreate} icon="+" label="Create New Story" />
        <ActionBtn onClick={handleUpload} icon="↑" label="Upload JSON" variant="outline" />
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(204,68,68,0.1)',
          border: '1px solid var(--color-danger)',
          color: 'var(--color-danger)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* Existing stories */}
      {storyEntries.length > 0 && (
        <>
          <h3 style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--color-text-dim)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            Your Stories
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {storyEntries.map(([id, story]) => (
              <div
                key={id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                  }}>
                    {story.title || 'Untitled'}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                    {Object.keys(story.nodes || {}).length} nodes
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/edit/${id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'background 0.15s',
                  }}
                >
                  Edit →
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ActionBtn({ onClick, icon, label, variant }) {
  const filled = variant !== 'outline'
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      style={{
        background: filled ? 'var(--color-accent)' : 'transparent',
        color: filled ? 'var(--color-bg)' : 'var(--color-accent)',
        border: `2px solid var(--color-accent)`,
        padding: '0.85rem 1.75rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '0.95rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icon}</span> {label}
    </button>
  )
}
