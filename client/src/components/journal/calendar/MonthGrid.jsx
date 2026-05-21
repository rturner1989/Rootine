import { weekdayLabels } from '../../../utils/calendarGrid'
import { DOT_LABEL, dotClass } from './dots'

const WEEKDAY_SHORT = weekdayLabels({ format: 'short' })
const WEEKDAY_NARROW = weekdayLabels({ format: 'narrow' })
const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long' }

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
  if (hasVariant(cell, 'logged')) return { text: 'Logged', tone: 'text-ink-soft' }
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

// A 6×7 month of day cells. In-month days are <button>s opening the day
// popover; out-of-month padding is a muted, aria-hidden cell. Today carries
// a red overdue badge when there's outstanding care.
export default function MonthGrid({
  weeks,
  selectedKey,
  overdueTodayCount,
  onOpenDay,
  label,
  isPlaceholderData,
  fill = false,
}) {
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
          onClick={(event) => onOpenDay(cell, event.currentTarget)}
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

  return (
    <div className={`flex flex-col px-3 py-3 ${fill ? 'flex-1 min-h-0' : ''}`}>
      <ul aria-hidden="true" className="grid grid-cols-7 gap-1.5 px-1.5 pb-2">
        {WEEKDAY_SHORT.map((weekday, index) => (
          <li key={weekday} className="eyebrow-label text-center text-ink-softer">
            <span className="hidden sm:inline">{weekday}</span>
            <span className="sm:hidden">{WEEKDAY_NARROW[index]}</span>
          </li>
        ))}
      </ul>
      <ul
        aria-label={`Events in ${label}`}
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
