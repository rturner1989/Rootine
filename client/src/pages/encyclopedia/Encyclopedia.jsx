import { faLayerGroup, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import EncyclopediaFilter from '../../components/encyclopedia/EncyclopediaFilter'
import {
  applyEncyclopediaFilters,
  EMPTY_DRAFT,
  readEncyclopediaFilters,
} from '../../components/encyclopedia/filter/config'
import SpaceGroups from '../../components/encyclopedia/SpaceGroups'
import SpeciesGrid from '../../components/encyclopedia/SpeciesGrid'
import SpeciesSearchResults from '../../components/encyclopedia/SpeciesSearchResults'
import SegmentedControl from '../../components/form/SegmentedControl'
import Action from '../../components/ui/Action'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import { useEncyclopediaBrowse, useEncyclopediaGrouped } from '../../hooks/useEncyclopedia'
import { useRegisterSearchScope } from '../../hooks/useRegisterSearchScope'
import { useSearch } from '../../hooks/useSearch'
import { isSearchQuery } from '../../hooks/useSpecies'

const VIEW_OPTIONS = [
  { value: 'grid', label: 'Grid', icon: faTableCellsLarge },
  { value: 'spaces', label: 'By space', icon: faLayerGroup },
]

export default function Encyclopedia() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEncyclopediaFilters(searchParams)
  const { query, setQuery } = useSearch()
  const view = searchParams.get('view') === 'spaces' ? 'spaces' : 'grid'
  const searching = isSearchQuery(query)
  const { data, isPending } = useEncyclopediaBrowse(filters, { enabled: !searching && view !== 'spaces' })
  const grouped = useEncyclopediaGrouped(filters, { enabled: !searching && view === 'spaces' })

  const clearSearch = useCallback(() => setQuery(''), [setQuery])
  const renderResults = useCallback(({ query: drawerQuery }) => <SpeciesSearchResults query={drawerQuery} />, [])

  useRegisterSearchScope({
    placeholder: 'Search all species…',
    hasFilterToClear: false,
    onClearAll: clearSearch,
    renderResults,
  })

  const species = data?.species ?? []

  function setView(next) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'spaces') params.set('view', 'spaces')
        else params.delete('view')
        return params
      },
      { replace: true },
    )
  }

  function renderBody() {
    // Search takes over the whole body — the browse filters don't apply to a
    // free-text search, so they're hidden by the swap rather than combined.
    if (searching) return <SpeciesSearchResults query={query} />

    if (view === 'spaces') {
      if (grouped.isPending) return <Spinner />

      const groups = grouped.data?.groups ?? []
      if (groups.length === 0) {
        return (
          <EmptyState
            icon={<span>🪟</span>}
            title="Add a space to see recommendations"
            description="Once you've set up a space, we'll show which plants suit its light and humidity."
            actions={
              <Action variant="secondary" to="/house">
                Go to your spaces
              </Action>
            }
          />
        )
      }

      return <SpaceGroups groups={groups} />
    }

    if (isPending) return <Spinner />

    if (species.length === 0) {
      return (
        <EmptyState
          icon={<span>🔍</span>}
          title="No species match those filters"
          description="Try loosening a filter to see more of the catalogue."
          actions={
            <Action variant="secondary" onClick={() => applyEncyclopediaFilters(setSearchParams, EMPTY_DRAFT)}>
              Clear filters
            </Action>
          }
        />
      )
    }

    return <SpeciesGrid species={species} />
  }

  // PageHeader takes `eyebrow` + the heading as children (matches House/Today),
  // NOT preheading/heading props.
  return (
    <div className="flex flex-col gap-6 lg:gap-8 px-3 lg:px-6 py-4 lg:py-6">
      <PageHeader
        eyebrow="Your greenhouse library"
        meta="A curated shelf of well-loved plants — search to explore the full library"
        compactMobile
        actions={
          searching ? null : (
            <SegmentedControl label="View" labelHidden value={view} onChange={setView} options={VIEW_OPTIONS} />
          )
        }
      >
        Popular <em className="text-emerald">species</em>
      </PageHeader>

      {!searching && <EncyclopediaFilter />}

      {renderBody()}
    </div>
  )
}
