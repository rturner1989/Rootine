import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request, setAccessToken } from '../../src/api/client'
import { AuthProvider } from '../../src/context/AuthContext'
import { useAuth } from '../../src/hooks/useAuth'
import { authResponseSchema } from '../../src/types/auth'

vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
  setAccessToken: vi.fn(),
}))

let queryClient

function wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

const SESSION_HINT_KEY = 'plantcare:session-hint'

// Every userSchema field beyond id/email/name, matching a fresh,
// never-onboarded account's defaults — User#as_json's field list
// (api/app/models/user.rb) and db/schema.rb's column defaults
// (notify_* true, onboarding_step_reached 0, timezone "UTC", the rest
// nullable with no default). userSchema has no optional fields besides
// `stats`, so a fixture missing any of these fails `.parse()` the same
// way a real response missing them would.
const BASE_USER_FIELDS = {
  timezone: 'UTC',
  onboarded: false,
  onboarding_intent: null,
  onboarding_step_reached: 0,
  avatar_url: null,
  latitude: null,
  longitude: null,
  location_label: null,
  notify_care_reminders: true,
  notify_achievements: true,
  joined_on: '2026-01-15',
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Default: no session hint in localStorage, so the AuthProvider skips the
    // refresh probe on mount and resolves to anonymous immediately. Tests that
    // want to exercise the refresh flow set the hint explicitly.
    localStorage.clear()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.mocked(request).mockReset()
    vi.mocked(setAccessToken).mockReset()
  })

  describe('useAuth hook', () => {
    it('throws when used outside an AuthProvider', () => {
      // Suppress React's error-boundary warning in test output
      const originalError = console.error
      console.error = vi.fn()

      function BadComponent() {
        useAuth()
        return null
      }

      expect(() => render(<BadComponent />)).toThrow('useAuth must be used within an AuthProvider')

      console.error = originalError
    })
  })

  describe('initial session restore', () => {
    it('skips the refresh probe entirely when no session hint is set', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 401 })
      vi.stubGlobal('fetch', fetchSpy)

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.user).toBeNull()
      // Key assertion: /api/v1/token was NOT called because there was no hint
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('attempts the refresh probe when a session hint is present', async () => {
      localStorage.setItem(SESSION_HINT_KEY, 'true')
      const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 401 })
      vi.stubGlobal('fetch', fetchSpy)

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.user).toBeNull()
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/token', expect.objectContaining({ method: 'POST' }))
      // The 401 response should have cleared the now-stale hint
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
    })

    it('restores the session on mount when the hint is set and the refresh cookie is valid', async () => {
      localStorage.setItem(SESSION_HINT_KEY, 'true')
      const restoredUser = { ...BASE_USER_FIELDS, id: 1, email: 'restored@example.com', name: 'Restored User' }
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'fresh-token' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => restoredUser,
          }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(restoredUser)
      })
      expect(result.current.loading).toBe(false)
      expect(setAccessToken).toHaveBeenCalledWith('fresh-token')
      // Hint survives a successful restore
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('true')
    })

    it('leaves user=null and clears the hint when the profile fetch fails after refresh', async () => {
      localStorage.setItem(SESSION_HINT_KEY, 'true')
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'fresh-token' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
          }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.user).toBeNull()
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
    })
  })

  describe('login', () => {
    it('updates user state, stores the access token, and sets the session hint on success', async () => {
      const loggedInUser = { ...BASE_USER_FIELDS, id: 1, email: 'test@example.com', name: 'Test User' }
      vi.mocked(request).mockResolvedValueOnce({
        access_token: 'login-token',
        user: loggedInUser,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.login('test@example.com', 'password')
      })

      // user now derives from the ['profile'] cache, so it lands on the
      // next tick after the seed rather than synchronously.
      await waitFor(() => expect(result.current.user).toEqual(loggedInUser))
      expect(setAccessToken).toHaveBeenCalledWith('login-token')
      expect(request).toHaveBeenCalledWith('/api/v1/session', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ session: { email: 'test@example.com', password: 'password' } }),
      })
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('true')
    })

    it('throws and leaves user state unchanged when login fails', async () => {
      vi.mocked(request).mockRejectedValueOnce(new Error('Invalid email or password'))

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.login('test@example.com', 'wrong')).rejects.toThrow('Invalid email or password')
      })

      expect(result.current.user).toBeNull()
    })
  })

  describe('register', () => {
    it('updates user state on successful registration', async () => {
      const registeredUser = { ...BASE_USER_FIELDS, id: 2, email: 'new@example.com', name: 'New User' }
      vi.mocked(request).mockResolvedValueOnce({
        access_token: 'register-token',
        user: registeredUser,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.register('New User', 'new@example.com', 'password', 'password')
      })

      await waitFor(() => expect(result.current.user).toEqual(registeredUser))
      expect(setAccessToken).toHaveBeenCalledWith('register-token')
      expect(request).toHaveBeenCalledWith('/api/v1/registration', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify({
          user: {
            name: 'New User',
            email: 'new@example.com',
            password: 'password',
            password_confirmation: 'password',
          },
        }),
      })
    })

    it('throws and leaves user state unchanged when registration fails', async () => {
      vi.mocked(request).mockRejectedValueOnce(new Error('Email already taken'))

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.register('New User', 'dup@example.com', 'pw', 'pw')).rejects.toThrow(
          'Email already taken',
        )
      })

      expect(result.current.user).toBeNull()
    })
  })

  describe('logout', () => {
    async function loginAsTestUser(result) {
      vi.mocked(request).mockResolvedValueOnce({
        access_token: 'token',
        user: { ...BASE_USER_FIELDS, id: 1, email: 'test@example.com', name: 'Test' },
      })
      await act(async () => {
        await result.current.login('test@example.com', 'pw')
      })
    }

    it('clears user state, access token, and session hint on successful logout', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      await loginAsTestUser(result)
      await waitFor(() => expect(result.current.user).not.toBeNull())
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('true')

      // 204 No Content — request() resolves z.void() calls with undefined.
      vi.mocked(request).mockResolvedValueOnce(undefined)
      await act(async () => {
        await result.current.logout()
      })

      await waitFor(() => expect(result.current.user).toBeNull())
      expect(request).toHaveBeenCalledWith('/api/v1/session', expect.anything(), { method: 'DELETE' })
      expect(setAccessToken).toHaveBeenLastCalledWith(null)
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
    })

    it('clears the query cache on logout so cached data cannot leak to the next user', async () => {
      queryClient.setQueryData(['spaces'], [{ id: 1, name: 'Kitchen' }])
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      await loginAsTestUser(result)

      vi.mocked(request).mockResolvedValueOnce(undefined)
      await act(async () => {
        await result.current.logout()
      })

      expect(queryClient.getQueryData(['spaces'])).toBeUndefined()
    })

    it('still clears client state even when the logout API call fails', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      await loginAsTestUser(result)

      // Simulate the logout endpoint failing (e.g. token already expired
      // server-side). The finally block should still clear local state.
      vi.mocked(request).mockRejectedValueOnce(new Error('Network error'))
      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(setAccessToken).toHaveBeenLastCalledWith(null)
    })
  })
})
