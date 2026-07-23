import { getSpaceEmoji } from '../../utils/spaceIcons'
import Heading from '../ui/Heading'
import SpeciesGrid from './SpeciesGrid'

// The "By space" view: one section per space, listing the species that fit it
// (server-computed). Reuses SpeciesGrid so cards read identically to browse.
export default function SpaceGroups({ groups }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.space.id} className="flex flex-col gap-3">
          <Heading as="h2" variant="panel" className="text-ink flex items-center gap-2 !text-[18px]">
            <span aria-hidden="true">{getSpaceEmoji(group.space.icon)}</span>
            Great for your {group.space.name}
          </Heading>
          {renderGroupBody(group)}
        </section>
      ))}
    </div>
  )
}

function renderGroupBody(group) {
  if (group.species.length === 0) {
    return (
      <p className="text-sm text-ink-soft italic px-1">
        Nothing in the catalogue fits {group.space.name} yet — try searching for more.
      </p>
    )
  }

  return <SpeciesGrid species={group.species} />
}
