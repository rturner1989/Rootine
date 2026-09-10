import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { speciesBrowsePayloadSchema, speciesGroupedPayloadSchema } from '../types/species'

// Mirrors the FilterDraft shape readEncyclopediaFilters (untyped JS,
// components/encyclopedia/filter/config.js) produces off ENCYCLOPEDIA_FILTER_SCHEMA.
type EncyclopediaFilters = {
  petSafe?: boolean | null
  difficulty?: string[]
  light?: string[]
}

// pet_safe is only sent when explicitly true — the browse endpoint treats a
// missing flag as "no filter", and false would read as "show me toxic ones",
// which isn't a thing the UI offers. difficulty/light are arrays; join to a
// comma list (the backend splits on comma).
function browseQuery(filters: EncyclopediaFilters): string {
  const params = new URLSearchParams({ browse: '1' })
  if (filters.petSafe) params.set('pet_safe', 'true')
  if (filters.difficulty?.length) params.set('difficulty', filters.difficulty.join(','))
  if (filters.light?.length) params.set('light', filters.light.join(','))
  return params.toString()
}

export function useEncyclopediaBrowse(filters: EncyclopediaFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.species.browse(filters),
    queryFn: () => request(`/api/v1/species?${browseQuery(filters)}`, speciesBrowsePayloadSchema),
    // Keep the current grid on screen while a filter change refetches —
    // otherwise every Apply flashes the whole grid to a spinner (the
    // queryKey changes to an uncached one). Matches useSpeciesSearch.
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}

export function useEncyclopediaGrouped(filters: EncyclopediaFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.species.grouped(filters),
    queryFn: () => request(`/api/v1/species?${browseQuery(filters)}&group=spaces`, speciesGroupedPayloadSchema),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}
