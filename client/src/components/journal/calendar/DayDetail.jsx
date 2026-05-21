import { useEffect, useRef } from 'react'
import { useJournal } from '../../../hooks/useJournal'
import Spinner from '../../ui/Spinner'
import Entry from '../Entry'
import ScheduledRow from './ScheduledRow'

// The day-detail body. Past/today entries are fetched on demand (the month
// query only carries compact dots); future + overdue care is passed in from
// the calendar's already-loaded schedule, so it shows "Water due: Monty" on
// days nothing was logged. Logged bounds are the exact local-day instants so
// they match the local day the dots were bucketed into, regardless of the
// server's timezone. Reuses the Timeline Entry row for logged events.
//
// `bare` returns just the list body (no header / sizing / self-focus) for the
// mobile Dialog, which supplies its own title chrome + focus trap. The
// default mode is the desktop Popover: a sized, self-focusing panel with its
// own date header.
const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long' }

export default function DayDetail({ date, filters, scheduled = [], bare = false }) {
  const dateLabel = date.toLocaleDateString(undefined, LONG_DATE)
  // The popover content is read-only (no focusable children), so the
  // Popover's autoFocus finds nothing — move focus into the dialog here so
  // keyboard + SR users land inside it, not stranded on the day button.
  const rootRef = useRef(null)
  useEffect(() => {
    if (!bare) rootRef.current?.focus()
  }, [bare])

  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  const { data, isLoading, error } = useJournal({
    plantIds: filters.plantIds,
    kinds: filters.kinds,
    dateFrom: date.toISOString(),
    dateTo: dayEnd.toISOString(),
  })
  const entries = data?.pages.flatMap((page) => page.entries) ?? []

  function renderBody() {
    if (isLoading) {
      return (
        <div role="status" aria-label="Loading this day" className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      )
    }

    if (error) {
      return <p className="px-4 lg:px-5 py-6 text-center text-xs text-ink-soft">Couldn't load this day.</p>
    }

    if (entries.length === 0 && scheduled.length === 0) {
      return <p className="px-4 lg:px-5 py-6 text-center text-xs italic text-ink-softer">Nothing logged on this day.</p>
    }

    return (
      <ul className="flex flex-col">
        {scheduled.map((item) => (
          <ScheduledRow key={`${item.kind}-${item.plant_id}-${item.state}`} item={item} />
        ))}
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ul>
    )
  }

  if (bare) return renderBody()

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex max-h-[60vh] w-[clamp(15rem,80vw,20rem)] flex-col focus:outline-none"
    >
      <header className="shrink-0 border-b border-paper-edge px-4 lg:px-5 py-2.5">
        <p className="eyebrow-label text-ink-softer">{dateLabel}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{renderBody()}</div>
    </div>
  )
}
