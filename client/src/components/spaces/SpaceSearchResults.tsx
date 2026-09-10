import { memo } from 'react'
import { usePlants } from '../../hooks/usePlants'
import { useSpaces } from '../../hooks/useSpaces'
import type { Space } from '../../types/space'
import { formatSpaceName, getSpaceEmoji } from '../../utils/spaceIcons'
import { spaceMatchesQuery } from '../../utils/spaceSearch'
import Action from '../ui/Action'

type SpaceSearchResultsProps = {
  query: string
  onSelect: (space: Space) => void
}

function SpaceSearchResults({ query, onSelect }: SpaceSearchResultsProps) {
  const { data: spaces } = useSpaces()
  const { data: plants } = usePlants()

  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">Start typing to find a space.</p>
  }

  const matches = (spaces ?? []).filter((space) => spaceMatchesQuery(space, plants ?? [], trimmed))

  if (matches.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">No spaces match “{query}”.</p>
  }

  return (
    <ul className="list-none p-0">
      {matches.map((space) => {
        const displayName = formatSpaceName(space.name)
        return (
          <li key={space.id}>
            <Action
              variant="unstyled"
              onClick={() => onSelect(space)}
              className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-paper-edge hover:bg-paper-deep transition-colors text-left"
            >
              <span
                aria-hidden="true"
                className="shrink-0 w-10 h-10 rounded-full bg-mint text-emerald flex items-center justify-center text-base"
              >
                {getSpaceEmoji(space.icon)}
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-extrabold text-ink truncate">{displayName}</span>
                <span className="font-display italic text-xs text-ink-soft truncate">
                  {space.plants_count ?? 0} {space.plants_count === 1 ? 'plant' : 'plants'} · {space.category}
                </span>
              </span>
            </Action>
          </li>
        )
      })}
    </ul>
  )
}

export default memo(SpaceSearchResults)
