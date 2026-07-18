import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost } from '../api/client'
import { queryKeys } from '../api/queryKeys'

const DEFAULT_LIMIT = 30

// Canonical filter shape so {} and { plantIds: [], dateFrom: null } map to
// the same query key — TanStack caches each filter combo by key equality.
function normalizePhotoFilters(filters = {}) {
  return {
    plantIds: filters.plantIds?.length ? [...filters.plantIds].sort((a, b) => a - b) : null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
  }
}

function buildQuery(filters, cursor) {
  const params = new URLSearchParams()
  if (filters.plantIds?.length) params.set('plant_ids', filters.plantIds.join(','))
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  params.set('limit', DEFAULT_LIMIT)
  if (cursor) params.set('before', cursor)
  return params.toString()
}

// Aggregate photo feed for the Journal Photos tab. Pass { plantIds } to
// scope (one plant on Plant Detail, or the plant-filter selection on the
// all-plants grid) and { dateFrom, dateTo } for the date filter. Cursor
// pagination keyed on the server's next_cursor.
export function usePhotos(filters = {}) {
  const normalized = normalizePhotoFilters(filters)
  return useInfiniteQuery({
    queryKey: queryKeys.photos.list(normalized),
    queryFn: ({ pageParam = null }) => apiGet(`/api/v1/photos?${buildQuery(normalized, pageParam)}`),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? undefined,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

// Upload + delete go through the nested per-plant resource (they need a
// plant to attach to / scope under). Both invalidate the photos feed AND
// the journal — a photo is also a Timeline entry, so a stale journal
// cache would still show a deleted/old photo.
export function useUploadPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ plantId, file }) => {
      const formData = new FormData()
      formData.append('plant_photo[image]', file)
      return apiPost(`/api/v1/plants/${plantId}/plant_photos`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all })
    },
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ plantId, photoId }) => apiDelete(`/api/v1/plants/${plantId}/plant_photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all })
    },
  })
}
