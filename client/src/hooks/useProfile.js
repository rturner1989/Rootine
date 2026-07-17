import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch } from '../api/client'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet('/api/v1/profile'),
  })
}

// Notification preferences live on the profile but gate what the
// notifications endpoint returns, so a profile write can change the
// drawer and the bell badge underneath us — invalidate both rather than
// let a muted family linger on screen.
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => apiPatch('/api/v1/profile', { user: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
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
