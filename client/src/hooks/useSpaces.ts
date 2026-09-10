import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { type Space, spacePresetSchema, spaceSchema } from '../types/space'

type SpaceWriteData = {
  name?: string
  icon?: string | null
  category?: string
  light_level?: string
  temperature_level?: string
  humidity_level?: string
}

export function useSpaces({ enabled = true, scope = 'active' }: { enabled?: boolean; scope?: string } = {}) {
  const queryParam = scope === 'active' ? '' : `?scope=${scope}`
  return useQuery({
    queryKey: queryKeys.spaces.list(scope),
    queryFn: () => request(`/api/v1/spaces${queryParam}`, z.array(spaceSchema)),
    enabled,
  })
}

export function useArchiveSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      request(`/api/v1/spaces/${id}/archive`, spaceSchema, { method: 'POST', body: JSON.stringify({}) }),
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
    mutationFn: (id: number) => request(`/api/v1/spaces/${id}/archive`, spaceSchema, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useSpacePresets({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.spaces.presets,
    queryFn: () => request('/api/v1/spaces/presets', z.array(spacePresetSchema)),
    enabled,
  })
}

export function useSpace(id?: number | string | null) {
  return useQuery({
    queryKey: queryKeys.spaces.detail(Number(id)),
    queryFn: () => request(`/api/v1/spaces/${id}`, spaceSchema),
    enabled: !!id,
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SpaceWriteData) =>
      request('/api/v1/spaces', spaceSchema, { method: 'POST', body: JSON.stringify({ space: data }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: SpaceWriteData & { id: number }) =>
      request(`/api/v1/spaces/${id}`, spaceSchema, { method: 'PATCH', body: JSON.stringify({ space: data }) }),
    onSuccess: (updatedSpace) => {
      // Patch every cached spaces list (active / archived / all) with the
      // updated record so subsequent reads — including Step 4 remount on
      // Back nav — see the new env immediately, without waiting for a
      // refetch round-trip. Plants reschedule on the server, so their
      // cache also needs invalidating.
      queryClient.setQueriesData<Space[]>({ queryKey: queryKeys.spaces.all }, (existing) => {
        if (!Array.isArray(existing)) return existing
        return existing.map((space) => (space.id === updatedSpace.id ? updatedSpace : space))
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      // Space env drives which species suit it — reflow the grouped view.
      queryClient.invalidateQueries({ queryKey: ['species', 'browse', 'grouped'] })
    },
  })
}

export function useDeleteSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => request(`/api/v1/spaces/${id}`, z.void(), { method: 'DELETE' }),
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
