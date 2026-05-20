import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { usePhotoPicker } from '../../hooks/usePhotoPicker'
import { useDeletePhoto, usePhotos } from '../../hooks/usePhotos'
import Action from '../ui/Action'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/errors/ErrorState'
import Spinner from '../ui/Spinner'
import FilterToolbar from './FilterToolbar'
import { readJournalFilters } from './filter/config'
import PhotoLightbox from './PhotoLightbox'

// Masonry grid of the user's photos (all plants, or one when scoped via
// plantId). CSS columns — no JS layout, no library. break-inside-avoid
// keeps a tile from splitting across a column boundary. Tiles open a
// fullscreen lightbox; delete + upload land in the next step.
export default function Photos({ plantId = null, fill = false }) {
  const [searchParams] = useSearchParams()
  const urlFilters = readJournalFilters(searchParams)
  // Scoped Plant Detail view locks to the one plant; the all-plants grid
  // takes the plant selection from the URL. Date filter applies to both.
  const plantIds = plantId ? [plantId] : urlFilters.plantIds
  const hasActiveFilter =
    urlFilters.dateFrom != null || urlFilters.dateTo != null || (!plantId && urlFilters.plantIds.length > 0)
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = usePhotos({
    plantIds,
    dateFrom: urlFilters.dateFrom,
    dateTo: urlFilters.dateTo,
  })
  const photos = data?.pages.flatMap((page) => page.photos) ?? []
  const sentinelRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const activePhoto = activeIndex != null ? photos[activeIndex] : null
  const deletePhoto = useDeletePhoto()
  const { openPicker, isUploading } = usePhotoPicker(plantId)
  const toast = useToast()

  const closeLightbox = useCallback(() => setActiveIndex(null), [])
  const showPrev = useCallback(() => setActiveIndex((index) => (index > 0 ? index - 1 : index)), [])
  const showNext = useCallback(
    () => setActiveIndex((index) => (index != null && index < photos.length - 1 ? index + 1 : index)),
    [photos.length],
  )

  async function confirmDelete() {
    try {
      await deletePhoto.mutateAsync({ plantId: deleteTarget.plant.id, photoId: deleteTarget.id })
      setActiveIndex(null)
      toast.success('Photo deleted')
    } catch {
      toast.error("Couldn't delete the photo")
      throw new Error('delete failed')
    }
  }

  const uploadButton = plantId ? (
    <Action type="button" variant="secondary" onClick={openPicker} disabled={isUploading}>
      {isUploading ? 'Uploading…' : 'Add photo'}
    </Action>
  ) : null

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    if (!hasNextPage) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function renderBody() {
    if (isLoading) {
      return (
        <div role="status" aria-label="Loading your photos" className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )
    }

    if (error) {
      return (
        <ErrorState
          scheme="500"
          headingLevel="h2"
          title={
            <>
              Couldn't load <em>your photos</em>
            </>
          }
          description="The photo grid didn't load. Try again, or head back to Today."
          actions={[
            <Action key="retry" type="button" variant="primary" onClick={() => refetch()}>
              Try again
            </Action>,
            <Action key="today" variant="secondary" to="/">
              Back to Today
            </Action>,
          ]}
        />
      )
    }

    if (photos.length === 0) {
      if (hasActiveFilter) {
        return (
          <EmptyState
            framed={false}
            tone="mint"
            icon="🔍"
            title="No photos match these filters"
            description="Try a different date range — or clear the filters to see every photo."
          />
        )
      }
      return (
        <EmptyState
          framed={false}
          tone="mint"
          icon="📸"
          title="No photos yet"
          description={
            plantId
              ? 'Add the first photo of this plant — it lands here, newest first.'
              : "Snap a photo from any plant's page and it'll show up here, newest first."
          }
          actions={uploadButton ?? undefined}
        />
      )
    }

    return (
      <>
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
          {photos.map((photo, index) => (
            <Action
              key={photo.id}
              variant="unstyled"
              type="button"
              aria-label={`View ${photo.caption || `photo of ${photo.plant?.nickname ?? 'a plant'}`}`}
              onClick={() => setActiveIndex(index)}
              className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-md border border-paper-edge cursor-pointer transition-transform hover:scale-[0.99]"
            >
              <img src={photo.image_url} alt="" loading="lazy" className="w-full block" />
            </Action>
          ))}
        </div>
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        {isFetchingNextPage && (
          <div role="status" aria-label="Loading more photos" className="flex items-center justify-center py-4">
            <Spinner />
          </div>
        )}
      </>
    )
  }

  return (
    <div className={`flex flex-col ${fill ? 'flex-1 min-h-0' : ''}`}>
      <div className="shrink-0 px-4 lg:px-5 py-3 border-b border-paper-edge flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <FilterToolbar lockedPlantId={plantId} hideKinds surface="glass-dense" />
        </div>
        {uploadButton && photos.length > 0 && <div className="shrink-0">{uploadButton}</div>}
      </div>

      <div className={`px-4 lg:px-5 py-3 ${fill ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>{renderBody()}</div>

      <PhotoLightbox
        photo={activePhoto}
        onClose={closeLightbox}
        onDelete={setDeleteTarget}
        onPrev={showPrev}
        onNext={showNext}
        hasPrev={activeIndex != null && activeIndex > 0}
        hasNext={activeIndex != null && activeIndex < photos.length - 1}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this photo?"
        message="This removes the photo from your journal for good. This can't be undone."
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deletePhoto.isPending}
        destructive
      />
    </div>
  )
}
