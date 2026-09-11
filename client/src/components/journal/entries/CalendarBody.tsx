import type { useJournalCalendar } from '../../../hooks/useJournalCalendar'
import { buildCalendarGrid, type CalendarCell, startOfWeek } from '../../../utils/calendarGrid'
import { isoDateKey } from '../../../utils/dateKey'
import Action from '../../ui/Action'
import ErrorState from '../../ui/errors/ErrorState'
import Spinner from '../../ui/Spinner'
import MonthGrid from '../calendar/MonthGrid'
import type { CalendarFilters } from '../filter/config'
import WeekAgenda from '../WeekAgenda'

export type CalendarBodyProps = {
  query: ReturnType<typeof useJournalCalendar>
  isWeek: boolean
  cursor: Date
  filters: CalendarFilters
  now: Date
  selectedKey: string | null
  onOpenDay: (cell: CalendarCell, element: HTMLButtonElement) => void
  periodLabel: string
  fill: boolean
}

// The Week / Month body of the entries surface — loading + error states,
// then the week agenda or the month grid built from the windowed calendar
// query. The List view is the Timeline; Entries picks between them. Local
// UI state (cursor, selection) lives on Entries and arrives as props.
export default function CalendarBody({
  query,
  isWeek,
  cursor,
  filters,
  now,
  selectedKey,
  onOpenDay,
  periodLabel,
  fill,
}: CalendarBodyProps) {
  if (query.isLoading) {
    return (
      <div role="status" aria-label="Loading your calendar" className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (query.error) {
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
          <Action key="retry" type="button" variant="primary" onClick={() => query.refetch()}>
            Try again
          </Action>,
          <Action key="today" variant="secondary" to="/">
            Back to Today
          </Action>,
        ]}
      />
    )
  }

  const scheduled = query.data?.scheduled ?? []

  if (isWeek) {
    return (
      <WeekAgenda weekStart={startOfWeek(cursor)} scheduled={scheduled} filters={filters} today={now} fill={fill} />
    )
  }

  // Count of tasks overdue as of today (all land on today's date) — drives
  // the red badge that cuts through today's green identity in the month grid.
  const todayKey = isoDateKey(now)
  const overdueTodayCount = scheduled.filter((item) => item.state === 'overdue' && item.date === todayKey).length

  return (
    <MonthGrid
      weeks={buildCalendarGrid(cursor, { events: query.data?.events, scheduled })}
      selectedKey={selectedKey}
      overdueTodayCount={overdueTodayCount}
      onOpenDay={onOpenDay}
      label={periodLabel}
      isPlaceholderData={query.isPlaceholderData}
      fill={fill}
    />
  )
}
