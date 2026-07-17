import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { disconnectCable } from '../api/cable'
import { apiDelete, apiGet, apiPatch, apiPost, setAccessToken } from '../api/client'

export const AuthContext = createContext(null)

// The signed-in user lives in exactly one place: the ['profile'] query
// cache. The Me page fetches into it; the sidebar, top bar and
// onboarding read it through useAuth().user; and the auth flows below
// seed it. Holding a second copy here would mean two that drift — the
// bug this replaced.
const PROFILE_KEY = ['profile']

// Non-sensitive flag that gates whether we probe /api/v1/token on mount.
// The real refresh token lives in the httpOnly cookie; this hint only
// suppresses the 401-noise on anonymous page loads.
const SESSION_HINT_KEY = 'plantcare:session-hint'

function hasSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === 'true'
  } catch {
    return false
  }
}

function setSessionHint(value) {
  try {
    if (value) {
      localStorage.setItem(SESSION_HINT_KEY, 'true')
    } else {
      localStorage.removeItem(SESSION_HINT_KEY)
    }
  } catch {
    // localStorage may be unavailable (incognito, SSR, disabled cookies).
  }
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  // enabled: false — this observer never fetches, it only subscribes to
  // the cache so useAuth().user re-renders whenever the profile changes,
  // whether that's a seed here or a refetch from the Me page's own query.
  // The queryFn is carried only to match useProfile's, so React Query
  // doesn't warn about a keyed query with no fetcher; it never runs here.
  const { data: user } = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => apiGet('/api/v1/profile'),
    enabled: false,
  })

  const seedProfile = useCallback((profile) => queryClient.setQueryData(PROFILE_KEY, profile), [queryClient])

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/token', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        seedProfile(null)
        setAccessToken(null)
        setSessionHint(false)
        return false
      }

      const data = await response.json()
      setAccessToken(data.access_token)

      const profileResponse = await fetch('/api/v1/profile', {
        headers: { Authorization: `Bearer ${data.access_token}` },
        credentials: 'include',
      })

      if (profileResponse.ok) {
        seedProfile(await profileResponse.json())
        return true
      }

      setSessionHint(false)
      return false
    } catch {
      seedProfile(null)
      setAccessToken(null)
      setSessionHint(false)
      return false
    }
  }, [seedProfile])

  useEffect(() => {
    if (!hasSessionHint()) {
      setLoading(false)
      return
    }
    refreshToken().finally(() => setLoading(false))
  }, [refreshToken])

  const login = useCallback(
    async (email, password) => {
      const data = await apiPost('/api/v1/session', { session: { email, password } })
      setAccessToken(data.access_token)
      seedProfile(data.user)
      setSessionHint(true)
      return data.user
    },
    [seedProfile],
  )

  const register = useCallback(
    async (name, email, password, passwordConfirmation) => {
      const data = await apiPost('/api/v1/registration', {
        user: { name, email, password, password_confirmation: passwordConfirmation },
      })
      setAccessToken(data.access_token)
      seedProfile(data.user)
      setSessionHint(true)
      return data.user
    },
    [seedProfile],
  )

  const markOnboarded = useCallback(async () => {
    seedProfile(await apiPost('/api/v1/onboarding/completion', {}))
  }, [seedProfile])

  // Used by the onboarding wizard, which writes intent/step without the
  // Me page's mutation hooks. Patches the same cache everyone reads.
  const updateUser = useCallback(
    async (data) => {
      const updatedUser = await apiPatch('/api/v1/profile', { user: data })
      seedProfile(updatedUser)
      return updatedUser
    },
    [seedProfile],
  )

  const logout = useCallback(async () => {
    try {
      await apiDelete('/api/v1/session')
    } catch {
      // Expired tokens 401 here — still safe to clear local state below.
    } finally {
      setAccessToken(null)
      setSessionHint(false)
      // Null the profile before clearing, not after: clear() detaches
      // this observer, so a write that follows it never reaches the one
      // reading user. This order leaves user null and the rest of the
      // cache wiped so nothing leaks to the next sign-in.
      seedProfile(null)
      queryClient.clear()
      disconnectCable()
    }
  }, [queryClient, seedProfile])

  const value = useMemo(
    () => ({ user: user ?? null, loading, login, register, logout, refreshToken, markOnboarded, updateUser }),
    [user, loading, login, register, logout, refreshToken, markOnboarded, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
