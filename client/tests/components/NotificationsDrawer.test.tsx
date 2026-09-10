import type { Consumer } from '@rails/actioncable'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as CableModule from '../../src/api/cable'
import type * as ApiClientModule from '../../src/api/client'
import { request } from '../../src/api/client'
import NotificationsDrawer from '../../src/components/NotificationsDrawer'
import { AuthProvider } from '../../src/context/AuthContext'
import { NotificationsProvider } from '../../src/context/NotificationsContext'
import { useNotificationsContext } from '../../src/hooks/useNotificationsContext'
import type { NotificationsResponse } from '../../src/types/notification'

vi.mock('../../src/api/client', (): typeof ApiClientModule => ({
  request: vi.fn(),
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

function Harness() {
  const { openDrawer } = useNotificationsContext()
  return (
    <>
      <button type="button" onClick={openDrawer}>
        open
      </button>
      <NotificationsDrawer />
    </>
  )
}

function renderDrawer() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <Harness />
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('NotificationsDrawer', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('shows the caught-up empty state when there are no notifications', async () => {
    vi.mocked(request).mockResolvedValue({ unread_count: 0, notifications: [] } satisfies NotificationsResponse)

    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('open'))
    expect(await screen.findByText(/caught up/i)).toBeInTheDocument()
  })

  it('shows an error state instead of the caught-up empty state when the request fails', async () => {
    vi.mocked(request).mockRejectedValue(new Error('boom'))

    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('open'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load your notifications/i)
    // A failed request must not be mistaken for "you're all caught up".
    expect(screen.queryByText(/caught up/i)).not.toBeInTheDocument()
  })
})
