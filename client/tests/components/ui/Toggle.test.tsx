import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Toggle from '../../../src/components/ui/Toggle'

describe('Toggle', () => {
  it('exposes itself as a switch carrying its label', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Care reminders" />)
    expect(screen.getByRole('switch', { name: 'Care reminders' })).toBeInTheDocument()
  })

  it('reports its state', () => {
    const { rerender } = render(<Toggle checked={false} onChange={() => {}} label="Care" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

    rerender(<Toggle checked onChange={() => {}} label="Care" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('emits the flipped value', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Care" />)

    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('emits false when switching off', () => {
    const onChange = vi.fn()
    render(<Toggle checked onChange={onChange} label="Care" />)

    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does not emit while disabled', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Care" disabled />)

    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
