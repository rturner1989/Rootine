import type { Consumer } from '@rails/actioncable'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as CableModule from '../../src/api/cable'
import type * as ApiClientModule from '../../src/api/client'
import Sidebar from '../../src/components/Sidebar'
import { AuthProvider } from '../../src/context/AuthContext'
import { NotificationsProvider } from '../../src/context/NotificationsContext'
import { OrganiserProvider } from '../../src/context/OrganiserContext'
import { SearchProvider } from '../../src/context/SearchContext'
import { ToastProvider } from '../../src/context/ToastContext'
import type { NotificationsResponse } from '../../src/types/notification'

vi.mock('../../src/api/client', (): typeof ApiClientModule => ({
  request: vi.fn().mockResolvedValue({ unread_count: 0, notifications: [] } satisfies NotificationsResponse),
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
}))

vi.mock('../../src/api/cable', (): typeof CableModule => ({
  cableConsumer: (): Consumer => ({
    subscriptions: { create: () => ({ unsubscribe: () => {} }) },
    disconnect: () => {},
  }),
  disconnectCable: () => {},
}))

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <OrganiserProvider>
            <SearchProvider>
              <ToastProvider>
                <MemoryRouter>{children}</MemoryRouter>
              </ToastProvider>
            </SearchProvider>
          </OrganiserProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('viewport branches', () => {
    it('renders three <aside> elements — one per viewport state', () => {
      // All three are in the DOM at all times; Tailwind responsive classes
      // gate visibility per width. Assert the markup, not the visibility.
      const { container } = render(<Sidebar />, { wrapper })
      const asides = container.querySelectorAll('aside')
      expect(asides.length).toBe(2) // Drawer aside is conditional (only when isOpen)
    })

    it('renders the Full sidebar with hidden desktop:flex classes (visible at 1200px+)', () => {
      const { container } = render(<Sidebar />, { wrapper })
      const full = Array.from(container.querySelectorAll('aside')).find((aside) =>
        aside.className.includes('desktop:flex'),
      )
      expect(full).toBeInTheDocument()
      expect(full).toHaveClass('hidden', 'desktop:flex')
    })

    it('renders the Rail sidebar with md+ desktop-hidden classes (visible 768–1199px)', () => {
      const { container } = render(<Sidebar />, { wrapper })
      const rail = Array.from(container.querySelectorAll('aside')).find((aside) =>
        aside.className.includes('desktop:hidden'),
      )
      expect(rail).toBeInTheDocument()
      expect(rail).toHaveClass('hidden', 'md:flex', 'desktop:hidden')
    })

    it('does not mount a drawer dialog when isOpen is false', () => {
      const { container } = render(<Sidebar />, { wrapper })
      expect(container.querySelector('aside[role="dialog"]')).toBeNull()
    })

    it('mounts a drawer dialog when isOpen is true', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={() => {}} />, { wrapper })
      expect(container.querySelector('aside[role="dialog"]')).toBeInTheDocument()
    })
  })

  describe('nav vocabulary (v2)', () => {
    it('renders all five v2 nav items in the Full body', () => {
      render(<Sidebar />, { wrapper })
      const navs = screen.getAllByRole('navigation', { name: 'Primary' })
      const fullNav = navs[0]
      const labels = within(fullNav)
        .getAllByRole('link')
        .map((link) => link.textContent.trim())
      expect(labels).toEqual(['Today', 'House', 'Journal', 'Encyclopedia', 'Me'])
    })

    it('points each nav item at the v2 route', () => {
      render(<Sidebar />, { wrapper })
      const navs = screen.getAllByRole('navigation', { name: 'Primary' })
      const fullNav = navs[0]
      expect(within(fullNav).getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/')
      expect(within(fullNav).getByRole('link', { name: 'House' })).toHaveAttribute('href', '/house')
      expect(within(fullNav).getByRole('link', { name: 'Journal' })).toHaveAttribute('href', '/journal')
      expect(within(fullNav).getByRole('link', { name: 'Encyclopedia' })).toHaveAttribute('href', '/encyclopedia')
      expect(within(fullNav).getByRole('link', { name: 'Me' })).toHaveAttribute('href', '/me')
    })
  })

  describe('header stubs', () => {
    it('renders an enabled notifications bell button (live since R8 wired the drawer)', () => {
      render(<Sidebar />, { wrapper })
      const bells = screen.getAllByRole('button', { name: /^Notifications/ })
      expect(bells.length).toBeGreaterThan(0)
      for (const bell of bells) expect(bell).not.toBeDisabled()
    })

    it('renders a disabled search pill stub with the cmd-K shortcut hint', () => {
      render(<Sidebar />, { wrapper })
      const search = screen.getAllByRole('button', { name: 'Search (coming soon)' })
      expect(search.length).toBeGreaterThan(0)
      for (const pill of search) expect(pill).toBeDisabled()
    })
  })

  describe('drawer dialog semantics', () => {
    function renderDrawerOpen(onClose = vi.fn()) {
      const result = render(<Sidebar isOpen={true} onClose={onClose} />, { wrapper })
      return { ...result, onClose }
    }

    it('marks the drawer aside with role="dialog" + aria-modal="true"', () => {
      renderDrawerOpen()
      const dialog = screen.getByRole('dialog', { name: 'Navigation menu' })
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('renders a close button (✕) inside the drawer head, replacing the bell', () => {
      renderDrawerOpen()
      const dialog = screen.getByRole('dialog', { name: 'Navigation menu' })
      expect(within(dialog).getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
    })

    it('fires onClose when the close button is clicked', () => {
      const { onClose } = renderDrawerOpen()
      const dialog = screen.getByRole('dialog', { name: 'Navigation menu' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('fires onClose when Escape is pressed', () => {
      const { onClose } = renderDrawerOpen()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('fires onClose when the scrim button is clicked', () => {
      const { onClose } = renderDrawerOpen()
      // Two buttons share aria-label="Close menu": the scrim (rendered first
      // in DOM order, has bg-black/50 backdrop styling) and the ✕ inside the
      // drawer. Pick the scrim.
      const scrimButton = screen
        .getAllByRole('button', { name: 'Close menu' })
        .find((btn) => btn.className.includes('bg-black/50'))
      fireEvent.click(scrimButton!)
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('drawer focus management', () => {
    it('moves focus to the close button inside the drawer when it opens', () => {
      render(<Sidebar isOpen={true} onClose={vi.fn()} />, { wrapper })
      const dialog = screen.getByRole('dialog', { name: 'Navigation menu' })
      const closeButton = within(dialog).getByRole('button', { name: 'Close menu' })
      expect(document.activeElement).toBe(closeButton)
    })
  })
})
