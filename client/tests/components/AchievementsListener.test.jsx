import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../src/api/queryKeys'
import AchievementsListener from '../../src/components/AchievementsListener'

const toastSuccessMock = vi.fn()
vi.mock('../../src/context/ToastContext', () => ({
  useToast: () => ({ success: toastSuccessMock }),
}))

const authState = { user: { id: 1, email: 'rob@test.com' } }
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

let receivedHandler
vi.mock('../../src/api/cable', () => ({
  cableConsumer: () => ({
    subscriptions: {
      create: (_channel, handlers) => {
        receivedHandler = handlers.received
        handlers.connected?.()
        return { unsubscribe: () => {} }
      },
    },
  }),
}))

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

function makeWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('<AchievementsListener />', () => {
  let queryClient

  beforeEach(() => {
    toastSuccessMock.mockClear()
    receivedHandler = undefined
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it('toasts from the validated payload and invalidates the achievements cache', () => {
    render(<AchievementsListener />, { wrapper: makeWrapper(queryClient) })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    receivedHandler(achievementFixture())

    expect(toastSuccessMock).toHaveBeenCalledWith({
      title: 'Achievement unlocked',
      meta: '⭐ 7-day visit streak',
      duration: 6000,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.achievements.all })
  })

  // Proves the safeParse fix: a malformed broadcast must not throw out of
  // the subscription's received callback (that would kill invalidateQueries
  // along with the toast — strictly worse than the unvalidated read it
  // replaces), must skip the toast, but still invalidates so the bell and
  // achievements list refresh through the already-validated REST path.
  it('does not throw on a malformed broadcast, skips the toast, but still invalidates', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AchievementsListener />, { wrapper: makeWrapper(queryClient) })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    expect(() => receivedHandler({ id: 7, kind: 'login_streak_7' })).not.toThrow()

    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.achievements.all })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
