import { useState, useEffect } from 'react'

/**
 * Toast notification system with ARIA live region
 * Automatically dismisses after 5 seconds
 */
export default function Toast({ message, type = 'info', duration = 5000, onDismiss }) {
  const [isVisible, setIsVisible] = useState(!!message)

  useEffect(() => {
    if (!message) return

    setIsVisible(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!isVisible || !message) return null

  const bgColor = {
    success: 'bg-green-100 border-green-400',
    error: 'bg-red-100 border-red-400',
    warning: 'bg-yellow-100 border-yellow-400',
    info: 'bg-blue-100 border-blue-400'
  }[type]

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  }[type]

  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }[type]

  return (
    <div
      className={`fixed bottom-4 right-4 max-w-sm border-l-4 p-4 rounded shadow-lg ${bgColor} ${textColor} z-50`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start">
        <span className="flex-shrink-0 text-lg font-bold mr-3">{icon}</span>
        <p className="flex-1 text-sm">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false)
            onDismiss?.()
          }}
          className="flex-shrink-0 ml-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * Toast Provider/Context hook for managing multiple toasts
 */
export const useToast = () => {
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ message, type, duration, id: Date.now() })
  }

  const dismiss = () => {
    setToast(null)
  }

  return { toast, showToast, dismiss }
}
