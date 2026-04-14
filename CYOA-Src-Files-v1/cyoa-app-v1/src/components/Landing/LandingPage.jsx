import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import caveOfTime from '../../data/cave-of-time.json'
import { getAllStories, saveStory } from '../../utils/storage'

export default function LandingPage() {
  const navigate = useNavigate()

  // Ensure Cave of Time is pre-loaded
  useEffect(() => {
    const stories = getAllStories()
    if (!stories['cave-of-time']) {
      saveStory('cave-of-time', caveOfTime)
    }
  }, [])

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: `
        radial-gradient(ellipse at 50% 30%, rgba(212,164,74,0.08) 0%, transparent 60%),
        var(--color-bg)
      `,
    }}>
      {/* Decorative diamond */}
      <div style={{
        fontSize: '2.5rem',
        color: 'var(--color-accent)',
        marginBottom: '1rem',
        opacity: 0.7,
      }}>◇</div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(2.5rem, 6vw, 4rem)',
        fontWeight: 700,
        color: 'var(--color-text)',
        lineHeight: 1.1,
        marginBottom: '0.5rem',
        letterSpacing: '-0.01em',
      }}>
        Choose Your Own<br />
        <span style={{ color: 'var(--color-accent)' }}>Adventure</span>
      </h1>

      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.15rem',
        color: 'var(--color-text-dim)',
        fontStyle: 'italic',
        marginBottom: '3rem',
        maxWidth: '28rem',
      }}>
        Create branching stories or explore the ones others have written.
      </p>

      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.95rem',
        color: 'var(--color-text-dim)',
        marginBottom: '1.25rem',
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        Are you a:
      </p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <BigButton
          label="✦ Author"
          subtitle="Create & edit stories"
          onClick={() => navigate('/author')}
        />
        <BigButton
          label="◈ Reader"
          subtitle="Play through stories"
          onClick={() => navigate('/reader')}
          variant="outline"
        />
      </div>

      <p style={{
        marginTop: '3rem',
        fontSize: '0.8rem',
        color: 'var(--color-border-light)',
        fontFamily: 'var(--font-ui)',
      }}>
        CSS 382 — CYOA Group Project
      </p>
    </div>
  )
}

function BigButton({ label, subtitle, onClick, variant }) {
  const filled = variant !== 'outline'
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,164,74,0.15)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      style={{
        background: filled ? 'var(--color-accent)' : 'transparent',
        color: filled ? 'var(--color-bg)' : 'var(--color-accent)',
        border: `2px solid var(--color-accent)`,
        padding: '1.25rem 2.5rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: '1.2rem',
        fontWeight: 700,
        transition: 'all 0.2s ease',
        minWidth: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      {label}
      <span style={{
        fontSize: '0.78rem',
        fontWeight: 400,
        opacity: 0.8,
      }}>{subtitle}</span>
    </button>
  )
}
