/**
 * Accessible dialog/modal component with focus management
 */
import { useEffect, useRef } from 'react'

export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md'
}) {
  const dialogRef = useRef(null)
  const initialFocusRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      // Focus the close button or first focusable element
      setTimeout(() => {
        initialFocusRef.current?.focus()
      }, 0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }[size]

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 id="dialog-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            ref={initialFocusRef}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="border-t border-gray-200 p-6 flex gap-3 justify-end">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`px-4 py-2 rounded font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  action.primary
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
