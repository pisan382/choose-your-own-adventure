/**
 * Error display component with recovery options
 */
export default function ErrorMessage({ error, onRetry, onDismiss }) {
  if (!error) return null

  return (
    <div
      className="p-4 bg-red-50 border-l-4 border-red-400 rounded"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl text-red-600" aria-hidden="true">✕</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Something went wrong
          </h3>
          <p className="mt-2 text-sm text-red-700">
            {typeof error === 'string' ? error : error.message || 'An unexpected error occurred'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-semibold text-sm"
          >
            Try Again
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-semibold text-sm"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
