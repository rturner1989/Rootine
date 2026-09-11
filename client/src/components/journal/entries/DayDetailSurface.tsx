import type { RefObject } from 'react'
import type { ScheduledCareItem } from '../../../types/journal'
import type { CalendarCell } from '../../../utils/calendarGrid'
import Card from '../../ui/Card'
import Dialog from '../../ui/Dialog'
import Popover, { type PopoverPlacement } from '../../ui/Popover'
import DayDetail from '../calendar/DayDetail'
import type { CalendarFilters } from '../filter/config'

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

export type DaySelection = { cell: CalendarCell; placement: PopoverPlacement }

export type DayDetailCloseInfo = { reason?: 'outside' | 'escape' }

export type DayDetailSurfaceProps = {
  selected: DaySelection | null
  onClose: (info?: DayDetailCloseInfo) => void
  anchorRef: RefObject<HTMLElement | null>
  filters: CalendarFilters
  scheduled: ScheduledCareItem[]
  isMobile: boolean
}

// The day-detail surface: an anchored Popover off the tapped day cell on
// desktop, a bottom-sheet Dialog on mobile (the popover is cramped + badly
// placed on a phone) — the same Popover↔Dialog split the filter control
// uses. `selected` is { cell, placement } from the month grid; DayDetail
// runs `bare` in the dialog so the Dialog owns the title + close + focus.
export default function DayDetailSurface({
  selected,
  onClose,
  anchorRef,
  filters,
  scheduled,
  isMobile,
}: DayDetailSurfaceProps) {
  const date = selected?.cell.date
  const dateLabel = date ? date.toLocaleDateString(undefined, LONG_DATE) : undefined
  const open = selected != null

  if (isMobile) {
    return (
      <Dialog open={open} onClose={onClose} title={dateLabel}>
        <Card.Header>
          <p className="text-base font-extrabold text-ink">{dateLabel}</p>
        </Card.Header>
        <Card.Body className="-mx-6">
          {selected && date && <DayDetail date={date} filters={filters} scheduled={scheduled} bare />}
        </Card.Body>
      </Dialog>
    )
  }

  return (
    <Popover
      key={selected?.cell.key ?? null}
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      portal
      placement={selected?.placement ?? 'bottom-left'}
      surface="panel"
      autoFocus
      modal
      role="dialog"
      label={dateLabel}
    >
      {selected && date && <DayDetail date={date} filters={filters} scheduled={scheduled} />}
    </Popover>
  )
}
