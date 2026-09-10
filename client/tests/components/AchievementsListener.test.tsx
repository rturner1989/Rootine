import type { Consumer } from '@rails/actioncable'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as CableModule from '../../src/api/cable'
import { queryKeys } from '../../src/api/queryKeys'
import AchievementsListener from '../../src/components/AchievementsListener'
import type { useToast } from '../../src/context/ToastContext'
import type { Achievement } from '../../src/types/achievement'

const toastSuccessMock = vi.fn()
// AchievementsListener only reads `toast.success` — the other ToastContextValue
// members (dismiss/resolve/error/warn/...) are never called by this component.
vi.mock('../../src/context/ToastContext', (): { useToast: () => Pick<ReturnType<typeof useToast>, 'success'> } => ({
  useToast: () => ({ success: toastSuccessMock }),
}))

// AchievementsListener only reads `user.id` — a minimal shape stands in for
// the full `User` (src/types/user.ts) since none of its other required
// fields (name, timezone, stats, ...) are read here, and none of the other
// AuthContextValue members (login/register/logout/...) are called at all.
type MinimalAuthUser = { id: number; email: string } | null
const authState: { user: MinimalAuthUser } = { user: { id: 1, email: 'rob@test.com' } }
vi.mock('../../src/hooks/useAuth', (): { useAuth: () => { user: MinimalAuthUser } } => ({
  useAuth: () => authState,
}))

let receivedHandler: ((payload: unknown) => void) | undefined
vi.mock('../../src/api/cable', (): typeof CableModule => ({
  cableConsumer: (): Consumer => ({
    subscriptions: {
      create: (_channel, handlers) => {
        receivedHandler = handlers?.received
        handlers?.connected?.()
        return { unsubscribe: () => {} }
      },
    },
    disconnect: () => {},
  }),
  disconnectCable: () => {},
}))

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

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('<AchievementsListener />', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    toastSuccessMock.mockClear()
    receivedHandler = undefined
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it('toasts from the validated payload and invalidates the achievements cache', () => {
    render(<AchievementsListener />, { wrapper: makeWrapper(queryClient) })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // The mocked cable `create()` above assigns this synchronously during
    // the effect that render() flushes, so it is always set by here — the
    // throw below fails loud instead of silently no-oping if that broke.
    if (!receivedHandler) throw new Error('expected cable subscription handler to be registered')
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

    if (!receivedHandler) throw new Error('expected cable subscription handler to be registered')
    const handler = receivedHandler
    expect(() => handler({ id: 7, kind: 'login_streak_7' })).not.toThrow()

    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.achievements.all })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
