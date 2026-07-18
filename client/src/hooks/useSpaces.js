import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function useSpaces({ enabled = true, scope = 'active' } = {}) {
  const queryParam = scope === 'active' ? '' : `?scope=${scope}`
  return useQuery({
    queryKey: queryKeys.spaces.list(scope),
    queryFn: () => apiGet(`/api/v1/spaces${queryParam}`),
    enabled,
  })
}

export function useArchiveSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiPost(`/api/v1/spaces/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useUnarchiveSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiDelete(`/api/v1/spaces/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useSpacePresets({ enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.spaces.presets,
    queryFn: () => apiGet('/api/v1/spaces/presets'),
    enabled,
  })
}

export function useSpace(id) {
  return useQuery({
    queryKey: queryKeys.spaces.detail(id),
    queryFn: () => apiGet(`/api/v1/spaces/${id}`),
    enabled: !!id,
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => apiPost('/api/v1/spaces', { space: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => apiPatch(`/api/v1/spaces/${id}`, { space: data }),
    onSuccess: (updatedSpace) => {
      // Patch every cached spaces list (active / archived / all) with the
      // updated record so subsequent reads — including Step 4 remount on
      // Back nav — see the new env immediately, without waiting for a
      // refetch round-trip. Plants reschedule on the server, so their
      // cache also needs invalidating.
      queryClient.setQueriesData({ queryKey: queryKeys.spaces.all }, (existing) => {
        if (!Array.isArray(existing)) return existing
        return existing.map((space) => (space.id === updatedSpace.id ? updatedSpace : space))
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
    },
  })
}

export function useDeleteSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => apiDelete(`/api/v1/spaces/${id}`),
    onSuccess: () => {
      // Server-side cascade deletes the space's plants too — refetch
      // the plant + dashboard queries so Today / House stop rendering
      // ghost rows for plants that no longer exist.
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}
