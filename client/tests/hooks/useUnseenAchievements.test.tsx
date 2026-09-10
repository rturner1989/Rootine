import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import type { useAuth } from '../../src/hooks/useAuth'
import { useUnseenAchievements } from '../../src/hooks/useUnseenAchievements'
import type { Achievement, AchievementResponse, AchievementsResponse } from '../../src/types/achievement'
import { achievementResponseSchema, achievementsResponseSchema } from '../../src/types/achievement'
import type { User } from '../../src/types/user'

// useUnseenAchievements only reads `request` — setAccessToken/getAccessToken
// are irrelevant to fetching/marking achievements.
vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

const mockedRequest = vi.mocked(request)

// useUnseenAchievements only reads `user` from useAuth() (for the enabled
// gate) — the mock omits loading/login/register/logout/... which it never touches.
const authState: Pick<ReturnType<typeof useAuth>, 'user'> = {
  // Only `user`'s truthiness matters here — a minimal fixture stands in for
  // the full User shape useAuth() actually returns.
  user: { id: 1, email: 'rob@test.com' } as unknown as User,
}
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// achievementSchema requires every field — Achievement#as_json's full set.
function achievementFixture(overrides: Partial<Achievement> = {}): Achievement {
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
    mockedRequest.mockResolvedValue({
      achievements: [achievementFixture()],
    } satisfies AchievementsResponse)

    const { result } = renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedRequest).toHaveBeenCalledWith('/api/v1/achievements/unseen', achievementsResponseSchema)
    expect(result.current.achievements).toHaveLength(1)
    expect(result.current.achievements[0].kind).toBe('login_streak_7')
  })

  it('returns an empty queue when the endpoint returns no entries', async () => {
    mockedRequest.mockResolvedValue({ achievements: [] } satisfies AchievementsResponse)

    const { result } = renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.achievements).toEqual([])
  })

  it('skips the fetch when no user is authenticated', async () => {
    authState.user = null
    try {
      renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(mockedRequest).not.toHaveBeenCalled()
    } finally {
      authState.user = { id: 1, email: 'rob@test.com' } as unknown as User
    }
  })

  it('markSeen PATCHes /api/v1/achievements/:id with empty body', async () => {
    // markSeen invalidates both the unseen and all-achievements keys, and
    // the unseen query is still mounted — each invalidateQueries call
    // triggers its own refetch, so a trailing default covers however many
    // land after the ordered initial fetch + PATCH.
    mockedRequest
      .mockResolvedValueOnce({ achievements: [achievementFixture()] } satisfies AchievementsResponse)
      .mockResolvedValueOnce({
        achievement: achievementFixture({ seen_at: '2026-05-03T15:00:00Z' }),
      } satisfies AchievementResponse)
      .mockResolvedValue({ achievements: [] } satisfies AchievementsResponse)

    const { result } = renderHook(() => useUnseenAchievements(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    result.current.markSeen(7)

    await waitFor(() =>
      expect(mockedRequest).toHaveBeenCalledWith('/api/v1/achievements/7', achievementResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    )
  })
})
