import { memo } from 'react'
import type { JournalEntry, JournalKind } from '../../types/journal'
import PlantAvatar from '../plants/Avatar'

const KIND_EMOJI: Record<'water' | 'feed' | 'photo', string> = {
  water: '💧',
  feed: '🌱',
  photo: '📸',
}

const KIND_SCHEME: Record<JournalKind, string> = {
  water: 'bg-sky text-frost-deep',
  feed: 'bg-mint text-emerald',
  photo: 'bg-paper-deep text-ink',
  achievement: 'bg-sunshine text-ink',
  acquisition: 'bg-mint text-emerald',
}

function primaryLineFor(entry: JournalEntry): string {
  switch (entry.kind) {
    case 'water':
      return `Watered ${entry.plant?.nickname ?? 'a plant'}`
    case 'feed':
      return `Fed ${entry.plant?.nickname ?? 'a plant'}`
    case 'photo':
      return `Added a photo of ${entry.plant?.nickname ?? 'a plant'}`
    case 'achievement':
      return entry.label ?? 'Achievement unlocked'
    case 'acquisition':
      return `Added ${entry.plant?.nickname ?? 'a plant'} to your collection`
  }
}

function secondaryFor(entry: JournalEntry): string | null {
  switch (entry.kind) {
    case 'water':
    case 'feed':
      return entry.notes || null
    case 'photo':
      return entry.caption || null
    case 'achievement':
      return entry.plant?.nickname || null
    case 'acquisition':
      return null
  }
}

function emojiFor(entry: JournalEntry): string {
  switch (entry.kind) {
    case 'water':
    case 'feed':
    case 'photo':
      return KIND_EMOJI[entry.kind]
    case 'achievement':
      return entry.emoji || '✨'
    case 'acquisition':
      return '✨'
  }
}

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function renderLeft(entry: JournalEntry) {
  if (entry.kind === 'photo' && entry.image_url) {
    return <img src={entry.image_url} alt="" className="w-10 h-10 rounded-md object-cover border border-paper-edge" />
  }

  if (entry.kind === 'acquisition' && entry.plant?.species) {
    // journalPlantSchema's species projection ({id, common_name,
    // personality}) never carries image_url, the only field PlantAvatar
    // reads — so this always falls back to the emoji tile, matching the
    // pre-TS runtime behaviour exactly.
    return <PlantAvatar species={entry.plant.species} size="md" shape="circle" />
  }

  return (
    <span
      aria-hidden="true"
      className={`w-10 h-10 rounded-full flex items-center justify-center text-base ${KIND_SCHEME[entry.kind]}`}
    >
      {emojiFor(entry)}
    </span>
  )
}

export type EntryProps = {
  entry: JournalEntry
}

function Entry({ entry }: EntryProps) {
  const primaryLine = primaryLineFor(entry)
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
