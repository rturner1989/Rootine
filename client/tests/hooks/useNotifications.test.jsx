import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import { useMarkNotificationRead, useNotifications, useNotificationsSeen } from '../../src/hooks/useNotifications'

vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// appNotificationSchema requires every field — ApplicationNotifier#as_json
// always ships the full set, no optionals besides the nullable ones below.
const NOTIFICATION_FIXTURE = {
  id: 1,
  kind: 'achievement',
  title: '30 days with Wilty',
  meta: null,
  url: null,
  params: null,
  read_at: null,
  seen_at: null,
  created_at: '2026-05-01T00:00:00Z',
}

describe('useNotifications hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useNotifications()', () => {
    it('fetches /api/v1/notifications and exposes the parsed payload', async () => {
      request.mockResolvedValue({
        unread_count: 3,
        notifications: [NOTIFICATION_FIXTURE],
      })
      const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(request).toHaveBeenCalledWith('/api/v1/notifications', expect.anything())
      expect(result.current.data.unread_count).toBe(3)
      expect(result.current.data.notifications).toHaveLength(1)
    })
  })

  describe('useMarkNotificationRead()', () => {
    it('PATCHes /api/v1/notifications/:id and invalidates the notifications query', async () => {
      request.mockResolvedValue({
        unread_count: 2,
        notification: { ...NOTIFICATION_FIXTURE, id: 7, read_at: '2026-05-01T00:00:00Z' },
      })
      const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: makeWrapper() })

      result.current.mutate(7)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(request).toHaveBeenCalledWith('/api/v1/notifications/7', expect.anything(), {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
    })
  })

  describe('useNotificationsSeen()', () => {
    it('POSTs /api/v1/notifications_seen and invalidates the cache', async () => {
      request.mockResolvedValue({ unread_count: 5 })
      const { result } = renderHook(() => useNotificationsSeen(), { wrapper: makeWrapper() })

      result.current.mutate()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(request).toHaveBeenCalledWith('/api/v1/notifications_seen', expect.anything(), {
        method: 'POST',
        body: JSON.stringify({}),
      })
    })
  })
})
