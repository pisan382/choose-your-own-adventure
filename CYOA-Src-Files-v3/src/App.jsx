import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { SettingsProvider, useSettings } from './SettingsContext'
import LandingPage from './components/Landing/LandingPage'
import StoryList from './components/Reader/StoryList'
import StoryReader from './components/Reader/StoryReader'
import AuthorHome from './components/Author/AuthorHome'
import GraphEditor from './components/Author/GraphEditor'

function SettingsModal({ onClose }) {
  const { theme, setTheme, edgeStyle, setEdgeStyle } = useSettings()
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.75rem', width: '100%', maxWidth: '380px', fontFamily: 'var(--font-ui)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>x</button>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>Appearance</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <SettingOption label="Dark" selected={theme === 'dark'} onClick={() => setTheme('dark')} />
            <SettingOption label="Light" selected={theme === 'light'} onClick={() => setTheme('light')} />
          </div>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>Graph Connection Style</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <SettingOption label="Straight" selected={edgeStyle === 'straight'} onClick={() => setEdgeStyle('straight')} />
            <SettingOption label="Curve" selected={edgeStyle === 'default'} onClick={() => setEdgeStyle('default')} />
            <SettingOption label="Smooth" selected={edgeStyle === 'smoothstep'} onClick={() => setEdgeStyle('smoothstep')} />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: '0.6rem', lineHeight: 1.5 }}>
            Straight: direct lines. Curve: smooth bezier arcs (default). Smooth: right-angle stepped lines.
          </p>
        </div>
      </div>
    </div>
  )
}

function SettingOption({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: '0.65rem 0.5rem', borderRadius: '8px', border: selected ? '2px solid var(--color-accent)' : '2px solid var(--color-border)', background: selected ? 'var(--color-surface-2)' : 'transparent', color: selected ? 'var(--color-accent)' : 'var(--color-text-dim)', fontFamily: 'var(--font-ui)', fontWeight: selected ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'center' }}>
      {label}
    </button>
  )
}

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [showSettings, setShowSettings] = useState(false)
  const { theme, setTheme } = useSettings()
  const isLight = theme === 'light'

  const smallBtn = {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-dim)',
    padding: '0.4rem 0.7rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 500,
    fontFamily: 'var(--font-ui)',
    lineHeight: 1,
    transition: 'border-color 0.15s',
    whiteSpace: 'nowrap',
  }

  return (
    <div>
      <nav style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-ui)' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}>
          {'\u25C6'} Choose Your Own Adventure
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!isHome && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <NavBtn onClick={() => navigate('/reader')} label="Reader" active={location.pathname.startsWith('/reader') || location.pathname.startsWith('/read/')} />
              <NavBtn onClick={() => navigate('/author')} label="Author" active={location.pathname.startsWith('/author') || location.pathname.startsWith('/edit/')} />
            </div>
          )}
          <button
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={smallBtn}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-dim)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            {isLight ? '\u263D' : '\u2600'}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={smallBtn}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-dim)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            {'\u2699'}
          </button>
        </div>
      </nav>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function NavBtn({ onClick, label, active }) {
  return (
    <button onClick={onClick} style={{ background: active ? 'var(--color-accent)' : 'transparent', color: active ? 'var(--color-bg)' : 'var(--color-text-dim)', border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.15s ease' }}>
      {label}
    </button>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/reader" element={<StoryList />} />
            <Route path="/read/:storyId" element={<StoryReader />} />
            <Route path="/author" element={<AuthorHome />} />
            <Route path="/edit/:storyId" element={<GraphEditor />} />
          </Routes>
        </div>
      </div>
    </SettingsProvider>
  )
}
