import { faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Menu from '../../../src/components/ui/Menu'

function renderBasic({ onEdit = vi.fn(), onDelete = vi.fn() } = {}) {
  render(
    <Menu label="Living Room actions">
      <Menu.Trigger />
      <Menu.Items>
        <Menu.Item icon={faPenToSquare} onClick={onEdit}>
          Edit space
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item icon={faTrash} variant="danger" onClick={onDelete}>
          Delete space
        </Menu.Item>
      </Menu.Items>
    </Menu>,
  )
  return { onEdit, onDelete }
}

describe('Menu', () => {
  describe('trigger + open state', () => {
    it('renders a trigger button labelled by `label`', () => {
      renderBasic()
      expect(screen.getByRole('button', { name: 'Living Room actions' })).toBeInTheDocument()
    })

    it('panel is hidden until trigger is clicked', () => {
      renderBasic()
      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('reveals the panel on click and items become reachable', () => {
      renderBasic()
      fireEvent.click(screen.getByRole('button', { name: 'Living Room actions' }))
      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Edit space/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Delete space/ })).toBeInTheDocument()
    })

    it('trigger advertises aria-haspopup + aria-expanded', () => {
      renderBasic()
      const trigger = screen.getByRole('button', { name: 'Living Room actions' })
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('item activation', () => {
    it('clicking a menuitem fires its onClick and closes the panel', async () => {
      const { onEdit } = renderBasic()
      fireEvent.click(screen.getByRole('button', { name: 'Living Room actions' }))
      fireEvent.click(screen.getByRole('menuitem', { name: /Edit space/ }))
      expect(onEdit).toHaveBeenCalledOnce()
      // AnimatePresence keeps the panel mounted during the exit animation;
      // wait for it to fully unmount.
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    it('danger variant applies the coral hover class', () => {
      renderBasic()
      fireEvent.click(screen.getByRole('button', { name: 'Living Room actions' }))
      const deleteItem = screen.getByRole('menuitem', { name: /Delete space/ })
      expect(deleteItem.className).toMatch(/text-coral-deep/)
    })
  })

  describe('escape + outside click', () => {
    it('Esc closes the panel', async () => {
      renderBasic()
      fireEvent.click(screen.getByRole('button', { name: 'Living Room actions' }))
      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    it('mousedown outside the panel closes it', async () => {
      renderBasic()
      fireEvent.click(screen.getByRole('button', { name: 'Living Room actions' }))
      fireEvent.mouseDown(document.body)
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })
  })

  describe('portal rendering', () => {
    it('panel renders into document.body so it escapes overflow-hidden ancestors', () => {
      renderBasic()
      fireEvent.click(screen.getByRole('button', { name: 'Living Room actions' }))
      const panel = screen.getByRole('menu')
      expect(panel.parentElement).toBe(document.body)
    })
  })

  describe('hidden until subcomponents inside provider', () => {
    it('throws if Menu subcomponents are used outside <Menu>', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(<Menu.Trigger />)).toThrow(/Menu subcomponents must be inside <Menu>/)
      errorSpy.mockRestore()
    })
  })
})
