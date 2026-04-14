import { Component } from 'react'
import ErrorMessage from './ErrorMessage'

/**
 * Error boundary component for graceful error handling
 * Catches errors in the component tree and displays user-friendly messages
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleDismiss = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <ErrorMessage
              error={this.state.error?.message || 'Something unexpected happened'}
              onRetry={this.handleRetry}
              onDismiss={this.handleDismiss}
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
