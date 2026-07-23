import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import EncyclopediaFilter from '../../components/encyclopedia/EncyclopediaFilter'
import {
  applyEncyclopediaFilters,
  EMPTY_DRAFT,
  readEncyclopediaFilters,
} from '../../components/encyclopedia/filter/config'
import SpeciesGrid from '../../components/encyclopedia/SpeciesGrid'
import SpeciesSearchResults from '../../components/encyclopedia/SpeciesSearchResults'
import Action from '../../components/ui/Action'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import { useEncyclopediaBrowse } from '../../hooks/useEncyclopedia'
import { useRegisterSearchScope } from '../../hooks/useRegisterSearchScope'
import { useSearch } from '../../hooks/useSearch'
import { isSearchQuery } from '../../hooks/useSpecies'

export default function Encyclopedia() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEncyclopediaFilters(searchParams)
  const { data, isPending } = useEncyclopediaBrowse(filters)
  const { query, setQuery } = useSearch()

  const clearSearch = useCallback(() => setQuery(''), [setQuery])
  const renderResults = useCallback(({ query: drawerQuery }) => <SpeciesSearchResults query={drawerQuery} />, [])

  useRegisterSearchScope({
    placeholder: 'Search all species…',
    hasFilterToClear: false,
    onClearAll: clearSearch,
    renderResults,
  })

  const searching = isSearchQuery(query)
  const species = data?.species ?? []

  function renderBody() {
    // Search takes over the whole body — the browse filters don't apply to a
    // free-text search, so they're hidden by the swap rather than combined.
    if (searching) return <SpeciesSearchResults query={query} />

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
      >
        Popular <em className="text-emerald">species</em>
      </PageHeader>

      {!searching && <EncyclopediaFilter />}

      {renderBody()}
    </div>
  )
}
