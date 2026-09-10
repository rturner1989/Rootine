import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ToastItem } from '../../../src/components/ui/Toast'
import ToastContainer from '../../../src/components/ui/Toast'

describe('ToastContainer', () => {
  it('renders no toast elements when given an empty list', () => {
    render(<ToastContainer toasts={[]} onDismiss={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders a toast with its title text', () => {
    const toasts: ToastItem[] = [{ id: 1, kind: 'info', title: 'Hello there' }]
    render(<ToastContainer toasts={toasts} onDismiss={() => {}} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders the optional meta line under the title', () => {
    const toasts: ToastItem[] = [{ id: 1, kind: 'success', title: 'Saved', meta: 'Next check in 7d' }]
    render(<ToastContainer toasts={toasts} onDismiss={() => {}} />)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('Next check in 7d')).toBeInTheDocument()
  })

  it('renders the optional action button when provided', () => {
    const onClick = vi.fn()
    const toasts: ToastItem[] = [{ id: 1, kind: 'undo', title: 'Deleted Fernie', action: { label: 'Undo', onClick } }]
    render(<ToastContainer toasts={toasts} onDismiss={() => {}} />)
    const button = screen.getByRole('button', { name: 'Undo' })
    expect(button).toBeInTheDocument()
  })

  it('renders multiple toasts in order', () => {
    const toasts: ToastItem[] = [
      { id: 1, kind: 'success', title: 'First' },
      { id: 2, kind: 'error', title: 'Second' },
    ]
    render(<ToastContainer toasts={toasts} onDismiss={() => {}} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  describe('accessibility roles', () => {
    it('uses role="alert" for error toasts so screen readers interrupt', () => {
      render(<ToastContainer toasts={[{ id: 1, kind: 'error', title: 'Something failed' }]} onDismiss={() => {}} />)
      expect(screen.getByRole('alert')).toHaveTextContent('Something failed')
    })

    it('uses role="alert" for warn toasts so screen readers interrupt', () => {
      render(<ToastContainer toasts={[{ id: 1, kind: 'warn', title: 'Slow down' }]} onDismiss={() => {}} />)
      expect(screen.getByRole('alert')).toHaveTextContent('Slow down')
    })

    it('uses role="status" for success / info / undo / loading toasts', () => {
      const toasts: ToastItem[] = [
        { id: 1, kind: 'success', title: 'Saved' },
        { id: 2, kind: 'info', title: 'FYI' },
        { id: 3, kind: 'undo', title: 'Deleted Fernie' },
        { id: 4, kind: 'loading', title: 'Hydrating species' },
      ]
      render(<ToastContainer toasts={toasts} onDismiss={() => {}} />)
      expect(screen.getAllByRole('status')).toHaveLength(4)
    })
  })

  describe('dismiss', () => {
    it('calls onDismiss with the toast id when the close button is clicked', async () => {
      const onDismiss = vi.fn()
      const toasts: ToastItem[] = [{ id: 42, kind: 'info', title: 'Hi' }]
      render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />)

      await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(onDismiss).toHaveBeenCalledWith(42)
    })

    it('omits the dismiss button on loading toasts (resolved or auto-cleared, never user-cancelled)', () => {
      const toasts: ToastItem[] = [{ id: 1, kind: 'loading', title: 'Saving' }]
      render(<ToastContainer toasts={toasts} onDismiss={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
    })
  })

  describe('unknown kinds', () => {
    it('falls back to info styling (role="status") for unknown kinds', () => {
      // @ts-expect-error — 'nonsense' is deliberately outside ToastKind,
      // proving an unrecognised kind falls back to info styling.
      render(<ToastContainer toasts={[{ id: 1, kind: 'nonsense', title: 'Oops' }]} onDismiss={() => {}} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
