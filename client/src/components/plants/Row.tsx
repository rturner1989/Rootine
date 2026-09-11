import type { Plant } from '../../types/plant'
import { pluralize } from '../../utils/pluralize'
import Action from '../ui/Action'
import Avatar from './Avatar'

const MOOD_VARIANT = {
  thriving: 'ring-leaf text-leaf mood-breathe',
  thirsty: 'ring-sunshine text-sunshine-deep mood-breathe',
  wilting: 'ring-coral text-coral-deep mood-pulse',
} as const

type Mood = keyof typeof MOOD_VARIANT

function isUrgent(plant: Plant): boolean {
  return plant.water_status === 'overdue' || plant.feed_status === 'overdue'
}

type NextCare = { label: string; overdue: boolean } | null

function renderNextCare(nextCare: NextCare) {
  if (!nextCare) return '—'
  if (nextCare.overdue) return <em className="font-display italic text-coral-deep font-medium">{nextCare.label}</em>
  return nextCare.label
}

function moodFor(plant: Plant): Mood {
  if (plant.water_status === 'overdue' || plant.feed_status === 'overdue') return 'wilting'
  if (
    plant.water_status === 'due_today' ||
    plant.feed_status === 'due_today' ||
    plant.water_status === 'due_soon' ||
    plant.feed_status === 'due_soon'
  ) {
    return 'thirsty'
  }
  return 'thriving'
}

// Returns { label, overdue } for the plant's most-urgent next action.
// Picks whichever of water/feed has the smallest days-until value (negative
// means overdue). Falls back to null when neither has been logged yet.
function nextCareLabelFor(plant: Plant): NextCare {
  const water = plant.days_until_water
  const feed = plant.days_until_feed

  let days: number | null = null
  if (water != null) days = water
  if (feed != null && (days === null || feed < days)) days = feed
  if (days === null) return null

  if (days < 0) {
    const overdue = Math.abs(days)
    return { label: `${pluralize(overdue, 'day')} overdue`, overdue: true }
  }
  if (days === 0) return { label: 'Due today', overdue: false }
  if (days === 1) return { label: 'In 1 day', overdue: false }
  return { label: `In ${days} days`, overdue: false }
}

export type RowProps = {
  plant: Plant
}

export default function Row({ plant }: RowProps) {
  const urgent = isUrgent(plant)
  const mood = moodFor(plant)
  const nextCare = nextCareLabelFor(plant)
  const moodClasses = MOOD_VARIANT[mood] ?? MOOD_VARIANT.thriving
  const speciesName = plant.species?.common_name

  return (
    <Action
      to={`/plants/${plant.id}`}
      variant="unstyled"
      className="grid grid-cols-[40px_1fr_140px_24px] sm:grid-cols-[40px_1fr_160px_24px] items-center gap-3.5 px-4 sm:px-[18px] py-2.5 border-t border-paper-edge first:border-t-0 hover:bg-paper-deep transition-colors text-left"
    >
      <span
        className={`relative w-10 h-10 rounded-full overflow-hidden ${
          urgent ? 'ring-2 ring-coral shadow-[0_2px_6px_rgba(255,107,61,0.2)]' : ''
        }`}
      >
        <Avatar imageUrl={plant.species?.image_url} size="sm" shape="circle" />
      </span>

      <span className="flex flex-col min-w-0">
        <span className="text-sm font-extrabold text-ink truncate">{plant.nickname}</span>
        {speciesName && <span className="font-display italic text-xs text-ink-soft truncate">{speciesName}</span>}
      </span>

      <span className="text-[11px] text-ink-soft truncate">{renderNextCare(nextCare)}</span>

      <span
        aria-hidden="true"
        title={mood}
        className={`justify-self-end w-5 h-5 rounded-full bg-paper flex items-center justify-center text-[9px] ring-2 ring-inset ${moodClasses}`}
      >
        ●
      </span>
    </Action>
  )
}
