import { render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Dock from '../../src/components/Dock'

const render_ = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Dock', () => {
  describe('nav vocabulary (v2)', () => {
    it('renders Today, House, Journal, Me — exactly four primary items', () => {
      render_(<Dock />)
      const nav = screen.getByRole('navigation', { name: 'Bottom navigation' })
      const links = within(nav).getAllByRole('link')
      expect(links.map((link) => link.textContent)).toEqual(['Today', 'House', 'Journal', 'Me'])
    })

    it('does not render an Encyclopedia item (sidebar-only on web)', () => {
      render_(<Dock />)
      expect(screen.queryByText('Encyclopedia')).toBeNull()
    })

    it('does not render the v1 Discover item', () => {
      render_(<Dock />)
      expect(screen.queryByText('Discover')).toBeNull()
    })

    it('does not render an Add plant FAB — Add Plant lives on contextual CTAs (Today empty state, Today plants row, House per-space CTA)', () => {
      render_(<Dock />)
      expect(screen.queryByRole('button', { name: 'Add plant' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Add plant' })).toBeNull()
    })
  })

  describe('routing', () => {
    it('points each nav item at the v2 route', () => {
      render_(<Dock />)
      expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/')
      expect(screen.getByRole('link', { name: 'House' })).toHaveAttribute('href', '/house')
      expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('href', '/journal')
      expect(screen.getByRole('link', { name: 'Me' })).toHaveAttribute('href', '/me')
    })
  })

  describe('viewport gating', () => {
    it('hides at xs+ via Tailwind class (visible only below 480px)', () => {
      const { container } = render_(<Dock />)
      expect(container.querySelector('nav')).toHaveClass('xs:hidden')
    })
  })
})
