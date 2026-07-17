import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../api/client'

export function usePlants(spaceId) {
  return useQuery({
    queryKey: spaceId ? ['plants', { spaceId }] : ['plants'],
    queryFn: () => apiGet(`/api/v1/plants${spaceId ? `?space_id=${spaceId}` : ''}`),
  })
}

export function usePlant(id) {
  return useQuery({
    queryKey: ['plants', id],
    queryFn: () => apiGet(`/api/v1/plants/${id}`),
    enabled: !!id,
  })
}

export function useCreatePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => apiPost('/api/v1/plants', { plant: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      // The Me page's stats (plant count, vitality) are the same
      // aggregates the dashboard shows, so they go stale on the same
      // events. The profile cache also backs the sidebar.
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useUpdatePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => apiPatch(`/api/v1/plants/${id}`, { plant: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      queryClient.invalidateQueries({ queryKey: ['plants', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      // Rescheduling on an environment change moves vitality.
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useDeletePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiDelete(`/api/v1/plants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useCareLogs(plantId, careType) {
  const queryParams = careType ? `?care_type=${careType}` : ''
  return useQuery({
    queryKey: ['plants', plantId, 'careLogs', careType],
    queryFn: () => apiGet(`/api/v1/plants/${plantId}/care_logs${queryParams}`),
    enabled: !!plantId,
  })
}

export function useLogCare(plantId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => apiPost(`/api/v1/plants/${plantId}/care_logs`, { care_log: data }),
    onSuccess: () => {
      // Prefix-cascades to ['plants', plantId, 'careLogs', ...] too
      queryClient.invalidateQueries({ queryKey: ['plants', plantId] })
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      // A care log is also a journal event — refresh the timeline.
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      // Care logs move the streak, care-log count and vitality — all on
      // the Me page's stats.
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
