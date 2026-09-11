import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { photoFeedResponseSchema, plantPhotoSchema } from '../types/plantPhoto'

const DEFAULT_LIMIT = 30

type PhotoFilters = {
  plantIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
}

type NormalizedPhotoFilters = {
  plantIds: number[] | null
  dateFrom: string | null
  dateTo: string | null
}

// Canonical filter shape so {} and { plantIds: [], dateFrom: null } map to
// the same query key — TanStack caches each filter combo by key equality.
function normalizePhotoFilters(filters: PhotoFilters = {}): NormalizedPhotoFilters {
  return {
    plantIds: filters.plantIds?.length ? [...filters.plantIds].sort((a, b) => a - b) : null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
  }
}

function buildQuery(filters: NormalizedPhotoFilters, cursor: string | null): string {
  const params = new URLSearchParams()
  if (filters.plantIds?.length) params.set('plant_ids', filters.plantIds.join(','))
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  params.set('limit', String(DEFAULT_LIMIT))
  if (cursor) params.set('before', cursor)
  return params.toString()
}

// Aggregate photo feed for the Journal Photos tab. Pass { plantIds } to
// scope (one plant on Plant Detail, or the plant-filter selection on the
// all-plants grid) and { dateFrom, dateTo } for the date filter. Cursor
// pagination keyed on the server's next_cursor.
export function usePhotos(filters: PhotoFilters = {}) {
  const normalized = normalizePhotoFilters(filters)
  return useInfiniteQuery({
    queryKey: queryKeys.photos.list(normalized),
    queryFn: ({ pageParam }) => request(`/api/v1/photos?${buildQuery(normalized, pageParam)}`, photoFeedResponseSchema),
    initialPageParam: null as string | null,
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
    mutationFn: ({ plantId, file }: { plantId: number; file: File }) => {
      const formData = new FormData()
      formData.append('plant_photo[image]', file)
      return request(`/api/v1/plants/${plantId}/plant_photos`, plantPhotoSchema, { method: 'POST', body: formData })
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
    mutationFn: ({ plantId, photoId }: { plantId: number; photoId: number }) =>
      request(`/api/v1/plants/${plantId}/plant_photos/${photoId}`, z.void(), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all })
    },
  })
}
