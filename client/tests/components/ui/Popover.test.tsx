import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import Popover from '../../../src/components/ui/Popover'

function Harness({ modal = true, startOpen = true }) {
  const [open, setOpen] = useState(startOpen)
  const anchorRef = useRef(null)
  return (
    <div>
      <button type="button" ref={anchorRef} onClick={() => setOpen(true)}>
        Trigger
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        External close
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        role="dialog"
        label="Test dialog"
        modal={modal}
      >
        <button type="button">First</button>
        <button type="button">Second</button>
        <button type="button">Last</button>
      </Popover>
    </div>
  )
}

describe('Popover', () => {
  it('renders the panel when open and hides it when closed', async () => {
    render(<Harness />)
    expect(screen.getByRole('dialog', { name: 'Test dialog' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'External close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  describe('modal', () => {
    it('marks the panel aria-modal when modal', () => {
      render(<Harness modal />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('omits aria-modal when not modal', () => {
      render(<Harness modal={false} />)
      expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal')
    })

    it('traps Tab — wraps from last focusable back to first', () => {
      render(<Harness modal />)
      const last = screen.getByRole('button', { name: 'Last' })
      last.focus()
      fireEvent.keyDown(document, { key: 'Tab' })
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    })

    it('traps Shift+Tab — wraps from first focusable to last', () => {
      render(<Harness modal />)
      const first = screen.getByRole('button', { name: 'First' })
      first.focus()
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
      expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
    })

    it('does not trap Tab when not modal', () => {
      render(<Harness modal={false} />)
      const last = screen.getByRole('button', { name: 'Last' })
      last.focus()
      fireEvent.keyDown(document, { key: 'Tab' })
      expect(last).toHaveFocus()
    })

    it('restores focus to the trigger on close', async () => {
      render(<Harness modal />)
      fireEvent.click(screen.getByRole('button', { name: 'External close' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus())
    })
  })
})
