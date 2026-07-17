import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => apiGet('/api/v1/profile'),
  })
}

// One cache holds the profile, and AuthContext.user reads it, so a write
// here updates the sidebar and top bar too. The mutation response is the
// canonical record (as_json with stats), so it patches the cache
// directly rather than triggering a refetch — everyone re-renders from
// the one write.
function useProfileWriteback() {
  const queryClient = useQueryClient()
  return (profile) => queryClient.setQueryData(queryKeys.profile, profile)
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
