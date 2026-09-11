import { useSearchParams } from 'react-router-dom'
import FilterControl from '../ui/FilterControl'
import ActiveChips from './filter/ActiveChips'
import {
  applyEncyclopediaFilters,
  ENCYCLOPEDIA_FILTER_SCHEMA,
  type EncyclopediaFilterState,
  readEncyclopediaFilters,
} from './filter/config'
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
      // Denser glass so the panel reads solid over the species grid — plain
      // `glass` (72%) looks transparent at the top of the page where there's
      // nothing busy behind it to frost. Matches the journal Photos filter.
      surface="glass-dense"
      onApply={(draft) => applyEncyclopediaFilters(setSearchParams, draft)}
      renderFields={(form) => (
        <Fields
          // FilterControl's draft is the generic FilterDraft shape — this
          // schema's concrete fields are fixed by ENCYCLOPEDIA_FILTER_SCHEMA,
          // so narrowing to EncyclopediaFilterState here is safe.
          draft={form.draft as EncyclopediaFilterState}
          toggleValue={form.toggleValue}
          setValue={form.setValue}
        />
      )}
    >
      <ActiveChips />
    </FilterControl>
  )
}
