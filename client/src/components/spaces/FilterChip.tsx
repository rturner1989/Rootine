import type { Space } from '../../types/space'
import { formatSpaceName, getSpaceEmoji } from '../../utils/spaceIcons'
import Badge from '../ui/Badge'

type FilterChipProps = {
  space: Space
  onClear: () => void
}

export default function FilterChip({ space, onClear }: FilterChipProps) {
  const displayName = formatSpaceName(space.name)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-softer">Filtered by</span>
      <Badge scheme="emerald" variant="soft" size="md" onClear={onClear} clearLabel={`Clear ${displayName} filter`}>
        <span aria-hidden="true">{getSpaceEmoji(space.icon)}</span>
        <span className="truncate max-w-[160px]">{displayName}</span>
      </Badge>
    </div>
  )
}
