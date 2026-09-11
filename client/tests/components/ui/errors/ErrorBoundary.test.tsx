import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '../../../../src/components/ui/errors/ErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

function Healthy() {
  return <p>Healthy content</p>
}

describe('ErrorBoundary', () => {
  // React still logs the caught error to console.error in dev — silence
  // it so the test output isn't polluted. The boundary itself also
  // console.errors, which we'd want to keep in real runs.
  let errorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <Healthy />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Healthy content')).toBeInTheDocument()
    expect(screen.queryByText('fallback')).toBeNull()
  })

  it('renders a ReactNode fallback when a child throws', () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('fallback')).toBeInTheDocument()
  })

  it('renders a function fallback with {error, reset}', () => {
    render(
      <ErrorBoundary fallback={({ error }) => <p>caught: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('caught: boom')).toBeInTheDocument()
  })

  it('reset clears the caught error so children can render again', () => {
    function MaybeBoom({ shouldThrow }: { shouldThrow: boolean }) {
      if (shouldThrow) throw new Error('boom')
      return <p>Healthy after reset</p>
    }

    function Harness() {
      const [shouldThrow, setShouldThrow] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setShouldThrow(false)}>
            fix it
          </button>
          <ErrorBoundary
            fallback={({ reset }) => (
              <button type="button" onClick={reset}>
                retry
              </button>
            )}
          >
            <MaybeBoom shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument()

    // Caller fixes the underlying condition, then resets the boundary.
    fireEvent.click(screen.getByRole('button', { name: 'fix it' }))
    fireEvent.click(screen.getByRole('button', { name: 'retry' }))
    expect(screen.getByText('Healthy after reset')).toBeInTheDocument()
  })
})
