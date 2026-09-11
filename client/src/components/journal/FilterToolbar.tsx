import { useSearchParams } from 'react-router-dom'
import { usePlants } from '../../hooks/usePlants'
import FilterControl from '../ui/FilterControl'
import type { PopoverSurface } from '../ui/Popover'
import ActiveChips from './filter/ActiveChips'
import { applyFilters, JOURNAL_FILTER_SCHEMA, type JournalFilters, readJournalFilters } from './filter/config'
import Fields from './filter/Fields'

export type FilterToolbarProps = {
  lockedPlantId?: number | null
  hideKinds?: boolean
  surface?: PopoverSurface
}

// The journal's filter control: supplies the schema, the field JSX and
// the chip row to the generic FilterControl. Filter logic lives in
// filter/config; the panel body in filter/Fields.
//
// `lockedPlantId` (Plant Detail journal) hides the plant filter; `hideKinds`
// (Photos tab) hides event types; `surface` picks the popover treatment.
export default function FilterToolbar({
  lockedPlantId = null,
  hideKinds = false,
  surface = 'glass',
}: FilterToolbarProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readJournalFilters(searchParams)
  const { data: plants } = usePlants()

  const hidePlants = lockedPlantId != null
  const hiddenAxisIds = [hidePlants && 'plantIds', hideKinds && 'kinds'].filter(
    (id): id is string => typeof id === 'string',
  )

  return (
    <FilterControl
      schema={JOURNAL_FILTER_SCHEMA}
      filters={filters}
      hiddenAxisIds={hiddenAxisIds}
      title="Filter journal entries"
      surface={surface}
      onApply={(draft) => applyFilters(setSearchParams, draft)}
      renderFields={(form) => (
        <Fields
          plants={plants}
          hidePlants={hidePlants}
          hideKinds={hideKinds}
          // FilterControl's draft is the generic FilterDraft shape — this
          // schema's concrete fields are fixed by JOURNAL_FILTER_SCHEMA, so
          // narrowing to JournalFilters here is safe.
          draft={form.draft as JournalFilters}
          toggleValue={form.toggleValue}
          setValue={form.setValue}
        />
      )}
    >
      <ActiveChips lockedPlantId={lockedPlantId} hideKinds={hideKinds} />
    </FilterControl>
  )
}
