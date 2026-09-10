import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { disconnectCable } from '../api/cable'
import { request, setAccessToken } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { authResponseSchema, tokenResponseSchema } from '../types/auth'
import { type User, userSchema } from '../types/user'

type ProfileUpdate = Partial<
  Pick<
    User,
    | 'name'
    | 'email'
    | 'timezone'
    | 'onboarding_intent'
    | 'onboarding_step_reached'
    | 'latitude'
    | 'longitude'
    | 'location_label'
    | 'notify_care_reminders'
    | 'notify_achievements'
  >
>

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<User>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  markOnboarded: () => Promise<void>
  updateUser: (data: ProfileUpdate) => Promise<User>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

// The signed-in user lives in exactly one place: the profile query
// cache. The Me page fetches into it; the sidebar, top bar and
// onboarding read it through useAuth().user; and the auth flows below
// seed it. Holding a second copy here would mean two that drift — the
// bug this replaced.

// Non-sensitive flag that gates whether we probe /api/v1/token on mount.
// The real refresh token lives in the httpOnly cookie; this hint only
// suppresses the 401-noise on anonymous page loads.
const SESSION_HINT_KEY = 'plantcare:session-hint'

function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === 'true'
  } catch {
    return false
  }
}

function setSessionHint(value: boolean): void {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  // enabled: false — this observer never fetches, it only subscribes to
  // the cache so useAuth().user re-renders whenever the profile changes,
  // whether that's a seed here or a refetch from the Me page's own query.
  // The queryFn is carried only to match useProfile's, so React Query
  // doesn't warn about a keyed query with no fetcher; it never runs here.
  const { data: user } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => request('/api/v1/profile', userSchema),
    enabled: false,
  })

  const seedProfile = useCallback(
    (profile: User | null) => queryClient.setQueryData(queryKeys.profile, profile),
    [queryClient],
  )

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

      const data = tokenResponseSchema.parse(await response.json())
      setAccessToken(data.access_token)

      const profileResponse = await fetch('/api/v1/profile', {
        headers: { Authorization: `Bearer ${data.access_token}` },
        credentials: 'include',
      })

      if (profileResponse.ok) {
        seedProfile(userSchema.parse(await profileResponse.json()))
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
    async (email: string, password: string) => {
      const data = await request('/api/v1/session', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ session: { email, password } }),
      })
      setAccessToken(data.access_token)
      seedProfile(data.user)
      setSessionHint(true)
      return data.user
    },
    [seedProfile],
  )

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string) => {
      const data = await request('/api/v1/registration', authResponseSchema, {
        method: 'POST',
        body: JSON.stringify({
          user: { name, email, password, password_confirmation: passwordConfirmation },
        }),
      })
      setAccessToken(data.access_token)
      seedProfile(data.user)
      setSessionHint(true)
      return data.user
    },
    [seedProfile],
  )

  const markOnboarded = useCallback(async () => {
    seedProfile(
      await request('/api/v1/onboarding/completion', userSchema, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    )
  }, [seedProfile])

  // Used by the onboarding wizard, which writes intent/step without the
  // Me page's mutation hooks. Patches the same cache everyone reads.
  const updateUser = useCallback(
    async (data: ProfileUpdate) => {
      const updatedUser = await request('/api/v1/profile', userSchema, {
        method: 'PATCH',
        body: JSON.stringify({ user: data }),
      })
      seedProfile(updatedUser)
      return updatedUser
    },
    [seedProfile],
  )

  const logout = useCallback(async () => {
    try {
      await request('/api/v1/session', z.void(), { method: 'DELETE' })
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
