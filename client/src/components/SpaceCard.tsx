import type { Space } from '../types/space'
import { pluralize } from '../utils/pluralize'
import { getSpaceEmoji } from '../utils/spaceIcons'
import Action from './ui/Action'
import Badge from './ui/Badge'

export type SpaceCardProps = {
  space: Space
  attentionCount?: number
  onClick?: () => void
}

// Missing/unknown `space.icon` renders no icon tile — safer than a
// broken glyph when the backend adds a new slug ahead of the client.
export default function SpaceCard({ space, attentionCount = 0, onClick }: SpaceCardProps) {
  const hasAttention = attentionCount > 0
  const emoji = getSpaceEmoji(space.icon)

  return (
    <Action
      variant="unstyled"
      onClick={onClick}
      className={`p-4 rounded-md bg-card border text-left min-h-[130px] flex flex-col justify-between transition-colors hover:border-leaf/50 ${
        hasAttention ? 'border-coral/30' : 'border-mint'
      }`}
    >
      <div className="flex items-start justify-between">
        {emoji ? (
          <div aria-hidden="true" className="w-9 h-9 rounded-md bg-mint flex items-center justify-center text-base">
            {emoji}
          </div>
        ) : (
          <div className="w-9 h-9" />
        )}
        {hasAttention && (
          <Badge scheme="coral" variant="soft">
            {attentionCount} thirsty
          </Badge>
        )}
      </div>

      <div>
        <p className="text-[15px] font-extrabold text-ink">{space.name}</p>
        <p className="text-[11px] font-semibold text-ink-soft">{pluralize(space.plants_count, 'plant')}</p>
      </div>
    </Action>
  )
}
