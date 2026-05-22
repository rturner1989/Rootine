import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import useFocusTrap from '../../src/hooks/useFocusTrap'

function Trap({ active = true, containerTabIndex }) {
  const ref = useRef(null)
  useFocusTrap(ref, active)
  return (
    <div ref={ref} tabIndex={containerTabIndex}>
      <button type="button">First</button>
      <button type="button">Middle</button>
      <button type="button">Last</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('wraps Tab from the last focusable back to the first', () => {
    render(<Trap />)
    screen.getByRole('button', { name: 'Last' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('wraps Shift+Tab from the first focusable to the last', () => {
    render(<Trap />)
    screen.getByRole('button', { name: 'First' }).focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })

  it('does not wrap when focus is on an interior element', () => {
    render(<Trap />)
    const middle = screen.getByRole('button', { name: 'Middle' })
    middle.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(middle).toHaveFocus()
  })

  it('does nothing when inactive', () => {
    render(<Trap active={false} />)
    const last = screen.getByRole('button', { name: 'Last' })
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(last).toHaveFocus()
  })

  it('treats focus on the container itself as before the first (Shift+Tab → last)', () => {
    render(<Trap containerTabIndex={-1} />)
    const container = screen.getByRole('button', { name: 'First' }).parentElement
    container.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })
})
