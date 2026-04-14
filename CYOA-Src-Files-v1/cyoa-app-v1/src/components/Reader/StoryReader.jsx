import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { getStory } from '../../utils/storage'

export default function StoryReader() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [currentNodeId, setCurrentNodeId] = useState(null)
  const [history, setHistory] = useState([])
  const [fadeIn, setFadeIn] = useState(true)

  useEffect(() => {
    const s = getStory(storyId)
    if (!s) {
      navigate('/reader')
      return
    }
    setStory(s)
    setCurrentNodeId(s.startNode)
    setHistory([])
  }, [storyId, navigate])

  const goToNode = useCallback((nodeId) => {
    setFadeIn(false)
    setTimeout(() => {
      setHistory(h => [...h, currentNodeId])
      setCurrentNodeId(nodeId)
      setFadeIn(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 200)
  }, [currentNodeId])

  const goBack = useCallback(() => {
    if (history.length === 0) return
    setFadeIn(false)
    setTimeout(() => {
      const prev = history[history.length - 1]
      setHistory(h => h.slice(0, -1))
      setCurrentNodeId(prev)
      setFadeIn(true)
    }, 200)
  }, [history])

  const restart = useCallback(() => {
    setFadeIn(false)
    setTimeout(() => {
      setHistory([])
      setCurrentNodeId(story.startNode)
      setFadeIn(true)
    }, 200)
  }, [story])

  if (!story || !currentNodeId) return null
  const node = story.nodes[currentNodeId]
  if (!node) return <div style={{ padding: '2rem' }}>Node not found.</div>

  const isEnding = node.isEnding || !node.choices?.length
  const stepNumber = history.length + 1

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem',
      background: `
        radial-gradient(ellipse at 50% 0%, rgba(212,164,74,0.04) 0%, transparent 50%),
        var(--color-bg)
      `,
    }}>
      {/* Story title bar */}
      <div style={{
        width: '100%',
        maxWidth: '640px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--color-text-dim)',
          fontStyle: 'italic',
        }}>
          {story.title}
        </h2>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--color-border-light)',
          fontFamily: 'var(--font-ui)',
        }}>
          Step {stepNumber}
        </span>
      </div>

      {/* Story content */}
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Page indicator */}
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--color-accent-dim)',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
          fontFamily: 'var(--font-ui)',
        }}>
          {node.title || currentNodeId}
        </div>

        {/* Story text */}
        <div className="story-text" style={{ marginBottom: '2rem' }}>
          {node.text}
        </div>

        {/* Ending */}
        {isEnding && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            margin: '1rem 0 2rem',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--color-accent)',
              fontStyle: 'italic',
              marginBottom: '0.5rem',
            }}>
              The End
            </p>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-dim)',
            }}>
              You reached this ending in {stepNumber} steps.
            </p>
          </div>
        )}

        {/* Choices */}
        {!isEnding && node.choices?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <p style={{
              fontSize: '0.78rem',
              color: 'var(--color-text-dim)',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
            }}>
              What do you do?
            </p>
            {node.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => goToNode(choice.target)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)'
                  e.currentTarget.style.color = 'var(--color-accent)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text)'
                }}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: 'var(--color-accent-dim)', marginRight: '0.5rem', fontWeight: 700 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
          flexWrap: 'wrap',
        }}>
          {history.length > 0 && (
            <SmallBtn onClick={goBack} label="← Go Back" />
          )}
          <SmallBtn onClick={restart} label="↺ Restart" />
          <SmallBtn onClick={() => navigate('/reader')} label="✕ Exit" />
        </div>
      </div>
    </div>
  )
}

function SmallBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      style={{
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-dim)',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: '0.82rem',
        fontWeight: 500,
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}
