import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Dialog from '../../../src/components/ui/Dialog'

describe('Dialog', () => {
  describe('visibility', () => {
    it('renders nothing when open is false', () => {
      render(
        <Dialog open={false} onClose={() => {}} title="Test">
          <p>Body</p>
        </Dialog>,
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByText('Body')).not.toBeInTheDocument()
    })

    it('portals dialog content to document.body when open is true', () => {
      render(
        <Dialog open={true} onClose={() => {}} title="Test">
          <p>Body</p>
        </Dialog>,
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Body')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('sets role="dialog" + aria-modal="true" on the card', () => {
      render(
        <Dialog open={true} onClose={() => {}} title="Confirm">
          <p>Body</p>
        </Dialog>,
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('links aria-labelledby to the hidden title heading', () => {
      render(
        <Dialog open={true} onClose={() => {}} title="Confirm water">
          <p>Body</p>
        </Dialog>,
      )
      const dialog = screen.getByRole('dialog')
      const labelledBy = dialog.getAttribute('aria-labelledby')
      if (!labelledBy) throw new Error('expected aria-labelledby to be set')
      const heading = document.getElementById(labelledBy)
      expect(heading).toHaveTextContent('Confirm water')
    })

    it('omits aria-labelledby when no title is provided', () => {
      render(
        <Dialog open={true} onClose={() => {}}>
          <p>Body</p>
        </Dialog>,
      )
      expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby')
    })
  })

  describe('close triggers', () => {
    it('calls onClose when the overlay is clicked', () => {
      const onClose = vi.fn()
      render(
        <Dialog open={true} onClose={onClose} title="Test">
          <p>Body</p>
        </Dialog>,
      )
      fireEvent.click(screen.getByRole('button', { name: /Close dialog/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when the Escape key is pressed', () => {
      const onClose = vi.fn()
      render(
        <Dialog open={true} onClose={onClose} title="Test">
          <p>Body</p>
        </Dialog>,
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does NOT call onClose for other keys', () => {
      const onClose = vi.fn()
      render(
        <Dialog open={true} onClose={onClose} title="Test">
          <p>Body</p>
        </Dialog>,
      )
      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'a' })
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
