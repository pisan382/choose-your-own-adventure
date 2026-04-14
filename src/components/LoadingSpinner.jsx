/**
 * Accessible loading spinner
 */
export default function LoadingSpinner({ label = 'Loading content...' }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative w-16 h-16 mb-4">
        {/* Animated spinner */}
        <div
          className="absolute inset-0 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"
          aria-hidden="true"
        />
      </div>
      <p className="text-gray-600 font-medium">{label}</p>
    </div>
  )
}

/**
 * Inline loading indicator for smaller contexts
 */
export function LoadingBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
      role="status"
      aria-live="polite"
    >
      <div className="w-3 h-3 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      <span>Loading...</span>
    </div>
  )
}
