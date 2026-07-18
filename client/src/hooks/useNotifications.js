import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, apiPost } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => apiGet('/api/v1/notifications'),
    staleTime: 30_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiPatch(`/api/v1/notifications/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function useNotificationsSeen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost('/api/v1/notifications_seen', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}
