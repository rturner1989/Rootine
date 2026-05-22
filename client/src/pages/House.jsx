import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SegmentedControl from '../components/form/SegmentedControl'
import FilterChip from '../components/spaces/FilterChip'
import ListView from '../components/spaces/ListView'
import QueryChip from '../components/spaces/QueryChip'
import RoomsView from '../components/spaces/RoomsView'
import SpaceFormDialog from '../components/spaces/SpaceFormDialog'
import SpaceSearchResults from '../components/spaces/SpaceSearchResults'
import Action from '../components/ui/Action'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/errors/ErrorState'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../context/ToastContext'
import { usePlants } from '../hooks/usePlants'
import { useRegisterSearchScope } from '../hooks/useRegisterSearchScope'
import { useSearch } from '../hooks/useSearch'
import { useCreateSpace, useDeleteSpace, useSpaces, useUpdateSpace } from '../hooks/useSpaces'
import { useWeather } from '../hooks/useWeather'
import { pluralize } from '../utils/pluralize'
import { formatSpaceName } from '../utils/spaceIcons'

const VIEW_OPTIONS = [
  { value: 'rooms', label: 'Rooms', icon: '⊞' },
  { value: 'list', label: 'List', icon: '☰' },
  { value: 'habitat', label: 'Habitat', icon: '🏠', disabled: true, phase: 'P3' },
]

const VIEW_STORAGE_KEY = 'house.view'

// Module-level cache so House doesn't hit sessionStorage on every render.
// Lazy-loaded on first read, kept in sync by writeStoredView.
let cachedStoredView = null
let cachedStoredViewLoaded = false

function isOverdue(plant) {
  return plant.water_status === 'overdue' || plant.feed_status === 'overdue'
}

function readStoredView() {
  if (cachedStoredViewLoaded) return cachedStoredView
  cachedStoredViewLoaded = true
  if (typeof window === 'undefined') return null
  cachedStoredView = window.sessionStorage.getItem(VIEW_STORAGE_KEY)
  return cachedStoredView
}

function writeStoredView(value) {
  cachedStoredView = value
  cachedStoredViewLoaded = true
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(VIEW_STORAGE_KEY, value)
}

