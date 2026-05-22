import { faFilter } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { usePlants } from '../../hooks/usePlants'
import Action from '../ui/Action'
import Dialog from '../ui/Dialog'
import Popover from '../ui/Popover'
import ActiveChips from './filter/ActiveChips'
import { applyFilters, readJournalFilters } from './filter/config'
import { DialogFilterPanel, PopoverFilterPanel } from './filter/Panels'

// The journal filter control: a trigger pill, the row of active-filter
// chips (ActiveChips, shared with the calendar period nav), and the popover
// (desktop) / dialog (mobile) panel that edits a draft and commits it to
// the URL. Filter logic lives in filter/config; the panel body in
// filter/Fields.
//
// `lockedPlantId` (Plant Detail journal) hides the plant filter; `hideKinds`
// (Photos tab) hides event types; `surface` picks the popover treatment.
export default function FilterToolbar({ lockedPlantId = null, hideKinds = false, surface = 'glass' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readJournalFilters(searchParams)
  const { data: plants } = usePlants()
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const buttonRef = useRef(null)

  const hidePlants = lockedPlantId != null
  const hasDate = Boolean(filters.dateFrom || filters.dateTo)
  const plantCount = hidePlants ? 0 : filters.plantIds.length
  const activeKinds = hideKinds ? [] : filters.kinds
  const activeCount = plantCount + activeKinds.length + (hasDate ? 1 : 0)
  const anyActive = activeCount > 0

  function commitDraft(draft) {
    applyFilters(setSearchParams, draft)
    setOpen(false)
  }

  function handleClose({ reason } = {}) {
    setOpen(false)
    if (reason === 'escape') buttonRef.current?.focus()
  }

  const buttonClass = anyActive ? 'bg-mint text-emerald' : 'bg-paper-deep text-ink-soft hover:bg-paper-edge'

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      <Action
        ref={buttonRef}
        variant="unstyled"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 ease-out ${buttonClass}`}
      >
        <FontAwesomeIcon icon={faFilter} className="w-3 h-3" aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold bg-emerald text-paper">
            {activeCount}
          </span>
        )}
      </Action>

      <ActiveChips lockedPlantId={lockedPlantId} hideKinds={hideKinds} />

      {isMobile ? (
        <Dialog open={open} onClose={handleClose} title="Filter journal entries">
          <DialogFilterPanel
            plants={plants}
            initialFilters={filters}
            onApply={commitDraft}
            onClose={handleClose}
            hidePlants={hidePlants}
            hideKinds={hideKinds}
          />
        </Dialog>
      ) : (
        <Popover
          open={open}
          onClose={handleClose}
          anchorRef={buttonRef}
          role="dialog"
          label="Filter journal entries"
          placement="bottom-left"
          surface={surface}
          autoFocus
          modal
          className="w-[340px] max-w-[calc(100vw-1.5rem)] p-4"
        >
          <PopoverFilterPanel
            plants={plants}
            initialFilters={filters}
            onApply={commitDraft}
            onClose={handleClose}
            hidePlants={hidePlants}
            hideKinds={hideKinds}
          />
        </Popover>
      )}
    </div>
  )
}
