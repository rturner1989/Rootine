import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Tooltip from '../../../src/components/ui/Tooltip'

// The tooltip only shows on hover-capable devices (mouse/keyboard), not on
// touch — drive the `(hover: hover)` gate via a matchMedia stub.
function mockHover(matches) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

function renderWithTrigger(ui) {
  return render(<button type="button">Trigger{ui}</button>)
}

describe('Tooltip', () => {
  beforeEach(() => mockHover(true))

  it('does not render the bubble until the trigger is hovered', () => {
    renderWithTrigger(<Tooltip>Organiser</Tooltip>)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('renders into document.body on mouseenter and removes on mouseleave', () => {
    renderWithTrigger(<Tooltip>Organiser</Tooltip>)
    const trigger = screen.getByRole('button', { name: /Trigger/ })

    fireEvent.mouseEnter(trigger)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Organiser')
    expect(tooltip.parentElement).toBe(document.body)

    fireEvent.mouseLeave(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('reveals on focusin and hides on focusout', () => {
    renderWithTrigger(<Tooltip>Bell</Tooltip>)
    const trigger = screen.getByRole('button', { name: /Trigger/ })

    fireEvent.focusIn(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bell')

    fireEvent.focusOut(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('stays hidden on touch (no hover capability) for both hover and focus', () => {
    mockHover(false)
    renderWithTrigger(<Tooltip>Notifications</Tooltip>)
    const trigger = screen.getByRole('button', { name: /Trigger/ })

    fireEvent.mouseEnter(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.focusIn(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('disables pointer-events so it never blocks the trigger', () => {
    renderWithTrigger(<Tooltip>Notifications</Tooltip>)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Trigger/ }))
    expect(screen.getByRole('tooltip').className).toMatch(/pointer-events-none/)
  })

  it('positions via inline style for the requested placement', () => {
    renderWithTrigger(<Tooltip placement="bottom-end">Today</Tooltip>)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Trigger/ }))
    const tooltip = screen.getByRole('tooltip')
    // bottom-end uses `top` + `right` — never `left`.
    expect(tooltip.style.top).not.toBe('')
    expect(tooltip.style.right).not.toBe('')
    expect(tooltip.style.left).toBe('')
  })
})
