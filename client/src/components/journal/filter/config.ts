// Filter domain logic for the journal — constants, URL serialization,
// and date-range helpers. No JSX: the rendering lives in Fields, the
// toolbar chrome in FilterToolbar. Timeline + Photos read filters
// straight from here.

import type { SetURLSearchParams } from 'react-router-dom'
import type { JournalKind } from '../../../types/journal'
import { emptyDraft, type FilterDraft, type FilterSchema, readFilters, writeFilters } from '../../../utils/filterSchema'

export const JOURNAL_KINDS: JournalKind[] = ['water', 'feed', 'photo', 'achievement', 'acquisition']

export const KIND_LABEL: Record<JournalKind, string> = {
  water: 'Water',
  feed: 'Feed',
  photo: 'Photos',
  achievement: 'Achievements',
  acquisition: 'Acquisitions',
}

export const KIND_EMOJI: Record<JournalKind, string> = {
  water: '💧',
  feed: '🌱',
  photo: '📸',
  achievement: '🏆',
  acquisition: '🌿',
}

type DatePreset = { id: string; label: string; days: number | null }

export const DATE_PRESETS: DatePreset[] = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

const journalKindSet = new Set<string>(JOURNAL_KINDS)

function isJournalKind(value: number | string): value is JournalKind {
  return typeof value === 'string' && journalKindSet.has(value)
}

export const JOURNAL_FILTER_SCHEMA: FilterSchema = [
  {
    id: 'plantIds',
    param: 'plant_ids',
    type: 'multi',
    cast: 'number',
    isValid: (id) => typeof id === 'number' && id > 0,
  },
  { id: 'kinds', param: 'kinds', type: 'multi', isValid: isJournalKind },
  { id: 'date', type: 'range', fromKey: 'dateFrom', toKey: 'dateTo', fromParam: 'date_from', toParam: 'date_to' },
]

export const EMPTY_DRAFT: FilterDraft = emptyDraft(JOURNAL_FILTER_SCHEMA)

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

type DateRangeDraft = { dateFrom: string | null; dateTo: string | null }

export function presetRange(preset: DatePreset): DateRangeDraft {
  if (preset.days == null) return { dateFrom: null, dateTo: null }
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - preset.days)
  return { dateFrom: isoDate(from), dateTo: isoDate(today) }
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function dateChipLabel(dateFrom: string | null, dateTo: string | null): string | null {
  if (!dateFrom && !dateTo) return null
  if (dateFrom && dateTo) return `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
  if (dateFrom) return `From ${formatDateShort(dateFrom)}`
  // Only the two falsy cases (both null, both set) and the dateFrom-only
  // case return above, so reaching here means dateTo is the one set.
  return `Until ${formatDateShort(dateTo as string)}`
}

// Sentence-cased range label for the journal header summary: a known
// preset reads "last 30 days", a custom range falls back to the chip
// label, no date filter reads "all time".
export function dateRangeSummaryLabel(dateFrom: string | null, dateTo: string | null): string {
  if (!dateFrom && !dateTo) return 'all time'

  const preset = DATE_PRESETS.find((option) => {
    if (option.days == null) return false
    const range = presetRange(option)
    return range.dateFrom === dateFrom && range.dateTo === dateTo
  })
  if (preset) return `last ${preset.days} days`

  // dateChipLabel only returns null when both bounds are null, already
  // ruled out by the guard above.
  return dateChipLabel(dateFrom, dateTo) as string
}

export type JournalFilters = {
  plantIds: number[]
  kinds: JournalKind[]
  dateFrom: string | null
  dateTo: string | null
}

// The calendar views (Week/Month) drop the date bounds — the visible
// window IS their date range — so they only carry the plant/kind axes.
export type CalendarFilters = Pick<JournalFilters, 'plantIds' | 'kinds'>

export function readJournalFilters(searchParams: URLSearchParams): JournalFilters {
  // readFilters is generic over any FilterSchema and returns a loosely
  // typed FilterDraft (Record<string, unknown>) — this schema's shape is
  // fixed by JOURNAL_FILTER_SCHEMA above, so the concrete return type is
  // safe to assert here rather than re-declared at every call site.
  return readFilters(searchParams, JOURNAL_FILTER_SCHEMA) as JournalFilters
}

export function applyFilters(setSearchParams: SetURLSearchParams, next: FilterDraft): void {
  setSearchParams((prev) => writeFilters(prev, next, JOURNAL_FILTER_SCHEMA), { replace: false })
}
