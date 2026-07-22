import { useSearchParams } from 'react-router-dom'
import { usePlants } from '../../hooks/usePlants'
import FilterControl from '../ui/FilterControl'
import ActiveChips from './filter/ActiveChips'
import { applyFilters, JOURNAL_FILTER_SCHEMA, readJournalFilters } from './filter/config'
import Fields from './filter/Fields'

// The journal's filter control: supplies the schema, the field JSX and the
// chip row to the generic FilterControl. Filter logic lives in
// filter/config; the panel body in filter/Fields.
//
// `lockedPlantId` (Plant Detail journal) hides the plant filter; `hideKinds`
// (Photos tab) hides event types; `surface` picks the popover treatment.
export default function FilterToolbar({ lockedPlantId = null, hideKinds = false, surface = 'glass' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readJournalFilters(searchParams)
  const { data: plants } = usePlants()

  const hidePlants = lockedPlantId != null
  const hiddenAxisIds = [hidePlants && 'plantIds', hideKinds && 'kinds'].filter(Boolean)

  return (
    <FilterControl
      schema={JOURNAL_FILTER_SCHEMA}
      filters={filters}
      hiddenAxisIds={hiddenAxisIds}
      title="Filter journal entries"
      surface={surface}
      onApply={(draft) => applyFilters(setSearchParams, draft)}
      renderFields={(form) => <Fields plants={plants} hidePlants={hidePlants} hideKinds={hideKinds} {...form} />}
    >
      <ActiveChips lockedPlantId={lockedPlantId} hideKinds={hideKinds} />
    </FilterControl>
  )
}
