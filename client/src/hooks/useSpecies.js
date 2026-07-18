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

export function useSpecies(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.species.detail(id),
    queryFn: () => apiGet(`/api/v1/species/${id}`),
    enabled: enabled && !!id,
  })
}
