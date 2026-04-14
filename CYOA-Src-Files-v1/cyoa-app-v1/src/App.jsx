import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import LandingPage from './components/Landing/LandingPage'
import StoryList from './components/Reader/StoryList'
import StoryReader from './components/Reader/StoryReader'
import AuthorHome from './components/Author/AuthorHome'
import GraphEditor from './components/Author/GraphEditor'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <nav style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-ui)',
    }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        ◆ Choose Your Own Adventure
      </button>
      {!isHome && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <NavBtn onClick={() => navigate('/reader')} label="Reader" active={location.pathname.startsWith('/reader') || location.pathname.startsWith('/read/')} />
          <NavBtn onClick={() => navigate('/author')} label="Author" active={location.pathname.startsWith('/author') || location.pathname.startsWith('/edit/')} />
        </div>
      )}
    </nav>
  )
}

function NavBtn({ onClick, label, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--color-accent)' : 'transparent',
        color: active ? 'var(--color-bg)' : 'var(--color-text-dim)',
        border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        padding: '0.4rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        fontSize: '0.85rem',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}

export default function App() {
  return (
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
  )
}
