// Filter domain logic for the journal — constants, URL serialization,
// and date-range helpers. No JSX: the rendering lives in Fields/Panels,
// the toolbar chrome in FilterToolbar. Timeline + Photos read filters
// straight from here.

export const JOURNAL_KINDS = ['water', 'feed', 'photo', 'achievement', 'acquisition']

export const KIND_LABEL = {
  water: 'Water',
  feed: 'Feed',
  photo: 'Photos',
  achievement: 'Achievements',
  acquisition: 'Acquisitions',
}

export const KIND_EMOJI = {
  water: '💧',
  feed: '🌱',
  photo: '📸',
  achievement: '🏆',
  acquisition: '🌿',
}

export const DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

export const EMPTY_DRAFT = { plantIds: [], kinds: [], dateFrom: null, dateTo: null }

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export function presetRange(preset) {
  if (preset.days == null) return { dateFrom: null, dateTo: null }
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - preset.days)
  return { dateFrom: isoDate(from), dateTo: isoDate(today) }
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function dateChipLabel(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return null
  if (dateFrom && dateTo) return `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
  if (dateFrom) return `From ${formatDateShort(dateFrom)}`
  return `Until ${formatDateShort(dateTo)}`
}

// Sentence-cased range label for the journal header summary: a known
// preset reads "last 30 days", a custom range falls back to the chip
// label, no date filter reads "all time".
export function dateRangeSummaryLabel(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return 'all time'

  const preset = DATE_PRESETS.find((option) => {
    if (option.days == null) return false
    const range = presetRange(option)
    return range.dateFrom === dateFrom && range.dateTo === dateTo
  })
  if (preset) return `last ${preset.days} days`

  return dateChipLabel(dateFrom, dateTo)
}

export function readJournalFilters(searchParams) {
  const plantIdsParam = searchParams.get('plant_ids')
  const kindsParam = searchParams.get('kinds')
  return {
    plantIds: plantIdsParam
      ? plantIdsParam
          .split(',')
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [],
    kinds: kindsParam ? kindsParam.split(',').filter((kind) => JOURNAL_KINDS.includes(kind)) : [],
    dateFrom: searchParams.get('date_from') || null,
    dateTo: searchParams.get('date_to') || null,
  }
}

export function applyFilters(setSearchParams, next) {
  setSearchParams(
    (prev) => {
      const updated = new URLSearchParams(prev)
      if (next.plantIds.length) updated.set('plant_ids', next.plantIds.join(','))
      else updated.delete('plant_ids')
      if (next.kinds.length) updated.set('kinds', next.kinds.join(','))
      else updated.delete('kinds')
      if (next.dateFrom) updated.set('date_from', next.dateFrom)
      else updated.delete('date_from')
      if (next.dateTo) updated.set('date_to', next.dateTo)
      else updated.delete('date_to')
      return updated
    },
    { replace: false },
  )
}
