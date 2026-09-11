import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { speciesIndexResultSchema, speciesSchema } from '../types/species'

type SpeciesLookupFallback = {
  common_name: string
  scientific_name: string
  image_url: string
}

export function isSearchQuery(query: unknown): query is string {
  return typeof query === 'string' && query.trim().length >= 2
}

export function useSpeciesSearch(query: string) {
  const isSearching = isSearchQuery(query)
  return useQuery({
    queryKey: isSearching ? queryKeys.species.search(query) : queryKeys.species.popular,
    queryFn: () =>
      isSearching
        ? request(`/api/v1/species?q=${encodeURIComponent(query)}`, z.array(speciesIndexResultSchema))
        : request('/api/v1/species', z.array(speciesSchema)),
    // Reuse previous results only within the same mode — showing the
    // popular list while a search fetch is in flight (or vice-versa)
    // flashes unrelated data onto the screen mid-transition.
    placeholderData: (previousData, previousQuery) => {
      const previousWasSearching = previousQuery?.queryKey?.[1] === 'search'
      return previousWasSearching === isSearching ? previousData : undefined
    },
    staleTime: 1000 * 60 * 5,
  })
}

// Fetches a species by local id, or by Perenual id when `perenualId` is
// given — the latter is for search results the catalogue hasn't cached yet.
// The show endpoint reads perenual_id, fetches + persists it, and returns
// the full record; `fallback` (name/image from the search summary) lets the
// page render immediately even if Perenual is briefly unreachable.
export function useSpecies(
  id?: number | string | null,
  {
    enabled = true,
    perenualId = null,
    fallback = null,
  }: { enabled?: boolean; perenualId?: string | null; fallback?: SpeciesLookupFallback | null } = {},
) {
  return useQuery({
    queryKey: perenualId ? ['species', 'perenual', String(perenualId)] : queryKeys.species.detail(Number(id)),
    queryFn: () => {
      if (!perenualId) return request(`/api/v1/species/${id}`, speciesSchema)

      const params = new URLSearchParams({ perenual_id: String(perenualId), ...(fallback ?? {}) })
      return request(`/api/v1/species/lookup?${params}`, speciesSchema)
    },
    enabled: enabled && (perenualId ? true : !!id),
  })
}
