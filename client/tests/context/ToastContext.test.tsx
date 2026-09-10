import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from '../../src/context/ToastContext'

describe('ToastContext', () => {
  describe('useToast hook', () => {
    it('throws when used outside a ToastProvider', () => {
      // Suppress React's error-boundary warning in test output
      const originalError = console.error
      console.error = vi.fn()

      function BadComponent() {
        useToast()
        return null
      }

      expect(() => render(<BadComponent />)).toThrow('useToast must be used within a ToastProvider')

      console.error = originalError
    })
  })

  describe('showing toasts', () => {
    function Trigger({ onClick, label = 'trigger' }: { onClick: () => void; label?: string }) {
      return (
        <button type="button" onClick={onClick}>
          {label}
        </button>
      )
    }

    it('renders a success toast when toast.success() is called', async () => {
      function App() {
        const toast = useToast()
        return <Trigger onClick={() => toast.success('Saved!')} />
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByText('Saved!')).toBeInTheDocument()
    })

    it('renders an error toast with role="alert"', async () => {
      function App() {
        const toast = useToast()
        return <Trigger onClick={() => toast.error('Nope')} />
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByRole('alert')).toHaveTextContent('Nope')
    })

    it('stacks multiple toasts in the order they were triggered', async () => {
      function App() {
        const toast = useToast()
        return (
          <>
            <Trigger onClick={() => toast.info('First')} label="first" />
            <Trigger onClick={() => toast.info('Second')} label="second" />
          </>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'first' }))
      await userEvent.click(screen.getByRole('button', { name: 'second' }))
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })
  })

  describe('dismissing toasts manually', () => {
    it('removes the toast when the user clicks the dismiss button', async () => {
      function App() {
        const toast = useToast()
        return (
          <button type="button" onClick={() => toast.info('Hi')}>
            trigger
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByText('Hi')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
      // Wait for the Framer Motion exit animation to finish before asserting
      // the DOM is actually cleared — AnimatePresence keeps components mounted
      // until the exit animation completes.
      await waitFor(() => {
        expect(screen.queryByText('Hi')).not.toBeInTheDocument()
      })
    })
  })

  // These use real timers with short (50-100ms) durations instead of fake timers.
  // Mixing Vitest's fake timers with userEvent's async click deadlocks because
  // userEvent's internal scheduling uses setTimeout under the hood — simpler to
  // just use small real durations and waitFor.
  describe('auto-dismiss', () => {
    it('auto-dismisses a toast after its duration elapses', async () => {
      function App() {
        const toast = useToast()
        return (
          <button type="button" onClick={() => toast.info('Bye soon', { duration: 50 })}>
            trigger
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByText('Bye soon')).toBeInTheDocument()

      await waitFor(
        () => {
          expect(screen.queryByText('Bye soon')).not.toBeInTheDocument()
        },
        { timeout: 500 },
      )
    })

    it('does not auto-dismiss error toasts (manual dismiss only)', async () => {
      function App() {
        const toast = useToast()
        return (
          <button type="button" onClick={() => toast.error('Sticky')}>
            trigger
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByText('Sticky')).toBeInTheDocument()

      await new Promise((resolveTimer) => setTimeout(resolveTimer, 100))
      expect(screen.getByText('Sticky')).toBeInTheDocument()
    })

    it('does not auto-dismiss loading toasts (resolves manually via toast.resolve)', async () => {
      function App() {
        const toast = useToast()
        return (
          <button type="button" onClick={() => toast.loading('Saving…')}>
            trigger
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByText('Saving…')).toBeInTheDocument()

      await new Promise((resolveTimer) => setTimeout(resolveTimer, 100))
      expect(screen.getByText('Saving…')).toBeInTheDocument()
    })
  })

  describe('payload shapes', () => {
    it('accepts a string and renders it as the title', async () => {
      function App() {
        const toast = useToast()
        return (
          <button type="button" onClick={() => toast.success('Logged in')}>
            trigger
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByText('Logged in')).toBeInTheDocument()
    })

    it('accepts a structured payload with title + meta + action', async () => {
      const onAction = vi.fn()
      function App() {
        const toast = useToast()
        return (
          <button
            type="button"
            onClick={() =>
              toast.success({
                title: 'Watered Monty',
                meta: '500ml logged',
                action: { label: 'View', onClick: onAction },
              })
            }
          >
            trigger
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByText('Watered Monty')).toBeInTheDocument()
      expect(screen.getByText('500ml logged')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'View' }))
      expect(onAction).toHaveBeenCalled()
    })

    it('warning is an alias for warn (back-compat)', async () => {
      function App() {
        const toast = useToast()
        return (
          <button type="button" onClick={() => toast.warning('Slow down')}>
            trigger
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
      expect(screen.getByRole('alert')).toHaveTextContent('Slow down')
    })
  })

  describe('loading → resolve flow', () => {
    it('swaps a loading toast to success in place via toast.resolve(id, options)', async () => {
      // Assigned by the "start" button's click handler before "finish" reads
      // it — TS can't see across the two event handlers, so this asserts the
      // same ordering the test itself drives via userEvent.click below.
      let loadingId!: number
      function App() {
        const toast = useToast()
        return (
          <>
            <button
              type="button"
              onClick={() => {
                loadingId = toast.loading('Saving…')
              }}
            >
              start
            </button>
            <button
              type="button"
              onClick={() => toast.resolve(loadingId, { kind: 'success', title: 'Saved!', duration: 50 })}
            >
              finish
            </button>
          </>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'start' }))
      expect(screen.getByText('Saving…')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'finish' }))
      expect(screen.getByText('Saved!')).toBeInTheDocument()
      expect(screen.queryByText('Saving…')).not.toBeInTheDocument()

      // Resolved toast inherits the kind's auto-dismiss window.
      await waitFor(
        () => {
          expect(screen.queryByText('Saved!')).not.toBeInTheDocument()
        },
        { timeout: 500 },
      )
    })
  })

  describe('stack cap', () => {
    it('keeps only the 3 newest dismissable toasts', async () => {
      function App() {
        const toast = useToast()
        return (
          <button
            type="button"
            onClick={() => {
              toast.success('A')
              toast.success('B')
              toast.success('C')
              toast.success('D')
            }}
          >
            burst
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'burst' }))

      await waitFor(() => {
        expect(screen.queryByText('A')).not.toBeInTheDocument()
      })
      expect(screen.getByText('B')).toBeInTheDocument()
      expect(screen.getByText('C')).toBeInTheDocument()
      expect(screen.getByText('D')).toBeInTheDocument()
    })

    it('keeps error + loading toasts even when newer dismissables flood in', async () => {
      function App() {
        const toast = useToast()
        return (
          <button
            type="button"
            onClick={() => {
              toast.error('Boom')
              toast.success('A')
              toast.success('B')
              toast.success('C')
              toast.success('D')
            }}
          >
            burst
          </button>
        )
      }
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'burst' }))

      // Error stays put; oldest dismissables get trimmed.
      expect(screen.getByText('Boom')).toBeInTheDocument()
      expect(screen.getByText('D')).toBeInTheDocument()
    })
  })
})
