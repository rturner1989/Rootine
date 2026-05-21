import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'

// Canonical filter shape so {} and { plantIds: [], kinds: [] } land in the
// same cache slot for a given window.
function normalizeCalendarFilters(filters = {}) {
  return {
    plantIds: filters.plantIds?.length ? [...filters.plantIds].sort((a, b) => a - b) : null,
    kinds: filters.kinds?.length ? [...filters.kinds].sort() : null,
  }
}

function buildQuery({ from, to }, filters) {
  const params = new URLSearchParams()
  params.set('date_from', from)
  params.set('date_to', to)
  if (filters.plantIds?.length) params.set('plant_ids', filters.plantIds.join(','))
  if (filters.kinds?.length) params.set('kinds', filters.kinds.join(','))
  return params.toString()
}

// Compact per-day events + scheduled care for a date window (a month grid
// or a single week — the caller passes the range). The window's from/to are
// in the query key, so paging caches each independently and refetches the
// right window — same filter-aware keying the Timeline + Photos use. Single
// fetch, not paginated: the endpoint is uncapped, so a busy window can't
// truncate. keepPreviousData holds the last result through a period change
// instead of flashing a spinner.
export function useJournalCalendar(range, filters = {}) {
  const normalized = normalizeCalendarFilters(filters)

  return useQuery({
    queryKey: ['journal', 'calendar', range.from, range.to, normalized],
    queryFn: () => apiGet(`/api/v1/journal/calendar?${buildQuery(range, normalized)}`),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
