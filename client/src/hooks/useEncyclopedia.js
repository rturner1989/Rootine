import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/queryKeys'

// pet_safe is only sent when explicitly true — the browse endpoint treats a
// missing flag as "no filter", and false would read as "show me toxic ones",
// which isn't a thing the UI offers. difficulty/light are arrays; join to a
// comma list (the backend splits on comma).
function browseQuery(filters) {
  const params = new URLSearchParams({ browse: '1' })
  if (filters.petSafe) params.set('pet_safe', 'true')
  if (filters.difficulty?.length) params.set('difficulty', filters.difficulty.join(','))
  if (filters.light?.length) params.set('light', filters.light.join(','))
  return params.toString()
}

export function useEncyclopediaBrowse(filters) {
  return useQuery({
    queryKey: queryKeys.species.browse(filters),
    queryFn: () => apiGet(`/api/v1/species?${browseQuery(filters)}`),
    // Keep the current grid on screen while a filter change refetches —
    // otherwise every Apply flashes the whole grid to a spinner (the
    // queryKey changes to an uncached one). Matches useSpeciesSearch.
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  })
}

export function useEncyclopediaGrouped(filters) {
  return useQuery({
    queryKey: queryKeys.species.grouped(filters),
    queryFn: () => apiGet(`/api/v1/species?${browseQuery(filters)}&group=spaces`),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  })
}
