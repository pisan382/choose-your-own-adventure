/**
 * Breadcrumb navigation for showing page hierarchy
 * Helps users understand their location in the app
 */
import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center">
            {idx > 0 && (
              <span className="mx-2 text-gray-400" aria-hidden="true">›</span>
            )}
            {item.href ? (
              <Link
                to={item.href}
                className="text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded px-1"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-700" aria-current={idx === items.length - 1 ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
