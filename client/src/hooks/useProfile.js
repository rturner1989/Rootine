import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch } from '../api/client'
import { useAuth } from './useAuth'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet('/api/v1/profile'),
  })
}

// The profile is cached twice: here, and as AuthContext.user, which the
// sidebar, top bar and onboarding read. Every write has to land in both
// or the chrome renders a stale name and avatar until the next reload.
//
// The query invalidates rather than patches — Me is on screen during
// these mutations, so it refetches on its own. AuthContext isn't a query
// and has nothing to refetch it, so it takes the response directly.
function useProfileWriteback() {
  const queryClient = useQueryClient()
  const { syncUser } = useAuth()

  return (profile) => {
    syncUser(profile)
    queryClient.invalidateQueries({ queryKey: ['profile'] })
  }
}

// Notification preferences gate what the notifications endpoint returns,
// so a profile write can change the drawer and the bell badge underneath
// us — invalidate those rather than let a muted family linger on screen.
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const writeback = useProfileWriteback()

  return useMutation({
    mutationFn: (data) => apiPatch('/api/v1/profile', { user: data }),
    onSuccess: (profile) => {
      writeback(profile)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// The avatar is its own resource because it's multipart and clearing it
// is a delete. Both actions return the profile, so the caches patch from
// the response.
export function useUpdateAvatar() {
  const writeback = useProfileWriteback()

  return useMutation({
    mutationFn: (file) => {
      const form = new FormData()
      form.append('avatar', file)
      return apiPatch('/api/v1/profile/avatar', form)
    },
    onSuccess: writeback,
  })
}

export function useRemoveAvatar() {
  const writeback = useProfileWriteback()

  return useMutation({
    mutationFn: () => apiDelete('/api/v1/profile/avatar'),
    onSuccess: writeback,
  })
}

// The password travels in the body, not the URL. Deliberately no cache
// handling here: the caller signs out afterwards, and AuthContext's
// logout clears the whole cache — invalidating queries for a user that
// no longer exists would just refetch 401s on the way out.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: ({ currentPassword }) => apiDelete('/api/v1/profile', { current_password: currentPassword }),
  })
}

// No cache invalidation — password isn't part of any cached response body,
// so there's nothing to refresh after a successful change.
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, password, passwordConfirmation }) =>
      apiPatch('/api/v1/profile/password', {
        current_password: currentPassword,
        user: { password, password_confirmation: passwordConfirmation },
      }),
  })
}
