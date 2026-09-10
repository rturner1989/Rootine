import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WidgetError from '../../../../src/components/ui/errors/WidgetError'

describe('WidgetError', () => {
  it('renders the default label inside an alert role', () => {
    render(<WidgetError />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText("Couldn't load this just now.")).toBeInTheDocument()
  })

  it('renders a custom label', () => {
    render(<WidgetError label="Notifications failed" />)
    expect(screen.getByText('Notifications failed')).toBeInTheDocument()
  })

  it('renders a Try again button only when onRetry is provided', () => {
    const { rerender } = render(<WidgetError />)
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()

    rerender(<WidgetError onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('fires onRetry when the button is clicked', () => {
    const onRetry = vi.fn()
    render(<WidgetError onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
