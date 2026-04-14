import { useNavigate } from 'react-router-dom'
import { ACCESSIBILITY, ROUTES } from '../constants'

/**
 * Accessible header component with skip links and navigation
 */
export default function Header() {
  const navigate = useNavigate()

  return (
    <>
      {/* Skip to main content link - invisible but keyboard accessible */}
      <a
        href={`#${ACCESSIBILITY.MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-indigo-600 focus:text-white focus:p-2"
      >
        Skip to main content
      </a>

      <nav
        className="bg-white shadow"
        aria-label={ACCESSIBILITY.NAVIGATION_LABEL}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded px-2"
            aria-label="CYOA Maker - Go to home"
          >
            🎭 CYOA Maker
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => navigate(ROUTES.AUTHOR)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition font-semibold"
              aria-label="Create a new story"
            >
              ✍️ Create Story
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}

// Utility class for screen reader only content
export const screenReaderOnly = "sr-only"
