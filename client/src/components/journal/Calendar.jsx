import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useJournalCalendar } from '../../hooks/useJournalCalendar'
import {
  addDays,
  addMonths,
  buildCalendarGrid,
  DOT_KINDS,
  gridRange,
  startOfWeek,
  weekdayLabels,
  weekRange,
} from '../../utils/calendarGrid'
import { isoDateKey } from '../../utils/dateKey'
import SegmentedControl from '../form/SegmentedControl'
import Action from '../ui/Action'
import ActionIcon from '../ui/ActionIcon'
import ErrorState from '../ui/errors/ErrorState'
import Heading from '../ui/Heading'
import Popover from '../ui/Popover'
import Spinner from '../ui/Spinner'
import DayDetail from './calendar/DayDetail'
import { readJournalFilters } from './filter/config'
import WeekAgenda from './WeekAgenda'

const DOT_FILL = { water: 'bg-water', feed: 'bg-leaf', photo: 'bg-coral', milestone: 'bg-sunshine' }
const DOT_RING = { water: 'border-water', feed: 'border-leaf' }
const DOT_LABEL = { water: 'Water', feed: 'Feed', photo: 'Photo', milestone: 'Milestone' }

// logged = filled (done), scheduled = hollow ring (planned), overdue =
// coral + pulse (missed). Overdue is its own colour, not the kind's.
function dotClass({ kind, variant }) {
  if (variant === 'logged') return `h-2 w-2 rounded-full ${DOT_FILL[kind]}`
  if (variant === 'overdue') return 'h-2 w-2 rounded-full bg-coral-deep cal-dot-overdue'
  return `h-2 w-2 rounded-full border-[1.5px] ${DOT_RING[kind]}`
}
const WEEKDAY_SHORT = weekdayLabels({ format: 'short' })
const WEEKDAY_NARROW = weekdayLabels({ format: 'narrow' })
const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long' }

const VIEW_OPTIONS = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
]

