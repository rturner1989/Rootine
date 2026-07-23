import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { isSearchQuery, useSpeciesSearch } from '../../hooks/useSpecies'
import Spinner from '../ui/Spinner'
import SpeciesGrid from './SpeciesGrid'

// Search results for the Encyclopedia — the sidebar/drawer query runs through
// useSpeciesSearch (local catalogue first, then Perenual) and renders as the
// same SpeciesGrid the browse view uses, so a result opens the same species
// page. Shared by the desktop in-page swap and the mobile drawer.
//
// The query is debounced before it hits the endpoint: the sidebar input
// updates on every keystroke, and search now reaches Perenual (100 calls/day),
// so firing per keystroke would burn the budget. 300ms matches SpeciesPicker.
export default function SpeciesSearchResults({ query }) {
  const debouncedQuery = useDebouncedValue(query, 300)
  const searching = isSearchQuery(debouncedQuery)
  const { data: results = [], isPending } = useSpeciesSearch(debouncedQuery)

  if (!searching) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">Start typing to find a species.</p>
  }

  // isPending stays true until the first debounced query resolves; also show
  // the spinner while the live query is ahead of the debounced one.
  if (isPending || query !== debouncedQuery) return <Spinner />

  if (results.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">No species match “{query}”.</p>
  }

  return <SpeciesGrid species={results} />
}
