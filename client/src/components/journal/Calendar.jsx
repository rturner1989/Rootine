import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useJournalCalendar } from '../../hooks/useJournalCalendar'
import { addDays, addMonths, buildCalendarGrid, gridRange, startOfWeek, weekRange } from '../../utils/calendarGrid'
import { isoDateKey } from '../../utils/dateKey'
import Action from '../ui/Action'
import ErrorState from '../ui/errors/ErrorState'
import Popover from '../ui/Popover'
import Spinner from '../ui/Spinner'
import CalendarToolbar from './calendar/CalendarToolbar'
import DayDetail from './calendar/DayDetail'
import MonthGrid from './calendar/MonthGrid'
import { readJournalFilters } from './filter/config'
import WeekAgenda from './WeekAgenda'

const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long' }

// "8 – 14 Sep 2025", widening to "29 Sep – 5 Oct 2025" when the week spans
// two months.
function weekLabel(cursor) {
  const start = startOfWeek(cursor)
  const end = addDays(start, 6)
  const startFormat = start.getMonth() === end.getMonth() ? { day: 'numeric' } : { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString(undefined, startFormat)} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// The Calendar tab (mockup 23). Two views off one toggle: a month grid
// (MonthGrid) dotting logged / upcoming / overdue care, and a week agenda
// (WeekAgenda) listing each day's entries + due care in full. This component
// owns the orchestration — view + visible period (local UI state), the
// windowed events + schedule (server state via useJournalCalendar), period
// nav, and the month view's day popover. Scoped to one plant on Plant Detail
// (plantId), or the URL plant/kind filters on the all-plants journal.
// Weather pills are deferred to their own ticket.
export default function Calendar({ plantId = null, fill = false }) {
  const [searchParams] = useSearchParams()
  const urlFilters = readJournalFilters(searchParams)
  const filters = {
    plantIds: plantId ? [plantId] : urlFilters.plantIds,
    kinds: urlFilters.kinds,
  }
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(null)
  const anchorRef = useRef(null)

  const isWeek = view === 'week'
  const range = isWeek ? weekRange(cursor) : gridRange(cursor)
  const { data, isLoading, error, refetch, isPlaceholderData } = useJournalCalendar(range, filters)

  const now = new Date()
  const periodLabel = isWeek
    ? weekLabel(cursor)
    : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const isCurrentPeriod = isWeek
    ? isoDateKey(startOfWeek(cursor)) === isoDateKey(startOfWeek(now))
    : cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth()
  const selectedKey = selected?.cell.key ?? null
  const scheduledForSelected = selected ? (data?.scheduled ?? []).filter((item) => item.date === selectedKey) : []
  // Count of tasks overdue as of today (all land on today's date) — drives
  // the red badge that cuts through today's green identity in the month grid.
  const todayKey = isoDateKey(now)
  const overdueTodayCount = (data?.scheduled ?? []).filter(
    (item) => item.state === 'overdue' && item.date === todayKey,
  ).length

  // Anchor placement flips toward the viewport centre so a bottom-row /
  // right-column cell doesn't push the popover off-screen.
  function openDay(cell, element) {
    const rect = element.getBoundingClientRect()
    const vertical = rect.bottom > window.innerHeight / 2 ? 'top' : 'bottom'
    const horizontal = rect.right > window.innerWidth / 2 ? 'right' : 'left'
    anchorRef.current = element
    setSelected({ cell, placement: `${vertical}-${horizontal}` })
  }

  function closeDay({ reason } = {}) {
    const trigger = anchorRef.current
    setSelected(null)
    if (reason === 'escape') trigger?.focus()
  }

  // Paging unmounts the anchored day button, so drop any open popover first.
  // Step moves by week or month depending on the active view.
  function changePeriod(delta) {
    setSelected(null)
    setCursor((current) => (isWeek ? addDays(current, delta * 7) : addMonths(current, delta)))
  }

  function jumpToToday() {
    setSelected(null)
    setCursor(new Date())
  }

  function changeView(next) {
    setSelected(null)
    setView(next)
  }

  function renderBody() {
    if (isLoading) {
      return (
        <div role="status" aria-label="Loading your calendar" className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )
    }

    if (error) {
      return (
        <ErrorState
          scheme="500"
          headingLevel="h2"
          title={
            <>
              Couldn't load <em>your calendar</em>
            </>
          }
          description="The calendar didn't load. Try again, or head back to Today."
          actions={[
            <Action key="retry" type="button" variant="primary" onClick={() => refetch()}>
              Try again
            </Action>,
            <Action key="today" variant="secondary" to="/">
              Back to Today
            </Action>,
          ]}
        />
      )
    }

    if (isWeek) {
      return (
        <WeekAgenda
          weekStart={startOfWeek(cursor)}
          scheduled={data?.scheduled ?? []}
          filters={filters}
          today={now}
          fill={fill}
        />
      )
    }

    return (
      <MonthGrid
        weeks={buildCalendarGrid(cursor, { events: data?.events, scheduled: data?.scheduled })}
        selectedKey={selectedKey}
        overdueTodayCount={overdueTodayCount}
        onOpenDay={openDay}
        label={periodLabel}
        isPlaceholderData={isPlaceholderData}
        fill={fill}
      />
    )
  }

  return (
    <div className={`flex flex-col ${fill ? 'flex-1 min-h-0' : ''}`}>
      <CalendarToolbar
        periodLabel={periodLabel}
        isWeek={isWeek}
        isCurrentPeriod={isCurrentPeriod}
        view={view}
        onPrev={() => changePeriod(-1)}
        onNext={() => changePeriod(1)}
        onToday={jumpToToday}
        onViewChange={changeView}
      />
      {renderBody()}

      <Popover
        key={selectedKey}
        open={selected != null}
        onClose={closeDay}
        anchorRef={anchorRef}
        portal
        placement={selected?.placement ?? 'bottom-left'}
        surface="panel"
        autoFocus
        role="dialog"
        label={selected ? selected.cell.date.toLocaleDateString(undefined, LONG_DATE) : undefined}
      >
        {selected && <DayDetail date={selected.cell.date} filters={filters} scheduled={scheduledForSelected} />}
      </Popover>
    </div>
  )
}
