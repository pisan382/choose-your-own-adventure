/**
 * Accessible footer component
 */
export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-200 py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">About</h3>
            <p className="text-sm text-gray-400">
              Create and explore interactive branching stories with CYOA Maker. 
              Share your adventures with the world.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Quick Links</h3>
            <ul className="text-sm space-y-2">
              <li>
                <a
                  href="/"
                  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded px-1"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/"
                  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded px-1"
                >
                  Create Story
                </a>
              </li>
              <li>
                <a
                  href="/"
                  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded px-1"
                >
                  Browse Stories
                </a>
              </li>
            </ul>
          </div>

          {/* Accessibility */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Accessibility</h3>
            <p className="text-sm text-gray-400">
              This site is designed to be accessible to all users. 
              <a
                href="/"
                className="text-indigo-400 hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded px-1"
              >
                {' '}Learn more
              </a>
            </p>
          </div>
        </div>

        <hr className="border-gray-700 mb-6" />

        <div className="flex justify-between items-center text-sm text-gray-400">
          <p>&copy; {currentYear} CYOA Maker. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/" className="hover:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              Privacy
            </a>
            <a href="/" className="hover:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
