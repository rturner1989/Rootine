import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { journalIndexResponseSchema } from '../types/journal'

const DEFAULT_LIMIT = 30

export type JournalFilters = {
  plantIds?: number[] | null
  kinds?: string[] | null
  dateFrom?: string | null
  dateTo?: string | null
  limit?: number
}

type NormalizedJournalFilters = {
  plantIds: number[] | null
  kinds: string[] | null
  dateFrom: string | null
  dateTo: string | null
  limit: number
}

// Canonical filter shape so unrelated callers that pass {} and
// { plantId: null, kinds: [] } produce the same query key — TanStack
// caches each filter combo independently by key equality.
export function normalizeJournalFilters(filters: JournalFilters = {}): NormalizedJournalFilters {
  return {
    plantIds: filters.plantIds?.length ? [...filters.plantIds].sort((a, b) => a - b) : null,
    kinds: filters.kinds?.length ? [...filters.kinds].sort() : null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    limit: filters.limit ?? DEFAULT_LIMIT,
  }
}

function buildQuery(filters: NormalizedJournalFilters, cursor: string | null): string {
  const params = new URLSearchParams()
  if (filters.plantIds?.length) params.set('plant_ids', filters.plantIds.join(','))
  if (filters.kinds?.length) params.set('kinds', filters.kinds.join(','))
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  params.set('limit', String(filters.limit))
  if (cursor) params.set('before', cursor)
  return params.toString()
}

export function useJournal(filters: JournalFilters = {}, { enabled = true } = {}) {
  const normalized = normalizeJournalFilters(filters)

  return useInfiniteQuery({
    queryKey: queryKeys.journal.list(normalized),
    queryFn: ({ pageParam }) =>
      request(`/api/v1/journal?${buildQuery(normalized, pageParam)}`, journalIndexResponseSchema),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? undefined,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  })
}
