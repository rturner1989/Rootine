import { useSearchParams } from 'react-router-dom'
import FilterChips from '../../ui/FilterChips'
import {
  applyEncyclopediaFilters,
  DIFFICULTY_OPTIONS,
  EMPTY_DRAFT,
  LIGHT_OPTIONS,
  readEncyclopediaFilters,
} from './config'

const DIFFICULTY_LABEL = Object.fromEntries(DIFFICULTY_OPTIONS.map((option) => [option.value, option.label]))
const LIGHT_LABEL = Object.fromEntries(LIGHT_OPTIONS.map((option) => [option.value, option.label]))

// Active-filter chips for the browse grid, built as descriptors and handed
// to the shared FilterChips. Reads its own URL state so it can sit under the
// filter pill without prop-drilling.
export default function ActiveChips() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEncyclopediaFilters(searchParams)

  function clearAxis(patch) {
    applyEncyclopediaFilters(setSearchParams, { ...filters, ...patch })
  }

  const chips = []
  if (filters.petSafe) {
    chips.push({
      key: 'pet',
      label: 'Pet-safe',
      clearLabel: 'Clear pet-safe filter',
      onClear: () => clearAxis({ petSafe: null }),
    })
  }
  for (const value of filters.difficulty) {
    chips.push({
      key: `difficulty-${value}`,
      label: DIFFICULTY_LABEL[value],
      clearLabel: `Remove ${DIFFICULTY_LABEL[value]} filter`,
      onClear: () => clearAxis({ difficulty: filters.difficulty.filter((entry) => entry !== value) }),
    })
  }
  for (const value of filters.light) {
    chips.push({
      key: `light-${value}`,
      label: LIGHT_LABEL[value],
      clearLabel: `Remove ${LIGHT_LABEL[value]} filter`,
      onClear: () => clearAxis({ light: filters.light.filter((entry) => entry !== value) }),
    })
  }

  return <FilterChips chips={chips} onClearAll={() => applyEncyclopediaFilters(setSearchParams, EMPTY_DRAFT)} />
}
