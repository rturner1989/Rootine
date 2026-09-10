import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../../src/api/client'
import NotificationsTrigger from '../../../src/components/notifications/NotificationsTrigger'
import { AuthProvider } from '../../../src/context/AuthContext'
import { NotificationsProvider } from '../../../src/context/NotificationsContext'

vi.mock('../../../src/api/client', () => ({
  request: vi.fn(),
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
}))

vi.mock('../../../src/api/cable', () => ({
  cableConsumer: () => ({ subscriptions: { create: () => ({ unsubscribe: () => {} }) } }),
  disconnectCable: () => {},
}))

function renderTrigger() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <NotificationsTrigger />
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('NotificationsTrigger', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('labels the bell with the unread count on success', async () => {
    vi.mocked(request).mockResolvedValue({ unread_count: 3, notifications: [] })

    renderTrigger()
    expect(await screen.findByRole('button', { name: 'Notifications (3 unread)' })).toBeInTheDocument()
  })

  it('labels the bell as unavailable instead of implying zero unread when the request fails', async () => {
    vi.mocked(request).mockRejectedValue(new Error('boom'))

    renderTrigger()
    expect(await screen.findByRole('button', { name: 'Notifications unavailable' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Notifications' })).not.toBeInTheDocument()
  })
})
