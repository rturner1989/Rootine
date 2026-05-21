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
    },
  })
}
