import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { careLogSchema } from '../types/careLog'
import { plantSchema } from '../types/plant'

type PlantWriteData = {
  species_id?: number | null
  // Required, not optional — both real callers (StepDetails on create,
  // EditPlantDialog on update) always send a concrete id, never omit it or
  // send null. Rails handles it inconsistently on the two actions this type
  // covers: plants_controller.rb's plant_params whitelist never includes
  // space_id at all. On create, set_space reads params.dig(:plant, :space_id)
  // directly (outside plant_params) and 404s if the space isn't found — so
  // it's de facto required there. On update, there's no equivalent read, so
  // a space_id sent on PATCH is silently dropped by the server. That gap is
  // a known, separately-ticketed Rails bug — this type describes what the
  // client sends, not what the server currently does with it.
  space_id: number
  nickname?: string
  notes?: string | null
  acquired_at?: string | null
  last_watered_at?: string | null
  last_fed_at?: string | null
}

type CareLogWriteData = {
  care_type: string
  performed_at?: string
  notes?: string | null
}

export function usePlants(spaceId?: number | null) {
  return useQuery({
    queryKey: queryKeys.plants.list(spaceId),
    queryFn: () => request(`/api/v1/plants${spaceId ? `?space_id=${spaceId}` : ''}`, z.array(plantSchema)),
  })
}

// `id` arrives as a string from useParams() at the Plant Detail route —
// the URL interpolation doesn't care about the type, but queryKeys.plants
// keys off a number, so the cache key coerces it. Nothing reads this
// specific detail key by exact match (invalidation elsewhere goes through
// the ['plants'] prefix), so the coercion doesn't change observable
// behaviour — only the query's own key stays internally consistent.
export function usePlant(id?: number | string | null) {
  return useQuery({
    queryKey: queryKeys.plants.detail(Number(id)),
    queryFn: () => request(`/api/v1/plants/${id}`, plantSchema),
    enabled: !!id,
  })
}

export function useCreatePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PlantWriteData) =>
      request('/api/v1/plants', plantSchema, { method: 'POST', body: JSON.stringify({ plant: data }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all })
      // The Me page's stats (plant count, vitality) are the same
      // aggregates the dashboard shows, so they go stale on the same
      // events. The profile cache also backs the sidebar.
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useUpdatePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: PlantWriteData & { id: number }) =>
      request(`/api/v1/plants/${id}`, plantSchema, { method: 'PATCH', body: JSON.stringify({ plant: data }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all })
      // Rescheduling on an environment change moves vitality.
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useDeletePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => request(`/api/v1/plants/${id}`, z.void(), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useCareLogs(plantId?: number | null, careType?: string) {
  const queryParams = careType ? `?care_type=${careType}` : ''
  return useQuery({
    queryKey: queryKeys.plants.careLogs(Number(plantId), careType),
    queryFn: () => request(`/api/v1/plants/${plantId}/care_logs${queryParams}`, z.array(careLogSchema)),
    enabled: !!plantId,
  })
}

// `plantId` arrives as `plant?.id` at every real call site (ActionWheel,
// QuickDialog, LogCareDialog, DayRituals) — the wheel/dialog renders
// unconditionally even while its plant prop is transiently null, so the
// hook has to accept `undefined` the same way usePlant/useCareLogs do.
// mutate() is only ever invoked once a plant exists.
export function useLogCare(plantId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CareLogWriteData) =>
      request(`/api/v1/plants/${plantId}/care_logs`, careLogSchema, {
        method: 'POST',
        body: JSON.stringify({ care_log: data }),
      }),
    onSuccess: () => {
      // Guards the same "always real by the time mutate() succeeds"
      // invariant the doc comment above describes, without asserting past
      // the type system — every consumer gates mutate() on a real plant,
      // but nothing stops a future one from skipping that.
      if (plantId == null) return

      // Prefix-cascades to ['plants', plantId, 'careLogs', ...] too.
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.detail(plantId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.plants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      // A care log is also a journal event — refresh the timeline.
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all })
      // Care logs move the streak, care-log count and vitality — all on
      // the Me page's stats.
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}
