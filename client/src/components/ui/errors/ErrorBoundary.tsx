import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

type ErrorBoundaryFallbackArgs = { error: Error; reset: () => void }

export type ErrorBoundaryProps = {
  children?: ReactNode
  fallback?: ReactNode | ((args: ErrorBoundaryFallbackArgs) => ReactNode)
}

type ErrorBoundaryState = { error: Error | null }

// Class component because error boundaries still need
// componentDidCatch + getDerivedStateFromError — no hook equivalent in
// React 19. Caller passes key={location.pathname} to reset on nav.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Logs to the browser console; an external reporter (Honeybadger /
    // Sentry / Bugsnag) would hook in here. Out of scope for now.
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught:', error, info)
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const { fallback } = this.props
    if (typeof fallback === 'function') {
      return fallback({ error, reset: this.reset })
    }
    return fallback ?? null
  }
}
