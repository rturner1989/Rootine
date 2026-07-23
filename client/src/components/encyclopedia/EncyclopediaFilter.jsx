import { useSearchParams } from 'react-router-dom'
import FilterControl from '../ui/FilterControl'
import ActiveChips from './filter/ActiveChips'
import { applyEncyclopediaFilters, ENCYCLOPEDIA_FILTER_SCHEMA, readEncyclopediaFilters } from './filter/config'
import Fields from './filter/Fields'

// Drops a fully wired filter control onto the browse page: Encyclopedia's
// schema + fields + chip row on the shared FilterControl chrome.
export default function EncyclopediaFilter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEncyclopediaFilters(searchParams)

  return (
    <FilterControl
      schema={ENCYCLOPEDIA_FILTER_SCHEMA}
      filters={filters}
      title="Filter species"
      onApply={(draft) => applyEncyclopediaFilters(setSearchParams, draft)}
      renderFields={(form) => <Fields {...form} />}
    >
      <ActiveChips />
    </FilterControl>
  )
}