export default function House() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlView = searchParams.get('view')
  const storedView = readStoredView()
  const view = urlView === 'list' || urlView === 'rooms' ? urlView : storedView === 'list' ? 'list' : 'rooms'
  const filteredSpaceId = searchParams.get('space_id') ? Number(searchParams.get('space_id')) : null
  const [dialogState, setDialogState] = useState({ open: false, space: null })
  const [deleteState, setDeleteState] = useState({ open: false, space: null })
  const { data: spaces, isLoading: spacesLoading, error: spacesError, refetch: refetchSpaces } = useSpaces()
  const { data: plants, isLoading: plantsLoading, error: plantsError, refetch: refetchPlants } = usePlants()
  const { today: weatherToday } = useWeather()
  const createSpace = useCreateSpace()
  const updateSpace = useUpdateSpace()
  const deleteSpace = useDeleteSpace()
  const toast = useToast()

  const isLoading = spacesLoading || plantsLoading
  const error = spacesError || plantsError

  const totalSpaces = spaces?.length ?? 0
  const totalPlants = plants?.length ?? 0
  const overdueCount = (plants ?? []).reduce((acc, plant) => acc + (isOverdue(plant) ? 1 : 0), 0)
  const existingNames = useMemo(() => new Set(spaces?.map((space) => space.name) ?? []), [spaces])

  const filteredSpace = filteredSpaceId ? spaces?.find((space) => space.id === filteredSpaceId) : null
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch()

  function setView(next) {
    writeStoredView(next)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'rooms') {
          params.delete('view')
          params.delete('space_id')
        } else {
          params.set('view', next)
        }
        return params
      },
      { replace: true },
    )
  }

  const clearSpaceFilter = useCallback(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.delete('space_id')
        return params
      },
      { replace: true },
    )
  }, [setSearchParams])

  const onSelectResult = useCallback(
    (space) => {
      writeStoredView('list')
      setSearchParams({ view: 'list', space_id: String(space.id) })
    },
    [setSearchParams],
  )

  const renderResults = useCallback(
    ({ query }) => <SpaceSearchResults query={query} onSelect={onSelectResult} />,
    [onSelectResult],
  )

  const searchPlaceholder = filteredSpace ? `Search ${formatSpaceName(filteredSpace.name)}…` : 'Search spaces…'

  useRegisterSearchScope({
    placeholder: searchPlaceholder,
    hasFilterToClear: Boolean(filteredSpace),
    onClearAll: clearSpaceFilter,
    renderResults,
  })

  async function handleAddSpace(payload) {
    await createSpace.mutateAsync(payload)
  }

  async function handleEditSpace(id, payload) {
    await updateSpace.mutateAsync({ id, ...payload })
  }

  function requestDeleteSpace(space) {
    setDeleteState({ open: true, space })
  }

  function confirmDeleteSpace() {
    const space = deleteState.space
    if (!space) return
    deleteSpace.mutate(space.id, {
      onSuccess: () => toast.success(`Deleted ${space.name}`),
      onError: () => toast.error(`Couldn't delete ${space.name}`),
    })
    if (filteredSpaceId === space.id) clearSpaceFilter()
  }

  function closeDeleteDialog() {
    setDeleteState((prev) => ({ ...prev, open: false }))
  }

  const deletingSpace = deleteState.space
  const deletingPlantCount = deletingSpace
    ? (plants ?? []).filter((plant) => plant.space?.id === deletingSpace.id).length
    : 0
  const deletingDisplayName = deletingSpace ? formatSpaceName(deletingSpace.name) : ''
  const deleteMessage =
    deletingPlantCount > 0
      ? `“${deletingDisplayName}” and its ${pluralize(deletingPlantCount, 'plant')} will be removed. This can't be undone.`
      : `“${deletingDisplayName}” will be removed. This can't be undone.`

  function openAddDialog() {
    setDialogState({ open: true, space: null })
  }

  function openEditDialog(space) {
    setDialogState({ open: true, space })
  }

  function closeDialog() {
    setDialogState((prev) => ({ ...prev, open: false }))
  }

  const meta =
    totalSpaces > 0
      ? [
          pluralize(totalPlants, 'plant'),
          pluralize(totalSpaces, 'space'),
          overdueCount > 0 && `${overdueCount} ${overdueCount === 1 ? 'needs' : 'need'} attention`,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  const header = (
    <PageHeader
      eyebrow="Your greenhouse"
      meta={meta}
      compactMobile
      actions={<SegmentedControl label="View as" labelHidden value={view} onChange={setView} options={VIEW_OPTIONS} />}
    >
      Browse your <em className="text-emerald">plants</em>
    </PageHeader>
  )

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 gap-5 lg:gap-7 px-3 lg:px-6 py-4 lg:py-6 overflow-x-hidden">
        {header}
        <div role="status" aria-label="Loading your house" className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 gap-5 lg:gap-7 px-3 lg:px-6 py-4 lg:py-6 overflow-x-hidden">
        {header}
        <ErrorState
          scheme="500"
          headingLevel="h2"
          title={
            <>
              Something <em>wobbled</em> on our end
            </>
          }
          description="We couldn't fetch your spaces and plants. Try again, or head back to Today."
          actions={[
            <Action
              key="retry"
              type="button"
              variant="primary"
              onClick={() => {
                refetchSpaces()
                refetchPlants()
              }}
            >
              Try again
            </Action>,
            <Action key="today" variant="secondary" to="/">
              Back to Today
            </Action>,
          ]}
        />
      </div>
    )
  }

  const hasFilterChips = filteredSpace || searchQuery.trim()

  return (
    <div className="flex flex-col flex-1 gap-5 lg:gap-7 px-3 lg:px-6 py-4 lg:py-6 overflow-x-hidden">
      {header}

      {hasFilterChips && (
        <div className="flex flex-wrap items-center gap-3">
          {filteredSpace && <FilterChip space={filteredSpace} onClear={clearSpaceFilter} />}
          {searchQuery.trim() && <QueryChip query={searchQuery} onClear={() => setSearchQuery('')} />}
        </div>
      )}

      {view === 'rooms' && (
        <RoomsView
          spaces={spaces ?? []}
          plants={plants ?? []}
          weatherToday={weatherToday}
          onAddSpace={openAddDialog}
          onEditSpace={openEditDialog}
          onDeleteSpace={requestDeleteSpace}
        />
      )}

      {view === 'list' && (
        <ListView
          spaces={spaces ?? []}
          plants={plants ?? []}
          weatherToday={weatherToday}
          filteredSpaceId={filteredSpaceId}
          onAddSpace={openAddDialog}
          onEditSpace={openEditDialog}
          onDeleteSpace={requestDeleteSpace}
        />
      )}

      <SpaceFormDialog
        key={dialogState.space?.id ?? 'new'}
        open={dialogState.open}
        onClose={closeDialog}
        onAdd={handleAddSpace}
        onEdit={handleEditSpace}
        space={dialogState.space}
        existingNames={existingNames}
      />

      <ConfirmDialog
        open={deleteState.open}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteSpace}
        title={deletingSpace ? `Delete ${deletingDisplayName}?` : 'Delete space?'}
        message={deleteMessage}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
