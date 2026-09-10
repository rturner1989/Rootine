import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import { useUnseenAchievements } from '../../src/hooks/useUnseenAchievements'
import { achievementResponseSchema, achievementsResponseSchema } from '../../src/types/achievement'

vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

const authState = { user: { id: 1, email: 'rob@test.com' } }
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// achievementSchema requires every field — Achievement#as_json's full set.
function achievementFixture(overrides = {}) {
  return {
    id: 7,
    kind: 'login_streak_7',
    label: '7-day visit streak',
    emoji: '⭐',
    earned_at: '2026-05-03T15:00:00Z',
    seen_at: null,
    metadata: {},
    ...overrides,
  }
}

describe('useUnseenAchievements()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches /api/v1/achievements/unseen and exposes the queue', async () => {
    request.mockResolvedValue({
      achievements: [achievementFixture()],
    })

    const { result } = renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(request).toHaveBeenCalledWith('/api/v1/achievements/unseen', achievementsResponseSchema)
    expect(result.current.achievements).toHaveLength(1)
    expect(result.current.achievements[0].kind).toBe('login_streak_7')
  })

  it('returns an empty queue when the endpoint returns no entries', async () => {
    request.mockResolvedValue({ achievements: [] })

    const { result } = renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.achievements).toEqual([])
  })

  it('skips the fetch when no user is authenticated', async () => {
    authState.user = null
    try {
      renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(request).not.toHaveBeenCalled()
    } finally {
      authState.user = { id: 1, email: 'rob@test.com' }
    }
  })

  it('markSeen PATCHes /api/v1/achievements/:id with empty body', async () => {
    // markSeen invalidates both the unseen and all-achievements keys, and
    // the unseen query is still mounted — each invalidateQueries call
    // triggers its own refetch, so a trailing default covers however many
    // land after the ordered initial fetch + PATCH.
    request
      .mockResolvedValueOnce({ achievements: [achievementFixture()] })
      .mockResolvedValueOnce({ achievement: achievementFixture({ seen_at: '2026-05-03T15:00:00Z' }) })
      .mockResolvedValue({ achievements: [] })

    const { result } = renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    result.current.markSeen(7)

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/api/v1/achievements/7', achievementResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    )
  })
})
