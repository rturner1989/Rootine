import { useJournal } from '../../hooks/useJournal'
import { addDays } from '../../utils/calendarGrid'
import { isoDateKey } from '../../utils/dateKey'
import Action from '../ui/Action'
import Spinner from '../ui/Spinner'
import ScheduledRow from './calendar/ScheduledRow'
import Entry from './Entry'

const DAYS_IN_WEEK = 7
const WEEKDAY = { weekday: 'long' }
const DAY_MONTH = { day: 'numeric', month: 'short' }

function groupByDay(items, keyOf) {
  const byDay = new Map()
  for (const item of items) {
    const key = keyOf(item)
    if (!key) continue
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(item)
  }
  return byDay
}

// The week view — a vertical agenda of the 7 days, each row listing that
// day's logged entries (fetched in full, unlike the month grid's compact
// dots) plus its due/overdue care. Empty days still show so the week's
// shape reads at a glance. `scheduled` comes from the calendar query the
// parent already ran; logged entries are fetched here for the week window.
export default function WeekAgenda({ weekStart, scheduled = [], filters, today, fill = false }) {
  const weekEnd = addDays(weekStart, DAYS_IN_WEEK - 1)
  const rangeEnd = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999)
  const { data, isLoading, error, refetch } = useJournal({
    plantIds: filters.plantIds,
    kinds: filters.kinds,
    dateFrom: weekStart.toISOString(),
    dateTo: rangeEnd.toISOString(),
  })

  const entriesByDay = groupByDay(data?.pages.flatMap((page) => page.entries) ?? [], (entry) =>
    entry.occurred_at ? isoDateKey(new Date(entry.occurred_at)) : null,
  )
  const scheduledByDay = groupByDay(scheduled, (item) => item.date)
  const todayKey = isoDateKey(today)

  const days = Array.from({ length: DAYS_IN_WEEK }, (_, offset) => {
    const date = addDays(weekStart, offset)
    const key = isoDateKey(date)
    return {
      key,
      date,
      isToday: key === todayKey,
      scheduled: scheduledByDay.get(key) ?? [],
      entries: entriesByDay.get(key) ?? [],
    }
  })

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading this week" className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-ink-soft">Couldn't load this week.</p>
        <Action type="button" variant="secondary" onClick={() => refetch()}>
          Try again
        </Action>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${fill ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>
      {days.map((day) => {
        const overdue = day.scheduled.some((item) => item.state === 'overdue')
        const isEmpty = day.scheduled.length === 0 && day.entries.length === 0
        return (
          <section key={day.key} className={day.isToday ? 'bg-mint/40' : ''}>
            <header className="sticky top-0 z-[5] flex items-center gap-2 border-b border-dashed border-paper-edge bg-paper-deep px-4 lg:px-5 py-2">
              <span className={`eyebrow-label ${day.isToday ? 'text-emerald' : 'text-ink-softer'}`}>
                {day.isToday ? 'Today' : day.date.toLocaleDateString(undefined, WEEKDAY)}
              </span>
              <span className="text-xs font-semibold text-ink-soft">
                {day.date.toLocaleDateString(undefined, DAY_MONTH)}
              </span>
              {overdue && (
                <span className="ml-auto rounded-full bg-coral-deep px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-paper">
                  Overdue
                </span>
              )}
            </header>
            {isEmpty ? (
              <p className="px-4 lg:px-5 py-2.5 text-xs italic text-ink-softer">Nothing logged</p>
            ) : (
              <ul className="flex flex-col">
                {day.scheduled.map((item) => (
                  <ScheduledRow key={`${item.kind}-${item.plant_id}-${item.state}`} item={item} />
                ))}
                {day.entries.map((entry) => (
                  <Entry key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
