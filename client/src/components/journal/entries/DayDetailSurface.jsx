import Card from '../../ui/Card'
import Dialog from '../../ui/Dialog'
import Popover from '../../ui/Popover'
import DayDetail from '../calendar/DayDetail'

const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long' }

// The day-detail surface: an anchored Popover off the tapped day cell on
// desktop, a bottom-sheet Dialog on mobile (the popover is cramped + badly
// placed on a phone) — the same Popover↔Dialog split the filter control
// uses. `selected` is { cell, placement } from the month grid; DayDetail
// runs `bare` in the dialog so the Dialog owns the title + close + focus.
export default function DayDetailSurface({ selected, onClose, anchorRef, filters, scheduled, isMobile }) {
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
          {selected && <DayDetail date={date} filters={filters} scheduled={scheduled} bare />}
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
      role="dialog"
      label={dateLabel}
    >
      {selected && <DayDetail date={date} filters={filters} scheduled={scheduled} />}
    </Popover>
  )
}
