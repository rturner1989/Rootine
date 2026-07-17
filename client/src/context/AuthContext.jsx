import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { disconnectCable } from '../api/cable'
import { apiDelete, apiPatch, apiPost, setAccessToken } from '../api/client'

export const AuthContext = createContext(null)

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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/token', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        setUser(null)
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
        const userData = await profileResponse.json()
        setUser(userData)
        return true
      }

      setSessionHint(false)
      return false
    } catch {
      setUser(null)
      setAccessToken(null)
      setSessionHint(false)
      return false
    }
  }, [])

  useEffect(() => {
    if (!hasSessionHint()) {
      setLoading(false)
      return
    }
    refreshToken().finally(() => setLoading(false))
  }, [refreshToken])

  const login = useCallback(async (email, password) => {
    const data = await apiPost('/api/v1/session', { session: { email, password } })
    setAccessToken(data.access_token)
    setUser(data.user)
    setSessionHint(true)
    return data.user
  }, [])

  const register = useCallback(async (name, email, password, passwordConfirmation) => {
    const data = await apiPost('/api/v1/registration', {
      user: { name, email, password, password_confirmation: passwordConfirmation },
    })
    setAccessToken(data.access_token)
    setUser(data.user)
    setSessionHint(true)
    return data.user
  }, [])

  const markOnboarded = useCallback(async () => {
    const updatedUser = await apiPost('/api/v1/onboarding/completion', {})
    setUser(updatedUser)
  }, [])

  // Keeps AuthContext.user in sync after a profile patch — consumers
  // reading useAuth().user pick up the new value without a separate refetch.
  const updateUser = useCallback(async (data) => {
    const updatedUser = await apiPatch('/api/v1/profile', { user: data })
    setUser(updatedUser)
    return updatedUser
  }, [])

  // The user lives in two places: here, where the sidebar, top bar and
  // onboarding read it, and in the ['profile'] query the Me page reads.
  // Profile mutations go through TanStack, so they hand the fresh record
  // back here — otherwise the chrome keeps rendering the old avatar until
  // a reload.
  const syncUser = useCallback((profile) => setUser(profile), [])

  const logout = useCallback(async () => {
    try {
      await apiDelete('/api/v1/session')
    } catch {
      // Expired tokens 401 here — still safe to clear local state below.
    } finally {
      setAccessToken(null)
      setUser(null)
      setSessionHint(false)
      queryClient.clear()
      disconnectCable()
    }
  }, [queryClient])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshToken, markOnboarded, updateUser, syncUser }),
    [user, loading, login, register, logout, refreshToken, markOnboarded, updateUser, syncUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
