import { useSearchParams } from 'react-router-dom'
import { usePlants } from '../../../hooks/usePlants'
import FilterChips from '../../ui/FilterChips'
import { applyFilters, dateChipLabel, EMPTY_DRAFT, KIND_EMOJI, KIND_LABEL, readJournalFilters } from './config'
import PlantThumb from './PlantThumb'

// The active-filter chips + Clear all, decoupled from the filter editor so
// the calendar views can show + clear what's scoping their data even though
// they hide the editor pill for period nav. List renders these under its
// FilterToolbar pill; Week / Month render them beside the period nav.
//
// `hideDate` drops the date chip on the calendar views, where the visible
// window is the date range — a date filter has no effect there, so a chip
// for it would mislead. `lockedPlantId` (Plant Detail) hides plant chips;
// `hideKinds` (Photos) hides event-type chips.
export default function ActiveChips({ lockedPlantId = null, hideKinds = false, hideDate = false }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readJournalFilters(searchParams)
  const { data: plants } = usePlants()

  const hidePlants = lockedPlantId != null
  const activePlants = hidePlants
    ? []
    : filters.plantIds.map((id) => plants?.find((plant) => plant.id === id)).filter(Boolean)
  const activeKinds = hideKinds ? [] : filters.kinds
  const dateLabel = hideDate ? null : dateChipLabel(filters.dateFrom, filters.dateTo)

  function clearPlant(plantId) {
    applyFilters(setSearchParams, { ...filters, plantIds: filters.plantIds.filter((id) => id !== plantId) })
  }

  function clearKind(kind) {
    applyFilters(setSearchParams, { ...filters, kinds: filters.kinds.filter((value) => value !== kind) })
  }

  function clearDate() {
    applyFilters(setSearchParams, { ...filters, dateFrom: null, dateTo: null })
  }

  function clearAll() {
    applyFilters(setSearchParams, EMPTY_DRAFT)
  }

  const chips = [
    ...activePlants.map((plant) => ({
      key: `plant-${plant.id}`,
      label: plant.nickname,
      clearLabel: `Clear ${plant.nickname} filter`,
      onClear: () => clearPlant(plant.id),
      icon: <PlantThumb src={plant.species?.image_url} size="sm" />,
    })),
    ...activeKinds.map((kind) => ({
      key: `kind-${kind}`,
      label: KIND_LABEL[kind],
      clearLabel: `Remove ${KIND_LABEL[kind]} filter`,
      onClear: () => clearKind(kind),
      icon: <ChipEmoji emoji={KIND_EMOJI[kind]} />,
    })),
  ]

  if (dateLabel) {
    chips.push({
      key: 'date',
      label: dateLabel,
      clearLabel: 'Clear date filter',
      onClear: clearDate,
      icon: <ChipEmoji emoji="📅" />,
    })
  }

  return <FilterChips chips={chips} onClearAll={clearAll} />
}

// The circular emoji wafer used inside kind + date chips.
function ChipEmoji({ emoji }) {
  return (
    <span
      aria-hidden="true"
      className="w-4 h-4 rounded-full bg-paper inline-flex items-center justify-center text-[10px] leading-none shrink-0"
    >
      {emoji}
    </span>
  )
}
