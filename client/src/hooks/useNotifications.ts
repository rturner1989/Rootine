import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import {
  notificationsResponseSchema,
  notificationsSeenResponseSchema,
  notificationUpdateResponseSchema,
} from '../types/notification'

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => request('/api/v1/notifications', notificationsResponseSchema),
    staleTime: 30_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      request(`/api/v1/notifications/${id}`, notificationUpdateResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function useNotificationsSeen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      request('/api/v1/notifications_seen', notificationsSeenResponseSchema, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}
