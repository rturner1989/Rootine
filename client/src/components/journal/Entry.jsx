import { memo } from 'react'
import PlantAvatar from '../plants/Avatar'

const KIND_DISC = {
  water: { emoji: '💧', scheme: 'bg-sky text-frost-deep' },
  feed: { emoji: '🌱', scheme: 'bg-mint text-emerald' },
  photo: { emoji: '📸', scheme: 'bg-paper-deep text-ink' },
  achievement: { scheme: 'bg-sunshine text-ink' },
  acquisition: { scheme: 'bg-mint text-emerald' },
}

const PRIMARY_LINE = {
  water: (entry) => `Watered ${entry.plant?.nickname ?? 'a plant'}`,
  feed: (entry) => `Fed ${entry.plant?.nickname ?? 'a plant'}`,
  photo: (entry) => `Added a photo of ${entry.plant?.nickname ?? 'a plant'}`,
  achievement: (entry) => entry.label ?? 'Achievement unlocked',
  acquisition: (entry) => `Added ${entry.plant?.nickname ?? 'a plant'} to your collection`,
}

function secondaryFor(entry) {
  if (entry.kind === 'water' || entry.kind === 'feed') return entry.notes || null
  if (entry.kind === 'photo') return entry.caption || null
  if (entry.kind === 'achievement') return entry.plant?.nickname || null
  return null
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function renderLeft(entry) {
  if (entry.kind === 'photo' && entry.image_url) {
    return <img src={entry.image_url} alt="" className="w-10 h-10 rounded-md object-cover border border-paper-edge" />
  }

  if (entry.kind === 'acquisition' && entry.plant?.species) {
    return <PlantAvatar species={entry.plant.species} size="md" shape="circle" />
  }

  const treatment = KIND_DISC[entry.kind] ?? KIND_DISC.photo
  const emoji = treatment.emoji ?? entry.emoji ?? '✨'

  return (
    <span
      aria-hidden="true"
      className={`w-10 h-10 rounded-full flex items-center justify-center text-base ${treatment.scheme}`}
    >
      {emoji}
    </span>
  )
}

function Entry({ entry }) {
  const primaryLine = (PRIMARY_LINE[entry.kind] ?? (() => 'Event'))(entry)
  const secondaryLine = secondaryFor(entry)

  return (
    <li className="flex items-start gap-3 px-4 lg:px-5 py-3 border-t border-paper-edge first:border-t-0 transition-colors hover:bg-paper-deep/50">
      <div className="shrink-0">{renderLeft(entry)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{primaryLine}</p>
        {secondaryLine && <p className="mt-0.5 text-xs text-ink-soft line-clamp-2">{secondaryLine}</p>}
      </div>
      <time dateTime={entry.occurred_at} className="shrink-0 text-xs text-ink-softer tabular-nums">
        {formatTime(entry.occurred_at)}
      </time>
    </li>
  )
}

export default memo(Entry)
