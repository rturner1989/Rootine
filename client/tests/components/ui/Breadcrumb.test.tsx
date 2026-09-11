import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Breadcrumb from '../../../src/components/ui/Breadcrumb'

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Breadcrumb', () => {
  describe('rendering', () => {
    it('returns null when items is empty', () => {
      const { container } = renderWithRouter(<Breadcrumb items={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('returns null when items is undefined', () => {
      const { container } = renderWithRouter(<Breadcrumb />)
      expect(container.firstChild).toBeNull()
    })

    it('renders a nav with aria-label="Breadcrumb"', () => {
      renderWithRouter(<Breadcrumb items={[{ label: 'Home' }]} />)
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    })

    it('renders an ordered list of items', () => {
      renderWithRouter(
        <Breadcrumb
          items={[
            { label: 'House', to: '/house' },
            { label: 'Living Room', to: '/house?space_id=1' },
            { label: 'Monty' },
          ]}
        />,
      )
      const list = screen.getByRole('list')
      expect(list.tagName).toBe('OL')
      expect(list.querySelectorAll('li')).toHaveLength(3)
    })
  })

  describe('item shape', () => {
    it('renders linked items as <a>, last item as plain span', () => {
      renderWithRouter(<Breadcrumb items={[{ label: 'House', to: '/house' }, { label: 'Monty' }]} />)
      const houseLink = screen.getByRole('link', { name: 'House' })
      expect(houseLink).toHaveAttribute('href', '/house')

      const current = screen.getByText('Monty')
      expect(current.tagName).toBe('SPAN')
      expect(current).toHaveAttribute('aria-current', 'page')
    })

    it('does not link the last item even when `to` is set', () => {
      renderWithRouter(
        <Breadcrumb
          items={[
            { label: 'House', to: '/house' },
            { label: 'Monty', to: '/plants/1' },
          ]}
        />,
      )
      expect(screen.queryByRole('link', { name: 'Monty' })).toBeNull()
      expect(screen.getByText('Monty')).toHaveAttribute('aria-current', 'page')
    })

    it('renders a chevron between items but not after the last', () => {
      const { container } = renderWithRouter(
        <Breadcrumb
          items={[
            { label: 'House', to: '/house' },
            { label: 'Living Room', to: '/house?space_id=1' },
            { label: 'Monty' },
          ]}
        />,
      )
      const chevrons = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(chevrons).toHaveLength(2)
    })
  })
})
