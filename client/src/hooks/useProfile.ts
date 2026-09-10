import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { passwordUpdateResponseSchema, type User, userSchema } from '../types/user'

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

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => request('/api/v1/profile', userSchema),
  })
}

// One cache holds the profile, and AuthContext.user reads it, so a write
// here updates the sidebar and top bar too. The mutation response is the
// canonical record (as_json with stats), so it patches the cache
// directly rather than triggering a refetch — everyone re-renders from
// the one write.
function useProfileWriteback() {
  const queryClient = useQueryClient()
  return (profile: User) => queryClient.setQueryData(queryKeys.profile, profile)
}

// Notification preferences gate what the notifications endpoint returns,
// so a profile write can change the drawer and the bell badge underneath
// us — invalidate those rather than let a muted family linger on screen.
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const writeback = useProfileWriteback()

  return useMutation({
    mutationFn: (data: ProfileUpdate) =>
      request('/api/v1/profile', userSchema, { method: 'PATCH', body: JSON.stringify({ user: data }) }),
    onSuccess: (profile) => {
      writeback(profile)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    },
  })
}

// The avatar is its own resource because it's multipart and clearing it
// is a delete. Both actions return the profile, so the caches patch from
// the response.
export function useUpdateAvatar() {
  const writeback = useProfileWriteback()

  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('avatar', file)
      return request('/api/v1/profile/avatar', userSchema, { method: 'PATCH', body: form })
    },
    onSuccess: writeback,
  })
}

export function useRemoveAvatar() {
  const writeback = useProfileWriteback()

  return useMutation({
    mutationFn: () => request('/api/v1/profile/avatar', userSchema, { method: 'DELETE' }),
    onSuccess: writeback,
  })
}

// The password travels in the body, not the URL. Deliberately no cache
// handling here: the caller signs out afterwards, and AuthContext's
// logout clears the whole cache — invalidating queries for a user that
// no longer exists would just refetch 401s on the way out.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: ({ currentPassword }: { currentPassword: string }) =>
      request('/api/v1/profile', z.void(), {
        method: 'DELETE',
        body: JSON.stringify({ current_password: currentPassword }),
      }),
  })
}

// No cache invalidation — password isn't part of any cached response body,
// so there's nothing to refresh after a successful change.
export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      password,
      passwordConfirmation,
    }: {
      currentPassword: string
      password: string
      passwordConfirmation: string
    }) =>
      request('/api/v1/profile/password', passwordUpdateResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          user: { password, password_confirmation: passwordConfirmation },
        }),
      }),
  })
}
