import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiDelete, apiPost, setAccessToken } from '../../src/api/client'
import { AuthProvider } from '../../src/context/AuthContext'
import { useAuth } from '../../src/hooks/useAuth'

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
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
    vi.mocked(apiPost).mockReset()
    vi.mocked(apiDelete).mockReset()
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
            json: async () => ({ id: 1, email: 'restored@example.com', name: 'Restored User' }),
          }),
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: 1,
          email: 'restored@example.com',
          name: 'Restored User',
        })
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
      vi.mocked(apiPost).mockResolvedValueOnce({
        access_token: 'login-token',
        user: { id: 1, email: 'test@example.com', name: 'Test User' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.login('test@example.com', 'password')
      })

      // user now derives from the ['profile'] cache, so it lands on the
      // next tick after the seed rather than synchronously.
      await waitFor(() => expect(result.current.user).toEqual({ id: 1, email: 'test@example.com', name: 'Test User' }))
      expect(setAccessToken).toHaveBeenCalledWith('login-token')
      expect(apiPost).toHaveBeenCalledWith('/api/v1/session', {
        session: { email: 'test@example.com', password: 'password' },
      })
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('true')
    })

    it('throws and leaves user state unchanged when login fails', async () => {
      vi.mocked(apiPost).mockRejectedValueOnce(new Error('Invalid email or password'))

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
      vi.mocked(apiPost).mockResolvedValueOnce({
        access_token: 'register-token',
        user: { id: 2, email: 'new@example.com', name: 'New User' },
      })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.register('New User', 'new@example.com', 'password', 'password')
      })

      await waitFor(() => expect(result.current.user).toEqual({ id: 2, email: 'new@example.com', name: 'New User' }))
      expect(setAccessToken).toHaveBeenCalledWith('register-token')
      expect(apiPost).toHaveBeenCalledWith('/api/v1/registration', {
        user: {
          name: 'New User',
          email: 'new@example.com',
          password: 'password',
          password_confirmation: 'password',
        },
      })
    })

    it('throws and leaves user state unchanged when registration fails', async () => {
      vi.mocked(apiPost).mockRejectedValueOnce(new Error('Email already taken'))

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
      vi.mocked(apiPost).mockResolvedValueOnce({
        access_token: 'token',
        user: { id: 1, email: 'test@example.com', name: 'Test' },
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

      vi.mocked(apiDelete).mockResolvedValueOnce(null)
      await act(async () => {
        await result.current.logout()
      })

      await waitFor(() => expect(result.current.user).toBeNull())
      expect(apiDelete).toHaveBeenCalledWith('/api/v1/session')
      expect(setAccessToken).toHaveBeenLastCalledWith(null)
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
    })

    it('clears the query cache on logout so cached data cannot leak to the next user', async () => {
      queryClient.setQueryData(['spaces'], [{ id: 1, name: 'Kitchen' }])
      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      await loginAsTestUser(result)

      vi.mocked(apiDelete).mockResolvedValueOnce(null)
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
      vi.mocked(apiDelete).mockRejectedValueOnce(new Error('Network error'))
      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(setAccessToken).toHaveBeenLastCalledWith(null)
    })
  })
})
