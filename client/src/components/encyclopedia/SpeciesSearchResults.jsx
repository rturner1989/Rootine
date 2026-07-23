import { isSearchQuery, useSpeciesSearch } from '../../hooks/useSpecies'
import Spinner from '../ui/Spinner'
import SpeciesCard from './SpeciesCard'

// Search results for the Encyclopedia — the sidebar/drawer query runs through
// useSpeciesSearch (local catalogue first, Perenual fallback) and renders as
// the same SpeciesCard grid the browse view uses, so a result opens the same
// species page. Shared by the desktop in-page swap and the mobile drawer.
export default function SpeciesSearchResults({ query }) {
  const searching = isSearchQuery(query)
  const { data: results = [], isPending } = useSpeciesSearch(query)

  if (!searching) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">Start typing to find a species.</p>
  }

  if (isPending) return <Spinner />

  if (results.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">No species match “{query}”.</p>
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 list-none p-0">
      {results.map((species) => (
        <li key={species.id ?? `perenual-${species.perenual_id}`}>
          <SpeciesCard species={species} />
        </li>
      ))}
    </ul>
  )
}
