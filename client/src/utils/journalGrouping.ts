import type { JournalEntry } from '../types/journal'
import { isoDateKey } from './dateKey'

const DAY_MS = 86_400_000

type DayLabels = { relativeLabel: string; dateLabel: string }

type DayGroup = DayLabels & { dayKey: string; entries: JournalEntry[] }

// Mockup splits each day header into a relative word (TODAY / YESTERDAY /
// weekday) + an absolute date. Today/Yesterday keep the weekday in the
// absolute part ("Thu 24 April"); older days carry the weekday in the
// relative slot, so the absolute part drops it ("22 April").
function labelsFor(dayKey: string, todayKey: string, yesterdayKey: string, occurredIso: string): DayLabels {
  const date = new Date(occurredIso)
  if (dayKey === todayKey) {
    return { relativeLabel: 'Today', dateLabel: date.toLocaleDateString(undefined, FULL_DATE) }
  }
  if (dayKey === yesterdayKey) {
    return { relativeLabel: 'Yesterday', dateLabel: date.toLocaleDateString(undefined, FULL_DATE) }
  }
  return {
    relativeLabel: date.toLocaleDateString(undefined, { weekday: 'long' }),
    dateLabel: date.toLocaleDateString(undefined, DAY_MONTH),
  }
}

const FULL_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'long' }
const DAY_MONTH: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }

export function groupEntriesByDay(entries: JournalEntry[]): DayGroup[] {
  const todayKey = isoDateKey(new Date())
  const yesterdayKey = isoDateKey(new Date(Date.now() - DAY_MS))
  const groups = new Map<string, DayGroup>()

  for (const entry of entries) {
    if (!entry.occurred_at) continue
    const dayKey = isoDateKey(new Date(entry.occurred_at))
    const group = groups.get(dayKey) ?? {
      dayKey,
      ...labelsFor(dayKey, todayKey, yesterdayKey, entry.occurred_at),
      entries: [],
    }
    group.entries.push(entry)
    groups.set(dayKey, group)
  }

  return Array.from(groups.values())
}
