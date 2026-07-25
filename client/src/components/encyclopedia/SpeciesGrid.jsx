import SpeciesCard from './SpeciesCard'

// The species card grid — SpeciesCard cells in a responsive column layout,
// shared by the Encyclopedia browse view and the search results so both read
// identically. Keys fall back to perenual_id for search results that aren't
// in the local catalogue yet (no local id).
export default function SpeciesGrid({ species }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 list-none p-0">
      {species.map((entry) => (
        <li key={entry.id ?? `perenual-${entry.perenual_id}`}>
          <SpeciesCard species={entry} />
        </li>
      ))}
    </ul>
  )
}
