import { Link, Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">📖</span>
            <span className="brand-name">CYOA Reader</span>
          </Link>
          <nav className="site-nav">
            <a
              href="https://github.com/pisan382/choose-your-own-adventure"
              target="_blank"
              rel="noreferrer"
              className="site-nav-link"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <small>
          Extracted story graphs from scanned and native-text gamebooks.
          Text shown for research and archival reference.
        </small>
      </footer>
    </div>
  )
}
