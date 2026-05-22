import { useEffect, useRef } from 'react'
import { useWeather } from '../../../hooks/useWeather'
import { DOT_FILL } from '../../../utils/careDots'
import Action from '../../ui/Action'
import WeatherIcon from '../WeatherIcon'

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { day: 'numeric' })

// Parse YYYY-MM-DD as local-midnight, not UTC.
function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function startOfTodayMs() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

// 7-day chip strip — selected day drives the rituals list below.
// Counts come from `tasksByDay` (dashboard payload). Today defaults
// to selected on first render. The independent "today" dot persists
// even when another day is selected so the user always knows which
// day is real.
export default function WeekStrip({ tasksByDay = {}, selectedDate, onSelectDate }) {
  const { week } = useWeather()
  const todayMs = startOfTodayMs()
  const scrollerRef = useRef(null)
  const selectedRef = useRef(null)

  // Mobile renders the strip as a horizontal scroller so each cell
  // gets breathing room. Auto-scroll the selected day into view on
  // mount + on selection changes so users see the day they care about
  // without having to swipe to it. selectedDate drives the dep — the
  // ref doesn't change identity but the row it points at does, so we
  // re-fire whenever the user picks a different day.
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedDate is the semantic trigger; the ref it updates isn't a dep biome can detect
  useEffect(() => {
    if (!selectedRef.current || !scrollerRef.current) return
    selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDate])

  return (
    <div
      ref={scrollerRef}
      className="flex overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain gap-2 -mx-4 px-4 py-2 snap-x snap-mandatory sm:grid sm:grid-cols-7 sm:gap-1.5 sm:py-0 sm:overflow-visible sm:mx-0 sm:px-0"
    >
      {week.map((day) => {
        const date = parseLocalDate(day.date)
        const isSelected = selectedDate === day.date
        const isToday = date.getTime() === todayMs
        const counts = tasksByDay[day.date] ?? { water: 0, feed: 0 }

        const accessibleParts = [
          DAY_FORMATTER.format(date),
          DATE_FORMATTER.format(date),
          isToday ? 'today' : null,
          counts.water > 0 ? `${counts.water} watering ${counts.water === 1 ? 'task' : 'tasks'}` : null,
          counts.feed > 0 ? `${counts.feed} feeding ${counts.feed === 1 ? 'task' : 'tasks'}` : null,
        ].filter(Boolean)

        return (
          <Action
            key={day.date}
            ref={isSelected ? selectedRef : null}
            variant="unstyled"
            onClick={() => onSelectDate?.(day.date)}
            aria-pressed={isSelected}
            aria-label={accessibleParts.join(' · ')}
            className={`shrink-0 w-[72px] sm:w-auto snap-center flex flex-col items-center gap-1.5 py-3 px-2 sm:px-1 rounded-md border-[1.5px] transition-all duration-150 ${
              isSelected
                ? 'bg-mint border-leaf text-ink shadow-warm-md scale-[1.04]'
                : 'bg-paper-deep border-paper-edge text-ink hover:bg-mint/40 hover:border-leaf hover:scale-[1.02]'
            }${isToday ? ' ring-1 ring-emerald/40' : ''}`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.08em] ${
                isToday || isSelected ? 'text-emerald' : 'text-ink-softer'
              }`}
            >
              {isToday ? 'Today' : DAY_FORMATTER.format(date)}
            </span>
            <span className="font-display italic font-medium text-2xl leading-none text-ink">
              {DATE_FORMATTER.format(date)}
            </span>

            <WeatherIcon scheme={day.scheme} iconName={day.icon_name} size={28} />

            <span className="flex items-center gap-1 min-h-[10px]" aria-hidden="true">
              {counts.water > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold">
                  <span className={`w-1.5 h-1.5 rounded-full ${DOT_FILL.water}`} />
                  {counts.water}
                </span>
              ) : null}
              {counts.feed > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold">
                  <span className={`w-1.5 h-1.5 rounded-full ${DOT_FILL.feed}`} />
                  {counts.feed}
                </span>
              ) : null}
            </span>
          </Action>
        )
      })}
    </div>
  )
}
