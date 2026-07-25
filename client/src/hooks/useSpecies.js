import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/queryKeys'

export function isSearchQuery(query) {
  return typeof query === 'string' && query.trim().length >= 2
}

export function useSpeciesSearch(query) {
  const isSearching = isSearchQuery(query)
  return useQuery({
    queryKey: isSearching ? queryKeys.species.search(query) : queryKeys.species.popular,
    queryFn: () => (isSearching ? apiGet(`/api/v1/species?q=${encodeURIComponent(query)}`) : apiGet('/api/v1/species')),
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
export function useSpecies(id, { enabled = true, perenualId = null, fallback = null } = {}) {
  return useQuery({
    queryKey: perenualId ? ['species', 'perenual', String(perenualId)] : queryKeys.species.detail(id),
    queryFn: () => {
      if (!perenualId) return apiGet(`/api/v1/species/${id}`)

      const params = new URLSearchParams({ perenual_id: String(perenualId), ...fallback })
      return apiGet(`/api/v1/species/lookup?${params}`)
    },
    enabled: enabled && (perenualId ? true : !!id),
  })
}