// "8 – 14 Sep 2025", widening to "29 Sep – 5 Oct 2025" when the week spans
// two months.
function weekLabel(cursor) {
  const start = startOfWeek(cursor)
  const end = addDays(start, 6)
  const startFormat = start.getMonth() === end.getMonth() ? { day: 'numeric' } : { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString(undefined, startFormat)} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function hasVariant(cell, variant) {
  return cell.dots.some((dot) => dot.variant === variant)
}

// today wins (mint identity, even as the overdue endpoint); then the red
// overdue trail tints the run of cells from the missed day up to today
// (beats the logged lift so the band stays unbroken — logged dots still
// render on top); a logged day lifts to paper + shadow ("something
// happened here"); a day with only upcoming dots stays flat on paper-deep.
function cellClasses(cell) {
  const base = 'flex flex-col overflow-hidden rounded-md px-1.5 pt-1.5 pb-1 min-h-[3.25rem] sm:min-h-[4.25rem]'
  if (cell.isOutOfMonth) return `${base} bg-paper-deep opacity-40`
  if (cell.isToday) return `${base} bg-mint ring-2 ring-inset ring-emerald`
  if (cell.inOverdueTrail) return `${base} bg-coral/15`
  if (hasVariant(cell, 'logged')) return `${base} bg-paper shadow-warm-sm`
  return `${base} bg-paper-deep`
}

// Desktop-only one-word state line under the dots (mockup care-summary,
// hidden on mobile). Names the day's most-vital state — overdue beats due
// beats logged — without counts. Dots carry the kind; this carries urgency.
function cellSummary(cell) {
  if (hasVariant(cell, 'overdue')) return { text: 'Overdue', tone: 'text-coral-deep' }
  if (hasVariant(cell, 'scheduled')) return { text: 'Due', tone: 'text-ink-soft' }
  if (hasVariant(cell, 'logged')) return { text: 'Logged', tone: 'text-ink-softer' }
  return null
}

// Screen-reader name for a day. The dots are decorative (aria-hidden), so
// this carries the date + what was logged / is due / is overdue.
function dayLabel(cell) {
  const date = cell.date.toLocaleDateString(undefined, LONG_DATE)
  const byVariant = (variant) => cell.dots.filter((dot) => dot.variant === variant).map((dot) => DOT_LABEL[dot.kind])

  const parts = []
  const logged = byVariant('logged')
  const due = byVariant('scheduled')
  const overdue = byVariant('overdue')
  if (logged.length) parts.push(`logged: ${logged.join(', ')}`)
  if (due.length) parts.push(`due: ${due.join(', ')}`)
  if (overdue.length) parts.push(`overdue: ${overdue.join(', ')}`)

  const suffix = parts.length ? `, ${parts.join('; ')}` : ''
  return `${cell.isToday ? 'Today, ' : ''}${date}${suffix}`
}

function renderDayNum(cell) {
  return (
    <span aria-hidden="true" className={`text-xs font-extrabold ${cell.isToday ? 'text-forest' : 'text-ink'}`}>
      {cell.dayNum}
    </span>
  )
}

function renderDots(cell) {
  if (cell.dots.length === 0) return null
  return (
    <span aria-hidden="true" className="mt-1.5 flex flex-1 flex-wrap content-start gap-0.5">
      {cell.dots.map((dot) => (
        <span key={`${dot.kind}-${dot.variant}`} className={dotClass(dot)} />
      ))}
    </span>
  )
}

function renderSummary(cell) {
  const summary = cellSummary(cell)
  if (!summary) return null
  return (
    <span aria-hidden="true" className={`mt-0.5 hidden text-[9px] font-bold leading-tight sm:block ${summary.tone}`}>
      {summary.text}
    </span>
  )
}

// The Calendar tab (mockup 23). Two views off one toggle: a month grid
// dotting what was logged (filled), upcoming (hollow), and overdue (coral),
// and a week agenda listing each day's entries + due care in full. The
// view + visible period are local UI state; events + schedule are server
// state keyed by the window (useJournalCalendar). Scoped to one plant on
// Plant Detail (plantId), or the URL plant/kind filters on the all-plants
// journal. In month view, clicking a day opens a popover with that day's
// detail (DayDetail). Weather pills are deferred to their own ticket.
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

  function renderDay(cell) {
    if (cell.isOutOfMonth) {
      return (
        <li key={cell.key} aria-hidden="true">
          <div className={`${cellClasses(cell)} h-full`}>
            {renderDayNum(cell)}
            {renderDots(cell)}
          </div>
        </li>
      )
    }

    const isSelected = cell.key === selectedKey
    const showOverdueBadge = cell.isToday && overdueTodayCount > 0
    return (
      <li key={cell.key}>
        <button
          type="button"
          aria-label={dayLabel(cell)}
          aria-haspopup="dialog"
          aria-expanded={isSelected}
          onClick={(event) => openDay(cell, event.currentTarget)}
          className={`${cellClasses(cell)} h-full w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald ${
            isSelected ? 'ring-2 ring-inset ring-emerald' : ''
          }`}
        >
          <span className="flex items-start justify-between gap-1">
            {renderDayNum(cell)}
            {showOverdueBadge && (
              <span className="shrink-0 rounded-full bg-coral-deep px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-paper">
                {overdueTodayCount}
                <span className="hidden sm:inline"> overdue</span>
              </span>
            )}
          </span>
          {renderDots(cell)}
          {!showOverdueBadge && renderSummary(cell)}
        </button>
      </li>
    )
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

    const weeks = buildCalendarGrid(cursor, { events: data?.events, scheduled: data?.scheduled })
    return (
      <div className={`flex flex-col px-3 py-3 ${fill ? 'flex-1 min-h-0' : ''}`}>
        <ul aria-hidden="true" className="grid grid-cols-7 gap-1.5 px-1.5 pb-2">
          {WEEKDAY_SHORT.map((label, index) => (
            <li key={label} className="eyebrow-label text-center text-ink-softer">
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{WEEKDAY_NARROW[index]}</span>
            </li>
          ))}
        </ul>
        <ul
          aria-label={`Events in ${periodLabel}`}
          aria-busy={isPlaceholderData || undefined}
          className={`grid flex-1 auto-rows-fr grid-cols-7 gap-1.5 px-1.5 transition-opacity ${
            isPlaceholderData ? 'opacity-60' : ''
          }`}
        >
          {weeks.flat().map(renderDay)}
        </ul>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${fill ? 'flex-1 min-h-0' : ''}`}>
      <div className="shrink-0 flex flex-wrap items-center gap-2.5 border-b border-paper-edge px-4 lg:px-5 py-3">
        <ActionIcon
          icon={faChevronLeft}
          label={isWeek ? 'Previous week' : 'Previous month'}
          scheme="paper"
          onClick={() => changePeriod(-1)}
        />
        <Heading as="div" variant="panel" aria-live="polite" className="text-ink">
          {periodLabel}
        </Heading>
        <ActionIcon
          icon={faChevronRight}
          label={isWeek ? 'Next week' : 'Next month'}
          scheme="paper"
          onClick={() => changePeriod(1)}
        />
        <Action
          variant="unstyled"
          type="button"
          onClick={jumpToToday}
          disabled={isCurrentPeriod}
          className="rounded-full bg-paper-deep px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-paper-edge disabled:cursor-not-allowed disabled:opacity-50"
        >
          Today
        </Action>
        <div className="ml-auto flex items-center gap-3">
          {!isWeek && (
            <ul aria-hidden="true" className="hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex">
              {DOT_KINDS.map((kind) => (
                <li key={kind} className="eyebrow-label flex items-center gap-1.5 text-ink-softer">
                  <span className={`h-2 w-2 rounded-full ${DOT_FILL[kind]}`} />
                  {DOT_LABEL[kind]}
                </li>
              ))}
              <li className="eyebrow-label flex items-center gap-1.5 text-ink-softer">
                <span className="h-2 w-2 rounded-full border-[1.5px] border-ink-softer" />
                Upcoming
              </li>
              <li className="eyebrow-label flex items-center gap-1.5 text-ink-softer">
                <span className="h-2 w-2 rounded-full bg-coral-deep" />
                Overdue
              </li>
            </ul>
          )}
          <SegmentedControl
            label="Calendar view"
            labelHidden
            density="auto"
            value={view}
            options={VIEW_OPTIONS}
            onChange={changeView}
          />
        </div>
      </div>
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
        label={selected ? dayLabel(selected.cell) : undefined}
      >
        {selected && (
          <DayDetail
            date={selected.cell.date}
            dateLabel={selected.cell.date.toLocaleDateString(undefined, LONG_DATE)}
            filters={filters}
            scheduled={scheduledForSelected}
          />
        )}
      </Popover>
    </div>
  )
}
