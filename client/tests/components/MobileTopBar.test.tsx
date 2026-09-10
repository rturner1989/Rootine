import type { Consumer } from '@rails/actioncable'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as CableModule from '../../src/api/cable'
import type * as ApiClientModule from '../../src/api/client'
import MobileTopBar from '../../src/components/MobileTopBar'
import { AuthProvider } from '../../src/context/AuthContext'
import { NotificationsProvider } from '../../src/context/NotificationsContext'
import { OrganiserProvider } from '../../src/context/OrganiserContext'
import { SearchProvider } from '../../src/context/SearchContext'
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
              <MemoryRouter>{children}</MemoryRouter>
            </SearchProvider>
          </OrganiserProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('MobileTopBar', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('semantics', () => {
    it('renders as a <header> element so SR users get the banner landmark', () => {
      const { container } = render(<MobileTopBar />, { wrapper })
      expect(container.querySelector('header')).toBeInTheDocument()
    })

    it('hides at md+ via Tailwind class (chrome only on phone + drawer widths)', () => {
      const { container } = render(<MobileTopBar />, { wrapper })
      expect(container.querySelector('header')).toHaveClass('md:hidden')
    })
  })

  describe('bell button', () => {
    it('renders an enabled notifications button (live since R8 wired the drawer)', () => {
      render(<MobileTopBar />, { wrapper })
      const bell = screen.getByRole('button', { name: /^Notifications/ })
      expect(bell).not.toBeDisabled()
    })
  })

  describe('burger', () => {
    it('does not render when no onMenuOpen handler is provided', () => {
      render(<MobileTopBar />, { wrapper })
      expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull()
    })

    it('renders when onMenuOpen is provided and is hidden below xs (480px)', () => {
      render(<MobileTopBar onMenuOpen={() => {}} />, { wrapper })
      const burger = screen.getByRole('button', { name: 'Open menu' })
      expect(burger).toBeInTheDocument()
      expect(burger.closest('div')).toHaveClass('hidden', 'xs:flex')
    })

    it('fires onMenuOpen when clicked', () => {
      const onMenuOpen = vi.fn()
      render(<MobileTopBar onMenuOpen={onMenuOpen} />, { wrapper })
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(onMenuOpen).toHaveBeenCalledTimes(1)
    })
  })

  describe('logo', () => {
    it('renders the home-link logo', () => {
      render(<MobileTopBar />, { wrapper })
      expect(screen.getByRole('link', { name: /rootine/i })).toHaveAttribute('href', '/')
    })
  })
})
